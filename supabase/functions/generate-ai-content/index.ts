import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai"; // Import GenerativeModel type

// Define an interface for AI generation services
interface AIAssistantService {
  generate(content: string): Promise<{ summary: string; affirmation: string }>;
}

// Implementation for Gemini Flash 2.5
class GeminiFlash2_5Service implements AIAssistantService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel; // Use GenerativeModel type

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Using the correct model ID for Flash 2.5
  }

  async generate(content: string): Promise<{ summary: string; affirmation: string }> {
    console.log(`Generating AI content for entry: ${content.substring(0, 100)}...`);

    try {
      // Updated prompt to request JSON output
      const prompt = `Please provide a catchy one-liner summary that entices and hooks the reader, and a concise positive affirmation, based on the following journal entry. Format your response as a JSON object with the keys "summary" and "affirmation".

Journal Entry:
${content}`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      console.log("Raw AI response text:", text);

      // Parsing logic for JSON output
      let summary = "Could not extract summary.";
      let affirmation = "Could not extract affirmation.";

      try {
        const parsedResponse = JSON.parse(text);
        if (parsedResponse.summary && typeof parsedResponse.summary === 'string') {
          summary = parsedResponse.summary;
        }
        if (parsedResponse.affirmation && typeof parsedResponse.affirmation === 'string') {
          affirmation = parsedResponse.affirmation;
        }
      } catch (parseError) {
        console.error("Failed to parse AI response as JSON:", parseError);
        // If JSON parsing fails, you might want to log the raw text
        // or attempt a fallback parsing method if necessary.
      }

      return {
        summary: summary,
        affirmation: affirmation,
      };
    } catch (error: unknown) { // Explicitly type error as unknown
      console.error("Error calling Gemini API:", error);
      // It's safer to check if error is an instance of Error before accessing message
      throw new Error(`Failed to generate content from AI: ${(error as Error).message || error}`);
    }
  }
}

// Function to get the configured AI service
function getAIAssistantService(): AIAssistantService {
  // TODO: Get API key from environment variables securely
  const apiKey = Deno.env.get("GEMINI_API_KEY"); // Example environment variable name

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable not set.");
  }

  // TODO: Add logic here to select different AI services based on configuration
  // For now, we default to Gemini Flash 2.5
  return new GeminiFlash2_5Service(apiKey);
}

Deno.serve(async (req: Request) => { // Added type annotation for req
  try {
    const { entryContent } = await req.json();

    if (!entryContent) {
      return new Response(
        JSON.stringify({ error: "Missing 'entryContent' in request body" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const aiService = getAIAssistantService();
    const result = await aiService.generate(entryContent);

    return new Response(
      JSON.stringify(result),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error: unknown) { // Explicitly type error as unknown
    console.error("Error handling request:", error); // More general error message
    // It's safer to check if error is an instance of Error before accessing message
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Internal Server Error" }), // Return error message from thrown error
      { status: 500, headers: { "Content-Type": "application/json" } },
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
