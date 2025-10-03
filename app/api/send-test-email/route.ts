import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Type definitions
type Entry = {
  id: string
  title: string
  content: string
  date: string
  mood?: number
  ai_summary?: string
  positive_affirmation?: string | any[]
  image_urls?: string[]
}

/**
 * Build email subject line with random hook
 */
function buildEmailSubject(entryTitle: string): string {
  const hooks = [
    "Remember when",
    "Looking back at",
    "Revisiting",
    "A moment from your journey",
    "Reflecting on",
    "From your journal",
    "A memory worth revisiting",
    "Unlock a Hidden Memory",
    "A Glimpse From Your Past Awaits",
    "Remember This Moment?",
    "Journey Back to a Day in Your Life",
    "Your Story Continues: A Look Back",
    "From the Pages of Your Past",
    "A Whisper from Your Journal",
    "Revisit a Chapter of Your Life",
    "A Moment Frozen in Time, Just For You",
    "Rediscover a Piece of Your Story",
    "A Moment from Your Archives",
    "Step Back in Time With Forgotten Story",
    "Your Personal Time Capsule Has a Message",
    "Echoes from Your Journal",
    "Once Upon a Time, You Wrote",
    "A Page from Your Life's Book",
    "Uncover a Past Reflection",
    "Travel Back to This Day",
    "Your Memories are Calling",
    "A Flashback from Your Forgotten Story",
    "Revisit Your Thoughts and Feelings",
    "Another Chapter from Your Journey",
    "A Little Reminder from Your Past Self",
    "Let's See What You Were Up To",
    "The Story of You Continues to Unfold",
    "A Snapshot of Your Past Experience",
    "Dive Back Into a Memory",
    "What Was on Your Mind This Day?",
    "Your Journal Has Something to Share",
    "A Cherished Moment, Revisited"
  ]
  
  const hook = hooks[Math.floor(Math.random() * hooks.length)]
  return `${hook}: ${entryTitle}`
}

/**
 * Build email HTML template (matches send-reminder-emails format)
 */
