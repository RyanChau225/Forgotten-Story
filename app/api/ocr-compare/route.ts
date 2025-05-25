import { NextResponse } from 'next/server';

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
    const { imageData, mimeType } = await request.json();

    if (!imageData || !mimeType) {
      return NextResponse.json({ error: 'Missing imageData or mimeType' }, { status: 400 });
    }

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
    return NextResponse.json({ error: error.message || 'Failed to process OCR comparison' }, { status: 500 });
  }
} 