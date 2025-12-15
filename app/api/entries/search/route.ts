import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic' // <--- Add this line

// Define Zod schema for search parameters
const SearchParamsSchema = z.object({
  query: z.string().optional().default(''),
  startDate: z.string().datetime({ message: "Invalid startDate format, expected ISO 8601" }).optional(),
  endDate: z.string().datetime({ message: "Invalid endDate format, expected ISO 8601" }).optional(),
  minMood: z.coerce.number().int().min(1).max(10).optional(), // coerce will attempt to convert string to number
  maxMood: z.coerce.number().int().min(1).max(10).optional(),
  // Validate hashtags: must be a string that is valid JSON, parsing to an array of strings.
  hashtags: z.string().optional().transform((val, ctx) => {
    if (val === undefined || val === null || val.trim() === '') return undefined;
    try {
      const parsed = JSON.parse(val);
      if (!Array.isArray(parsed)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Hashtags parameter must be a JSON array." });
        return z.NEVER;
      }
      // Further validate that each item in the array is a string and meets criteria (e.g., max length)
      const stringArraySchema = z.array(z.string().max(50, "Hashtag too long"));
      const validation = stringArraySchema.safeParse(parsed);
      if (!validation.success) {
        validation.error.issues.forEach(issue => ctx.addIssue(issue));
        return z.NEVER;
      }
      return validation.data;
    } catch (e) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid JSON string for hashtags." });
      return z.NEVER;
    }
  }).pipe(z.array(z.string().max(50)).optional()) // Final pipe to ensure the type is array of strings or undefined
});

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const rawSearchParams = Object.fromEntries(new URL(request.url).searchParams.entries());

    // Validate search parameters with Zod
    const validationResult = SearchParamsSchema.safeParse(rawSearchParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid search parameters', details: validationResult.error.flatten() }, 
        { status: 400 }
      );
    }
    
    const { 
      query, 
      startDate, 
      endDate, 
      minMood, 
      maxMood, 
      hashtags 
    } = validationResult.data;

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Build the query
    let dbQuery = supabase
      .from('entries')
      .select('*')
      .eq('user_id', user.id)

    // Apply text search if query exists and is not empty
    if (query.trim()) {
      dbQuery = dbQuery.or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    }

    // Apply date filters if they exist
    if (startDate) {
      dbQuery = dbQuery.gte('date', startDate)
    }
    if (endDate) {
      // Adjust endDate to be exclusive of the next day for correct range
      const endDateObj = new Date(endDate)
      endDateObj.setDate(endDateObj.getDate() + 1)
      const exclusiveEndDate = endDateObj.toISOString().split('T')[0] // Format as YYYY-MM-DD
      dbQuery = dbQuery.lt('date', exclusiveEndDate)
    }

    // Apply mood filters if they exist
    if (minMood !== undefined) {
      dbQuery = dbQuery.gte('mood', minMood)
    }
    if (maxMood !== undefined) {
      dbQuery = dbQuery.lte('mood', maxMood)
    }

    // Apply hashtag filter if it exists
    if (hashtags && hashtags.length > 0) {
      dbQuery = dbQuery.contains('hashtags', hashtags)
    }

    // Always order by date descending for consistency
    dbQuery = dbQuery.order('created_at', { ascending: false })

    // Execute the query
    const { data: entries, error } = await dbQuery

    if (error) throw error

    return NextResponse.json({
      entries: entries || [],
      total: entries?.length || 0
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
} 