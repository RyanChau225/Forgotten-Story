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
const DEFAULT_OCR_MODEL_NAME = "gemini-3-flash-preview";
const MODEL_NAME = Deno.env.get("GEMINI_OCR_MODEL") ?? DEFAULT_OCR_MODEL_NAME;

/**
 * Max output tokens for OCR.
 *
 * Large handwritten pages can exceed smaller caps; keep this configurable so you
 * can control cost/latency without code changes.
 */
const DEFAULT_MAX_OUTPUT_TOKENS = 20000;
const MAX_OUTPUT_TOKENS = (() => {
  const raw = Deno.env.get("GEMINI_OCR_MAX_OUTPUT_TOKENS");
  if (!raw) return DEFAULT_MAX_OUTPUT_TOKENS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MAX_OUTPUT_TOKENS;
  return Math.floor(parsed);
})();

interface RequestPayload {
  imageData: string; // Expecting base64 encoded image data (without the data:image/...;base64, prefix)
  mimeType: string; // e.g., "image/png" or "image/jpeg"
}

function buildOcrPrompt(mode: "primary" | "retry"): string {
  if (mode === "retry") {
    return [
      "You are doing OCR transcription.",
      "Extract ALL text from this image (including handwriting).",
      "Do NOT summarize. Do NOT omit lines. Do NOT add commentary.",
      "Preserve line breaks as they appear on the page.",
      "If a word is unclear, make your best guess and keep going.",
      "Return ONLY the extracted text.",
    ].join("\n");
  }

  return [
    "Extract all text from this image, including handwriting.",
    "Be as accurate as possible.",
    "Preserve line breaks if they are clearly distinct lines of text.",
    "Do not add any commentary or explanation beyond the extracted text itself.",
  ].join(" ");
}

function getFinishReasonText(response: unknown): string | undefined {
  // The @google/generative-ai response shape includes candidates with finishReason,
  // but we keep this defensive to avoid runtime crashes if the SDK changes.
  try {
    const r = response as { candidates?: Array<{ finishReason?: unknown }> };
    const reason = r?.candidates?.[0]?.finishReason;
    return typeof reason === "string" ? reason : undefined;
  } catch {
    return undefined;
  }
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

    console.log(`gemini-ocr request: mimeType=${mimeType} bytes(base64)=${imageData.length}`);

    const safetySettings = [
      // OCR for personal journals can include mild profanity/mental health terms/etc.
      // "medium" thresholds can cause partial generations; keep only high-risk blocks.
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    ];

    const generationConfig = {
      temperature: 0.3, // Lower temperature for more factual/deterministic output for OCR
      topK: 1,
      topP: 1,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    };

    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      safetySettings,
      generationConfig,
    });

    const runOnce = async (mode: "primary" | "retry") => {
      const parts = [
        { text: buildOcrPrompt(mode) },
        {
          inlineData: {
            mimeType,
            data: imageData,
          },
        },
      ];

      const result = await model.generateContent({ contents: [{ role: "user", parts }] });
      const response = result.response;
      const text = response.text();
      const finishReason = getFinishReasonText(response);
      return { text, finishReason };
    };

    const first = await runOnce("primary");
    let text = first.text;

    // Heuristic retry:
    // If Gemini returns a very short transcription, it often means it "gave up" early.
    // A stronger, OCR-specific prompt frequently improves completeness.
    if ((text?.trim()?.length ?? 0) < 250) {
      console.log(`gemini-ocr: short result (${text?.trim()?.length ?? 0} chars), retrying with stronger prompt`);
      const second = await runOnce("retry");
      if ((second.text?.trim()?.length ?? 0) > (text?.trim()?.length ?? 0)) {
        text = second.text;
      }
      console.log(`gemini-ocr finishReason first=${first.finishReason ?? "unknown"} second=${second.finishReason ?? "unknown"}`);
    } else {
      console.log(`gemini-ocr finishReason=${first.finishReason ?? "unknown"}`);
    }

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