function buildEmailHtml(
  entry: Entry, 
  aiSummary: string | undefined, 
  affirmations: Array<{ text: string; based_on?: string }>
): string {
  // Mood mapping
  const moodMap: {[key: number]: { emoji: string, description: string }} = {
    1: { emoji: "😭", description: "Overwhelmed" },
    2: { emoji: "😢", description: "Very Sad" },
    3: { emoji: "😔", description: "Sad" },
    4: { emoji: "🙁", description: "Slightly Down" },
    5: { emoji: "😐", description: "Neutral" },
    6: { emoji: "🙂", description: "Okay" },
    7: { emoji: "😊", description: "Happy" },
    8: { emoji: "😄", description: "Very Happy" },
    9: { emoji: "🥳", description: "Ecstatic" },
    10: { emoji: "🤩", description: "Blissful" }
  }
  
  const currentMood = entry.mood && moodMap[entry.mood] 
    ? moodMap[entry.mood] 
    : { emoji: "❓", description: "Unknown" }

  // Build mood HTML
  let moodHtml = ""
  if (entry.mood) {
    moodHtml = `
      <div style="margin-bottom: 15px; padding: 10px; background-color: #f0f0f0; border-radius: 4px; text-align: center;">
        <span style="font-size: 24px; margin-right: 8px;">${currentMood.emoji}</span>
        <span style="color: #555; font-weight: bold;">Mood: ${currentMood.description}</span>
      </div>`
  }

  // Build affirmations HTML
  let affirmationsHtml = ""
  if (affirmations.length > 0) {
    affirmationsHtml = `
      <h3 style="color: #444; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">✨ Positive Affirmations</h3>
      <ul style="list-style-type: none; padding-left: 0; color: #555;">`
    
    affirmations.forEach(aff => {
      affirmationsHtml += `
        <li style="margin-bottom: 10px; background-color: #f0f0f0; padding: 8px; border-radius: 3px;">
          <p style="margin: 0 0 3px 0; font-weight: bold;">${aff.text}</p>
          ${aff.based_on && aff.based_on !== "N/A" 
            ? `<p style="margin: 0; font-size: 0.85em; color: #777; font-style: italic;">Based on: "${aff.based_on}"</p>` 
            : ""}
        </li>`
    })
    
    affirmationsHtml += `</ul>`
  } else if (aiSummary && aiSummary !== "Could not generate summary." && aiSummary !== "Summary could not be generated.") {
    affirmationsHtml = `<p style="color: #666; font-size: 0.9em; margin-top: 15px;">Affirmations could not be generated for this entry. Try adding more detail next time!</p>`
  }

  // Build images HTML
  let imagesHtml = ""
  if (entry.image_urls && entry.image_urls.length > 0) {
    imagesHtml = `
      <h3 style="color: #444; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">🖼️ Images</h3>
      <div style="display: flex; flex-wrap: wrap; gap: 10px;">`
    
    entry.image_urls.forEach(url => {
      imagesHtml += `
        <div style="width: 150px; height: 150px; overflow: hidden; border-radius: 4px; border: 1px solid #ddd;">
          <img src="${url}" alt="Entry Image" style="width: 100%; height: 100%; object-fit: cover;" />
        </div>`
    })
    
    imagesHtml += `</div>`
  }

  // Build complete email
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 5px;">
      <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px;">🏷️ Title: ${entry.title}</h2>
      
      ${moodHtml}
      
      ${aiSummary && aiSummary !== "Summary could not be generated." && aiSummary !== "Could not generate summary." ? `
        <div style="margin-bottom: 20px; padding: 15px; background-color: #f5f5f5; border-radius: 4px; border-left: 4px solid #f59e0b;">
          <h3 style="color: #444; margin-top: 0; margin-bottom: 10px;">🤖 A.I. Summary:</h3>
          <p style="color: #555; margin: 0; line-height: 1.6;">${aiSummary}</p>
        </div>
      ` : ''}
      
      ${affirmationsHtml}

      <h3 style="color: #444; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">📖 Your Journal Entry</h3>
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
        <p style="color: #555; white-space: pre-wrap; line-height: 1.6;">${entry.content}</p>
        <p style="color: #888; font-size: 0.9em; margin-top: 15px;">Written on: ${new Date(entry.date).toLocaleDateString()}</p>
      </div>

      ${imagesHtml}

      <a 
        href="${process.env.NEXT_PUBLIC_SITE_URL}/search?query=${encodeURIComponent(entry.title)}&entry=${entry.id}" 
        style="display: inline-block; padding: 10px 15px; background-color: #f59e0b; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px;"
      >
        View Full Entry
      </a>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;" />
      <p style="color: #999; font-size: 0.9em;">
        Manage your notification preferences in your 
        <a href="${process.env.NEXT_PUBLIC_SITE_URL}/notifications" style="color: #f59e0b;">notification settings</a>.
      </p>
      <p style="color: #999; font-size: 0.85em; font-style: italic; margin-top: 10px;">
        🧪 This is a TEST email - your scheduled email reminders are not affected.
      </p>
    </div>
  `
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
      return NextResponse.json({ error: 'User email not found' }, { status: 400 })
    }

    // Get a random entry with ALL fields needed for rich email
    const { data: entries, error: entriesError } = await supabase
      .from('entries')
      .select('id, title, content, date, mood, ai_summary, positive_affirmation, image_urls')
      .eq('user_id', userId)
      .limit(100)

    if (entriesError) throw entriesError

    if (!entries || entries.length === 0) {
      return NextResponse.json(
        { error: 'No entries found' },
        { status: 404 }
      )
    }

    // Select a random entry
    const randomEntry = entries[Math.floor(Math.random() * entries.length)] as Entry

    // Parse affirmations
    let affirmationsForEmail: Array<{ text: string; based_on?: string }> = []
    
    if (randomEntry.positive_affirmation) {
      if (typeof randomEntry.positive_affirmation === 'string') {
        try {
          const parsed = JSON.parse(randomEntry.positive_affirmation)
          if (Array.isArray(parsed)) {
            affirmationsForEmail = parsed.filter(
              (item: any) => typeof item === 'object' && item !== null && 'text' in item
            )
          }
        } catch (e) {
          // Keep affirmationsForEmail empty
        }
      } else if (Array.isArray(randomEntry.positive_affirmation)) {
        affirmationsForEmail = randomEntry.positive_affirmation.filter(
          (item: any) => typeof item === 'object' && item !== null && 'text' in item
        )
      }
    }

    // Generate AI content if missing (optional - can be skipped for faster testing)
    let aiSummary = randomEntry.ai_summary

    if (!aiSummary) {
      try {
        const { data: aiData, error: aiError } = await supabase.functions.invoke('generate-ai-content', {
          body: { entryContent: randomEntry.content }
        })

        if (!aiError && aiData) {
          aiSummary = aiData.summary
          
          if (aiData.affirmations && Array.isArray(aiData.affirmations)) {
            affirmationsForEmail = aiData.affirmations.filter(
              (item: any) => typeof item === 'object' && item !== null && 'text' in item
            )
          }
        }
      } catch (e) {
        console.log('Could not generate AI content for test email:', e)
      }
    }

    // Build email with rich format
    const emailHtml = buildEmailHtml(randomEntry, aiSummary, affirmationsForEmail)
    const emailSubject = buildEmailSubject(randomEntry.title)

    // Send email using the Edge Function
    const { error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: userEmail,
        subject: emailSubject,
        html: emailHtml
      }
    })

    if (emailError) throw emailError

    // ✅ NO last_sent update - allows unlimited testing without affecting cron schedule!

    return NextResponse.json({ 
      message: 'Test email sent successfully',
      entry: {
        id: randomEntry.id,
        title: randomEntry.title
      }
    })
  } catch (error) {
    console.error('Error sending test email:', error)
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    )
  }
} 