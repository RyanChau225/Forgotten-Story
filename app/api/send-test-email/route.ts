import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Simple HTML escaping function
function escapeHtml(unsafe: string | undefined | null): string {
  if (unsafe === undefined || unsafe === null) return '';
  return unsafe
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;")
       .replace(/'/g, "&#039;");
}

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get the authenticated user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) throw sessionError
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const userEmail = session.user.email

    if (!userEmail) {
      // Handle cases where user email might not be available in the session
      // This might happen with phone auth or if email is not verified/set
      return NextResponse.json({ error: 'User email not found' }, { status: 400 })
    }

    // Get a random entry
    const { data: entries, error: entriesError } = await supabase
      .from('entries')
      .select('id, title, content, date')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (entriesError) throw entriesError

    if (!entries || entries.length === 0) {
      return NextResponse.json(
        { error: 'No entries found' },
        { status: 404 }
      )
    }

    // Select a random entry
    const randomEntry = entries[Math.floor(Math.random() * entries.length)]

    // Send email using the Edge Function
    const { error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: userEmail, // Use the email from the session
        subject: "Your Random Journal Entry",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">${escapeHtml(randomEntry.title)}</h1>
            <p style="color: #666; white-space: pre-wrap;">${escapeHtml(randomEntry.content)}</p>
            <p style="color: #999;">Written on: ${escapeHtml(new Date(randomEntry.date).toLocaleDateString())}</p>
            <hr style="border: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #999; font-size: 0.9em;">
              This is a test email from your journal. You can manage your email preferences in your 
              <a href="${escapeHtml(process.env.NEXT_PUBLIC_SITE_URL)}/notifications" style="color: #f59e0b;">notification settings</a>.
            </p>
          </div>
        `
      }
    })

    if (emailError) throw emailError

    // Update last_sent timestamp
    const { error: updateError } = await supabase
      .from('email_subscriptions')
      .update({ last_sent: new Date().toISOString() })
      .eq('user_id', userId)

    // Allow upsert if the subscription doesn't exist yet
    if (updateError && updateError.code === 'PGRST116') { // PGRST116: No rows found
      const { error: insertError } = await supabase
        .from('email_subscriptions')
        .insert({ 
          user_id: userId, 
          last_sent: new Date().toISOString(),
          // Default values for frequency and is_active will be set by the table
        })
      if (insertError) throw insertError // Throw if insert also fails
    } else if (updateError) {
      throw updateError // Throw other update errors
    }

    return NextResponse.json({ message: 'Test email sent successfully' })
  } catch (error) {
    console.error('Error sending test email:', error)
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    )
  }
} 