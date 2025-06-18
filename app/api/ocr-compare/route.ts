import { NextResponse } from 'next/server';
import { z } from 'zod';

// Define Zod schema for OCR comparison input
const OcrCompareSchema = z.object({
  imageData: z.string()
    .min(1, "imageData is required")
    // Basic check for base64-like pattern, can be made more robust if needed
    // This regex checks if it starts with data:image/[mime];base64, or just contains base64 characters
    // .regex(/^(data:image\/(jpeg|png|webp);base64,)?([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/, "Invalid image data format") 
    // A more practical validation might be on the decoded size, which is harder to do directly in Zod without a refine + external library for base64 decoding & length check.
    // For now, we'll rely on downstream services to fully validate image integrity but add a reasonable length limit.
    .max(15 * 1024 * 1024, "Image data too large (max 15MB approx)"), // Approx 15MB for base64 string, actual image ~10MB
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"], {
    errorMap: () => ({ message: "Invalid or unsupported mimeType. Supported: image/jpeg, image/png, image/webp, application/pdf" })
  }),
});

// Ensure environment variables are loaded
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL or Anon Key is not defined in environment variables.");
  // We'll let the function proceed but log this, as it might be an issue during runtime if these are truly needed for client-side calls
  // For server-to-server calls to Supabase functions, they are definitely needed.
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    // Validate with Zod
    const validationResult = OcrCompareSchema.safeParse(payload);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { imageData, mimeType } = validationResult.data;

    const geminiFnUrl = `${supabaseUrl}/functions/v1/gemini-ocr`;

    // Call AWS Textract (via your existing internal API) and Gemini OCR in parallel
    const [textractResult, geminiResult] = await Promise.allSettled([
      fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/extract-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData }), // Assuming your Textract API expects { image: base64Data }
      }).then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: `Textract API request failed with status ${res.status}` }));
          throw new Error(errorData.error || `Textract API request failed with status ${res.status}`);
        }
        return res.json();
      }),
      fetch(geminiFnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ imageData, mimeType }),
      }).then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: `Gemini OCR function request failed with status ${res.status}` }));
          throw new Error(errorData.error || `Gemini OCR function request failed with status ${res.status}`);
        }
        return res.json();
      })
    ]);

    return NextResponse.json({
      textract: textractResult.status === 'fulfilled' ? textractResult.value : { error: textractResult.reason.message },
      gemini: geminiResult.status === 'fulfilled' ? geminiResult.value : { error: geminiResult.reason.message },
    });

  } catch (error: any) {
    console.error('Error in ocr-compare route:', error);
    // Check if it's a Zod validation error that somehow wasn't caught by safeParse 
    // (should not happen with current logic but good for defense in depth if parsing was outside safeParse)
    if (error instanceof z.ZodError) { 
      return NextResponse.json(
        { error: 'Invalid input', details: error.flatten() },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message || 'Failed to process OCR comparison' }, { status: 500 });
  }
} 