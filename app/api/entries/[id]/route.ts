import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const entryId = params.id

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate entry ID
    if (!entryId) {
      return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 })
    }

    // Fetch the entry
    const { data: entry, error } = await supabase
      .from('entries')
      .select('*')
      .eq('id', entryId)
      .eq('user_id', user.id) // Ensure the user owns the entry
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // PostgREST error for 'No rows found'
        return NextResponse.json({ error: 'Entry not found or unauthorized' }, { status: 404 })
      }
      throw error
    }

    if (!entry) {
        return NextResponse.json({ error: 'Entry not found or unauthorized' }, { status: 404 })
    }

    return NextResponse.json(entry)

  } catch (error: any) {
    console.error('Error fetching entry by ID:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
} 