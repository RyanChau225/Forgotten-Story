import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// GET all entries for the authenticated user
export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get entries with pagination
    const { data: entries, error, count } = await supabase
      .from('entries')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

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
    const json = await request.json()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate required fields
    if (!json.title || !json.content || json.mood === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create entry
    const { data, error } = await supabase
      .from('entries')
      .insert([
        {
          user_id: user.id,
          title: json.title,
          content: json.content,
          mood: json.mood,
          date: json.date || new Date().toISOString(),
          is_private: json.is_private ?? true,
          weather: json.weather,
          location: json.location,
          hashtags: json.hashtags || [],
          image_urls: json.image_urls || []
        }
      ])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
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
    const json = await request.json()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate entry ID
    if (!json.id) {
      return NextResponse.json(
        { error: 'Entry ID is required' },
        { status: 400 }
      )
    }

    // Update entry
    const { data, error } = await supabase
      .from('entries')
      .update({
        title: json.title,
        content: json.content,
        mood: json.mood,
        date: json.date,
        is_private: json.is_private,
        weather: json.weather,
        location: json.location,
        hashtags: json.hashtags,
        image_urls: json.image_urls,
        updated_at: new Date().toISOString()
      })
      .eq('id', json.id)
      .eq('user_id', user.id) // Ensure user owns the entry
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
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