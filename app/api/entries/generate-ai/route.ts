import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const GENERATE_AI_CONTENT_FUNCTION_URL = process.env.GENERATE_AI_CONTENT_FUNCTION_URL!; // URL for the AI function

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entryId } = await req.json();

    if (!entryId) {
      return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 });
    }

    // Fetch the entry content from the database
    const { data: entry, error: fetchError } = await supabase
      .from('entries')
      .select('id, content, ai_summary, positive_affirmation')
      .eq('id', entryId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !entry) {
      console.error('Error fetching entry for AI generation:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch entry' }, { status: 500 });
    }

    // Check if AI content already exists
    if (entry.ai_summary && entry.positive_affirmation) {
      console.log(`AI content already exists for entry ${entryId}. Returning existing.`);
      return NextResponse.json({
        summary: entry.ai_summary,
        affirmation: entry.positive_affirmation,
      });
    }

    // Call the generate-ai-content Edge Function
    const aiResponse = await fetch(GENERATE_AI_CONTENT_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Pass the user's auth header to the AI function if needed for RLS
        Authorization: req.headers.get('Authorization')!,
      },
      body: JSON.stringify({ entryContent: entry.content }),
    });

    if (!aiResponse.ok) {
      const errorBody = await aiResponse.text();
      throw new Error(`AI function error: ${aiResponse.status} - ${errorBody}`);
    }

    const aiResult = await aiResponse.json();
    const summary = aiResult.summary;
    const affirmation = aiResult.affirmation;

    // Update the entry in the database with the generated AI content
    const { error: updateError } = await supabase
      .from('entries')
      .update({ ai_summary: summary, positive_affirmation: affirmation })
      .eq('id', entryId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating entry with AI content:', updateError);
      // Decide how to handle this error - maybe still return generated content
    }

    return NextResponse.json({ summary, affirmation });

  } catch (error: unknown) {
    console.error('Error in generate-ai API route:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}