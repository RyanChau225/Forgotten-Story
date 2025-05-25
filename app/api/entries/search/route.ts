import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(request.url)
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get search parameters
    const query = searchParams.get('query') || ''
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const minMood = searchParams.get('minMood')
    const maxMood = searchParams.get('maxMood')
    const hashtags = searchParams.get('hashtags') ? JSON.parse(searchParams.get('hashtags')!) : null

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
    if (minMood !== null) {
      dbQuery = dbQuery.gte('mood', parseInt(minMood))
    }
    if (maxMood !== null) {
      dbQuery = dbQuery.lte('mood', parseInt(maxMood))
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