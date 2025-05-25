import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// Remove the shared import: import { corsHeaders } from "../_shared/cors.ts"; 
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "https://esm.sh/@google/generative-ai";

// Directly include CORS headers here
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// IMPORTANT: You'll need to set up your AI provider's client and API key
// For example, if using OpenAI:
// import OpenAI from "https://esm.sh/openai@4.20.0"; // Or your preferred version
// const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });

// Example: If using Google Gemini (as you had before), you might have:
// import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
// const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!);
// const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

interface RequestPayload {
  entryContent: string;
}

// Get the API key from environment variables
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

// Define the model name as a constant
const MODEL_NAME = "gemini-2.5-flash-preview-05-20"; // Updated model

if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY environment variable not set.");
  // Optional: throw an error or handle it to prevent the function from running without an API key
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const model = genAI ? genAI.getGenerativeModel({ 
  model: MODEL_NAME
}) : null;

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!model || !GEMINI_API_KEY) {
    console.error("Gemini AI model or API key is not initialized.");
    return new Response(
      JSON.stringify({ error: "AI service is not configured." }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }

  try {
    const { entryContent }: RequestPayload = await req.json();

    if (!entryContent) {
      return new Response(
        JSON.stringify({ error: "entryContent is required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("Received content for AI processing (first 100 chars):", entryContent.substring(0, 100) + "...");

    // Manually Corrected Prompt for new summary and affirmation format
    const promptWithContext = `Given the following journal entry, please perform two tasks:

1.  **Generate a "title_summary"**: This should be a single, creative, story-like title that captures the essence or vibe of the day described in the journal entry. It should be a maximum of 15 words. Examples of good title_summaries include:
    *   "A Day of Driven Work, Interwoven with Moments of Peace"
    *   "Between Project Push and Personal Recharge: A Day's Account"
    *   "Navigating Ambition with Self-Kindness: A Journal Entry"
    *   "From Deep Work to Down Time: A Day's Rhythm"
    *   "The Balance of Building and Being: A Daily Log"
    *   "Where Project Goals Met Personal Practice: A Day in Review"
    *   "The Energy and Ease of a Productive Day"
    *   "Finding Enjoyment in the Effort: A Day's Reflection"
    *   "A Chapter of Focus, Flow, and Feeling Good"

2.  **Generate an "affirmations_list"**: This should be an array of JSON objects. Each object in the array represents a positive affirmation inspired by the journal entry and MUST have two keys:
    *   "text": The positive affirmation itself (max 20 words).
    *   "based_on": A short quote or a summary of the part(s) of the journal entry that inspired this affirmation.
    Examples of how each object in the affirmations_list should be structured:
    {
      "text": "I am a powerful worker, capable of achieving big things.",
      "based_on": "Did massive work today on the project"
    },
    {
      "text": "I am taking good care of myself and honoring my body's needs.",
      "based_on": "Been bathing 2x's a day. Man chill. and took a nap at 3pm when I wasn't feeling it."
    },
    {
      "text": "I am excited and motivated to work on my project.",
      "based_on": "Yes wish I did more Project work. I don't mind it actually want to. Bothing is fun work OUI."
    }

Return ONLY a single JSON object as your entire response. This JSON object must have exactly two top-level keys: "title_summary" (a string) and "affirmations_list" (an array of objects as described above). Do not include any other text, explanations, or markdown formatting outside of this single JSON object.

Journal Entry:
---
${entryContent}
---

JSON Output:`;

    console.log("Sending to Gemini - Full Prompt (first 500 chars):", promptWithContext.substring(0, 500));

    const result = await model.generateContent(promptWithContext);
    const response = result.response;

    console.log("Full Gemini API response object:", JSON.stringify(response, null, 2));
    if (!response) {
      console.error("No response object from Gemini API after generateContent call.");
      throw new Error("No response object received from AI generation service.");
    }

    let text = "";
    try {
      text = response.text();
    } catch (e: any) {
      console.error("Error calling response.text():", e);
      console.error("Full Gemini response object (on .text() error):", JSON.stringify(response, null, 2));
      throw new Error("Failed to extract text from AI response.");
    }
    console.log("Raw text received from Gemini API:", text);
    if (!text || text.trim() === "") {
      console.error("Empty text response received from Gemini API. Full response object was:", JSON.stringify(response, null, 2));
      throw new Error("Received empty text response from AI generation service. Check Gemini API key, model access, or potential content filtering by the API.");
    }

    let cleanedText = text.trim();
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.substring(7);
      if (cleanedText.endsWith("```")) {
        cleanedText = cleanedText.substring(0, cleanedText.length - 3);
      }
    } else if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.substring(3);
        if (cleanedText.endsWith("```")) {
            cleanedText = cleanedText.substring(0, cleanedText.length - 3);
        }
    }
    cleanedText = cleanedText.trim();
    console.log("Cleaned text before JSON.parse:", cleanedText);

    let generatedContent;
    try {
      generatedContent = JSON.parse(cleanedText);
    } catch (e: any) {
      console.error("Failed to parse cleaned text as JSON. Cleaned text was:", cleanedText, "Original text was:", text, "Error:", e);
      throw new Error(`Failed to parse AI response as JSON: ${e.message}`);
    }

    const title_summary = generatedContent.title_summary || "Could not generate summary.";
    const affirmations_list = Array.isArray(generatedContent.affirmations_list)
      ? generatedContent.affirmations_list
      : [{ text: "Could not generate affirmations.", based_on: "N/A" }];

    console.log("Final AI Insight:", { title_summary, affirmations_list });

    return new Response(
      JSON.stringify({ 
        summary: title_summary, 
        affirmations: affirmations_list 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in generate-ai-content function:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to process request";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/generate-ai-content' \
    --header 'Authorization: Bearer [YOUR_SUPABASE_ANON_KEY]' \
    --header 'Content-Type: application/json' \
    --data '{"entryContent":"Your journal entry content here."}'

*/
