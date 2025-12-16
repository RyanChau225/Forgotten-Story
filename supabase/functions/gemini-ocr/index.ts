import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "https://esm.sh/@google/generative-ai";

// Directly include CORS headers here
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

/**
 * OCR model selection.
 *
 * Why env var?
 * - Preview models are frequently renamed/removed.
 * - Making this configurable lets you switch models without code changes.
 *
 * Recommended default (your choice): gemini-2.5-pro
 */
const DEFAULT_OCR_MODEL_NAME = "gemini-2.5-pro";
const MODEL_NAME = Deno.env.get("GEMINI_OCR_MODEL") ?? DEFAULT_OCR_MODEL_NAME;

interface RequestPayload {
  imageData: string; // Expecting base64 encoded image data (without the data:image/...;base64, prefix)
  mimeType: string; // e.g., "image/png" or "image/jpeg"
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY environment variable not set.");
    return new Response(JSON.stringify({ error: "Server configuration error: GEMINI_API_KEY not set." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

  try {
    const { imageData, mimeType } = await req.json() as RequestPayload;

    if (!imageData || !mimeType) {
      return new Response(JSON.stringify({ error: "Missing imageData or mimeType" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    const generationConfig = {
      temperature: 0.3, // Lower temperature for more factual/deterministic output for OCR
      topK: 1,
      topP: 1,
      maxOutputTokens: 2048, // Adjust as needed for expected text length
    };

    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      safetySettings,
      generationConfig,
    });

    const parts = [
      {
        text: "Extract all text from this image, including handwriting. Be as accurate as possible. Preserve line breaks if they are clearly distinct lines of text. Do not add any commentary or explanation beyond the extracted text itself.",
      },
      {
        inlineData: {
          mimeType: mimeType,
          data: imageData,
        },
      },
    ];

    const result = await model.generateContent({ contents: [{ role: "user", parts }] });
    const response = result.response;
    const text = response.text();

    if (!text || text.trim() === "") {
      return new Response(JSON.stringify({ error: "No text found in image or generation stopped." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400, 
      });
    }

    return new Response(JSON.stringify({ text: text.trim() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error processing image with Gemini:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to extract text using Gemini." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}); 