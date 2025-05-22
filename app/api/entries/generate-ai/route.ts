import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const GENERATE_AI_CONTENT_FUNCTION_URL = process.env.GENERATE_AI_CONTENT_FUNCTION_URL!; // URL for the AI function

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entryId } = await request.json();
    if (!entryId) {
      return NextResponse.json({ error: 'entryId is required' }, { status: 400 });
    }

    // 1. Fetch the specific entry ensuring it belongs to the user
    const { data: entry, error: fetchError } = await supabase
      .from('entries')
      .select('id, content, user_id, ai_summary, positive_affirmation')
      .eq('id', entryId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching entry:', fetchError);
      if (fetchError.code === 'PGRST116') { // Not found
        return NextResponse.json({ error: 'Entry not found or access denied' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch entry' }, { status: 500 });
    }

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found or access denied' }, { status: 404 });
    }

    // If AI content already exists, optionally return it or regenerate
    // For now, we'll proceed to generate/regenerate
    // if (entry.ai_summary && entry.positive_affirmation) {
    //   return NextResponse.json({ 
    //     summary: entry.ai_summary, 
    //     affirmation: entry.positive_affirmation 
    //   });
    // }

    // 2. Invoke the AI generation Supabase Edge Function
    //    Replace 'generate-ai-content' with your actual Edge Function name
    const { data: aiResult, error: functionError } = await supabase.functions.invoke(
      'generate-ai-content', // IMPORTANT: Replace with your Edge Function name
      { 
        body: { entryContent: entry.content }
      }
    );

    if (functionError) {
      console.error('Error invoking AI function:', functionError);
      return NextResponse.json({ error: 'Failed to generate AI insight from function' }, { status: 500 });
    }
    
    if (!aiResult || !aiResult.summary || !Array.isArray(aiResult.affirmations)) {
      console.error('Invalid or incomplete response from AI function:', aiResult);
      return NextResponse.json({ error: 'Invalid or incomplete response from AI generation service.' }, { status: 500 });
    }

    const { summary, affirmations } = aiResult;

    // 3. Update the entry in the database with the new AI content
    const { error: updateError } = await supabase
      .from('entries')
      .update({ 
        ai_summary: summary, 
        positive_affirmation: JSON.stringify(affirmations),
        updated_at: new Date().toISOString() 
      })
      .eq('id', entryId)
      .eq('user_id', user.id); // Ensure user owns the entry

    if (updateError) {
      console.error('Error updating entry with AI content:', updateError);
      return NextResponse.json({ error: 'Failed to save AI insight' }, { status: 500 });
    }

    // 4. Return the AI content
    return NextResponse.json({ summary, affirmations });

  } catch (error: any) {
    console.error('Error in /api/entries/generate-ai:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}