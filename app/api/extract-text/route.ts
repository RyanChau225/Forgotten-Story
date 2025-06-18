import { NextResponse } from 'next/server'
import { z } from 'zod'

// Define Zod schema for extract-text input
const ExtractTextSchema = z.object({
  image: z.string()
    .min(1, "image data is required")
    .max(15 * 1024 * 1024, "Image data too large (max 15MB approx)"), // Approx 15MB for base64 string
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"], {
    errorMap: () => ({ message: "Invalid or unsupported mimeType. Supported: image/jpeg, image/png, image/webp, application/pdf" })
  }),
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL or Anon Key is not defined in environment variables for /api/extract-text route.");
  // This is a critical error for this function, so we might want to throw or handle it more gracefully
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    // Validate with Zod
    const validationResult = ExtractTextSchema.safeParse(payload);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { image, mimeType } = validationResult.data;

    if (!mimeType) {
      // Attempt to infer mimeType if not provided, default to jpeg for robustness
      // This is a fallback, ideally the client should send it.
      console.warn("/api/extract-text: mimeType not provided, attempting to infer. Please update client to send mimeType.");
      const inferredMimeType = image.startsWith('data:image/png') ? 'image/png' :
                             image.startsWith('data:image/jpeg') ? 'image/jpeg' :
                             image.startsWith('data:image/webp') ? 'image/webp' :
                             image.startsWith('data:image/gif') ? 'image/gif' : 'image/jpeg'; // Default fallback
      
      // The gemini-ocr function expects raw base64, so if data URI prefix is present, remove it.
      const base64Data = image.includes(',') ? image.split(',')[1] : image;

      return callGeminiOcr(base64Data, inferredMimeType);
    }

    // If mimeType is provided, assume `image` is already raw base64 data as expected by gemini-ocr
    const base64Data = image.includes(',') ? image.split(',')[1] : image;

    return callGeminiOcr(base64Data, mimeType);

  } catch (error: any) {
    console.error('Error in /api/extract-text route:', error);
    if (error instanceof z.ZodError) { 
      return NextResponse.json(
        { error: 'Invalid input', details: error.flatten() },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message || 'Failed to process image via Gemini OCR' }, { status: 500 });
  }
}

async function callGeminiOcr(imageData: string, mimeType: string) {
  const geminiFnUrl = `${supabaseUrl}/functions/v1/gemini-ocr`;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Server configuration error: Supabase credentials missing.' }, { status: 500 });
  }
  
  const response = await fetch(geminiFnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({ imageData, mimeType }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `Gemini OCR function request failed with status ${response.status}` }));
    console.error('Gemini OCR function error:', errorData);
    return NextResponse.json({ error: errorData.error || `Gemini OCR function request failed with status ${response.status}` }, { status: response.status });
  }

  const result = await response.json();
  return NextResponse.json({ text: result.text }); // Return in the same format Textract route did
} 