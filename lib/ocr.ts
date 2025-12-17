import { supabase } from "@/lib/supabase";

export interface ExtractTextInput {
  /**
   * Raw base64 bytes (no `data:image/...;base64,` prefix).
   */
  imageData: string;
  /**
   * Mime type of the uploaded file (e.g. `image/jpeg`).
   */
  mimeType: string;
}

/**
 * Extracts text from an image by calling the Supabase Edge Function `gemini-ocr`.
 *
 * Why call Supabase directly from the browser?
 * - Avoids serverless `/api/extract-text` timeouts (504) for slower OCR.
 * - Keeps OCR as a single hop to Supabase instead of going through your web server first.
 */
export async function extractTextFromImage(input: ExtractTextInput): Promise<string> {
  const { data, error } = await supabase.functions.invoke("gemini-ocr", {
    body: input,
  });

  if (error) {
    throw new Error(error.message || "Gemini OCR request failed");
  }

  if (!data || typeof (data as { text?: unknown }).text !== "string") {
    throw new Error("Gemini OCR returned an unexpected response");
  }

  const text = (data as { text: string }).text.trim();
  if (!text) throw new Error("No text found in image");
  return text;
}


