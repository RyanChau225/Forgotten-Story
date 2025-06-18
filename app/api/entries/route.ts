import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// Define Zod schema for creating an entry
const EntrySchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  content: z.string().min(1, 'Content is required'),
  mood: z.number().min(1).max(10), // Assuming mood is 1-10
  date: z.string().datetime().optional(), // ISO 8601 date string
  is_private: z.boolean().default(true),
  weather: z.string().max(100, 'Weather text too long').optional().nullable(),
  location: z.string().max(255, 'Location text too long').optional().nullable(),
  hashtags: z.array(z.string().max(50, 'Hashtag too long')).default([]),
  image_urls: z.array(z.string().url('Invalid URL format')).default([]),
});

// Define Zod schema for updating an entry (all fields optional except id)
const UpdateEntrySchema = EntrySchema.partial().extend({
  id: z.string().uuid('Invalid ID format'), // or z.string().cuid() if using CUIDs, or z.number().int() for integer IDs
});

// GET all entries for the authenticated user, optionally filtered by date range
export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const offset = (page - 1) * limit
    const startDate = searchParams.get('startDate') // New: For date range
    const endDate = searchParams.get('endDate')     // New: For date range

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Build the query
    let queryBuilder = supabase
      .from('entries')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)

    // Apply date filters if they exist
    if (startDate) {
      queryBuilder = queryBuilder.gte('date', startDate)
    }
    if (endDate) {
      queryBuilder = queryBuilder.lte('date', endDate)
    }

    // Apply ordering and pagination
    queryBuilder = queryBuilder
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    const { data: entries, error, count } = await queryBuilder;

    if (error) throw error

    return NextResponse.json({
      entries,
      total: count,
      page,
      limit,
      hasMore: count ? offset + limit < count : false
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

// POST new entry
export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const jsonPayload = await request.json()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate with Zod
    const validationResult = EntrySchema.safeParse(jsonPayload);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }
    
    const validatedData = validationResult.data;

    // Create entry
    const { data, error } = await supabase
      .from('entries')
      .insert([
        {
          user_id: user.id,
          title: validatedData.title,
          content: validatedData.content,
          mood: validatedData.mood,
          date: validatedData.date || new Date().toISOString(),
          is_private: validatedData.is_private,
          weather: validatedData.weather,
          location: validatedData.location,
          hashtags: validatedData.hashtags,
          image_urls: validatedData.image_urls
        }
      ])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) { // Added type for error
    console.error('Error creating entry:', error) // More specific log
    if (error instanceof z.ZodError) { // Handle Zod errors specifically if not caught by safeParse (shouldn't happen with safeParse)
      return NextResponse.json(
        { error: 'Invalid input', details: error.flatten() },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

// PUT update entry
export async function PUT(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const jsonPayload = await request.json()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate with Zod
    const validationResult = UpdateEntrySchema.safeParse(jsonPayload);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }
    
    const { id, ...updateData } = validationResult.data; // Destructure id and other validated fields

    // Ensure there's something to update besides the id
    if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
            { error: 'No fields to update provided' },
            { status: 400 }
        );
    }

    // Update entry
    const { data, error } = await supabase
      .from('entries')
      .update({
        ...updateData, // Spread validated update data
        updated_at: new Date().toISOString()
      })
      .eq('id', id) // Use validated id
      .eq('user_id', user.id) // Ensure user owns the entry
      .select()
      .single()

    if (error) {
        // Check for specific Supabase errors, e.g., PGRST116 (no rows found for update)
        if (error.code === 'PGRST116') {
            return NextResponse.json({ error: 'Entry not found or you do not have permission to update it' }, { status: 404 });
        }
        throw error;
    }

    return NextResponse.json(data)
  } catch (error: any) { // Added type for error
    console.error('Error updating entry:', error) // More specific log
    if (error instanceof z.ZodError) { // Handle Zod errors specifically
      return NextResponse.json(
        { error: 'Invalid input', details: error.flatten() },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

// DELETE entry
export async function DELETE(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Entry ID is required' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete entry
    const { error } = await supabase
      .from('entries')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user owns the entry

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
} 