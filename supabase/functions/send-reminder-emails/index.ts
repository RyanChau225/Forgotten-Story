import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

// CORS headers (inlined for dashboard deployment)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Retrieve secrets from environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const functionSecret = Deno.env.get("FUNCTION_SECRET")

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Configuration
const BATCH_SIZE = 5 // Process 10 users concurrently

interface EmailSubscription {
  user_id: string
  frequency: string
  last_sent: string | null
}

interface Entry {
  id: string
  title: string
  content: string
  date: string
  mood: number
  ai_summary?: string
  positive_affirmation?: string | Array<{ text: string; based_on?: string }>
  image_urls?: string[]
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  // --- Authorization Check ---
  const url = new URL(req.url)
  const secret = url.searchParams.get("secret")
  if (!functionSecret || secret !== functionSecret) {
    console.warn("Unauthorized access attempt detected to send-reminder-emails.")
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    )
  }

  try {
    const now = new Date()
    
    // ✅ OPTIMIZATION 1: Database-level filtering
    // Calculate cutoff times for each frequency
    // Adding 5-minute buffer to handle timing variance and ensure consistent daily delivery
    const BUFFER_TIME = 5 * 60 * 1000 // 5 minutes in milliseconds
    const cutoffs = {
      '1': new Date(now.getTime() - (1 * 24 * 60 * 60 * 1000) + BUFFER_TIME).toISOString(),
      '3': new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000) + BUFFER_TIME).toISOString(),
      '7': new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000) + BUFFER_TIME).toISOString(),
      '30': new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000) + BUFFER_TIME).toISOString()
    }

    console.log('Fetching eligible subscriptions...')
    
    // Only get users who need emails TODAY (massive performance improvement)
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from("email_subscriptions")
      .select("user_id, frequency, last_sent")
      .eq("is_active", true)
      .or(`last_sent.is.null,and(frequency.eq.1,last_sent.lt.${cutoffs['1']}),and(frequency.eq.3,last_sent.lt.${cutoffs['3']}),and(frequency.eq.7,last_sent.lt.${cutoffs['7']}),and(frequency.eq.30,last_sent.lt.${cutoffs['30']})`)

    if (subscriptionError) throw subscriptionError

    console.log(`Found ${subscriptions.length} eligible users for email reminders`)

    if (subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No users eligible for emails at this time",
          eligible: 0,
          sent: 0,
          failed: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // ✅ OPTIMIZATION 2: Parallel processing in batches
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < subscriptions.length; i += BATCH_SIZE) {
      const batch = subscriptions.slice(i, i + BATCH_SIZE)
      
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(subscriptions.length / BATCH_SIZE)}`)
      
      const results = await Promise.allSettled(
        batch.map(subscription => processUserEmail(subscription, now))
      )

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successCount++
          console.log(`✅ Successfully sent email to user ${batch[index].user_id}`)
        } else {
          errorCount++
          console.error(`❌ Failed to send email to user ${batch[index].user_id}:`, result.reason)
        }
      })
    }

    console.log(`Finished processing. Sent: ${successCount}, Failed: ${errorCount}`)
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Email processing complete",
        eligible: subscriptions.length,
        sent: successCount,
        failed: errorCount
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error("Fatal error in send-reminder-emails function:", error)
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    )
  }
})

/**
 * Process email for a single user
 */
async function processUserEmail(subscription: EmailSubscription, now: Date) {
  // Get user email efficiently (single API call per user)
  const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(subscription.user_id)
  
  if (userError || !user?.email) {
    throw new Error(`User ${subscription.user_id} not found or has no email`)
  }

  // Get random entry for this user
  const { data: entries, error: entriesError } = await supabase
    .from("entries")
    .select("id, title, content, date, mood, ai_summary, positive_affirmation, image_urls")
    .eq("user_id", subscription.user_id)
    .limit(100)

  if (entriesError) {
    throw new Error(`Error fetching entries for user ${subscription.user_id}: ${entriesError.message}`)
  }

  if (!entries || entries.length === 0) {
    console.log(`No entries found for user ${subscription.user_id}, skipping email`)
    return
  }

  // Select random entry
  const randomEntry = entries[Math.floor(Math.random() * entries.length)]

  // --- AI Content Generation (if needed) ---
  let aiSummaryForEmail = randomEntry.ai_summary
  let affirmationsForEmail: Array<{ text: string; based_on?: string }> = []

  if (!randomEntry.ai_summary || !randomEntry.positive_affirmation || 
      (Array.isArray(randomEntry.positive_affirmation) && randomEntry.positive_affirmation.length === 0) ||
      randomEntry.positive_affirmation === "Could not generate affirmations.") {
    
    console.log(`AI content missing for entry ${randomEntry.id}. Generating...`)
    
    try {
      const { data: aiData, error: aiError } = await supabase.functions.invoke("generate-ai-content", {
        body: { entryContent: randomEntry.content }
      })

      if (aiError) {
        console.error(`Error generating AI content for entry ${randomEntry.id}:`, aiError.message)
        aiSummaryForEmail = randomEntry.ai_summary || "Summary could not be generated."
      } else if (aiData) {
        console.log(`AI content generated for entry ${randomEntry.id}`)
        aiSummaryForEmail = aiData.summary
        
        // Parse affirmations
        if (typeof aiData.affirmations === 'string') {
          try {
            const parsed = JSON.parse(aiData.affirmations)
            if (Array.isArray(parsed)) {
              affirmationsForEmail = parsed.filter((item: any) => 
                typeof item === 'object' && item !== null && 'text' in item
              )
            }
          } catch (e) {
            console.error('Failed to parse affirmations string:', e)
          }
        } else if (Array.isArray(aiData.affirmations)) {
          affirmationsForEmail = aiData.affirmations.filter((item: any) => 
            typeof item === 'object' && item !== null && 'text' in item
          )
        }

        // Update entry async (don't await - fire and forget for better performance)
        supabase
          .from("entries")
          .update({ 
            ai_summary: aiSummaryForEmail, 
            positive_affirmation: affirmationsForEmail.length > 0 ? affirmationsForEmail : aiData.affirmations
          })
          .eq("id", randomEntry.id)
          .then(() => console.log(`Updated entry ${randomEntry.id} with AI content`))
          .catch(err => console.error(`Failed to update entry ${randomEntry.id}:`, err))
      }
    } catch (invokeError) {
      console.error(`Error invoking generate-ai-content for entry ${randomEntry.id}:`, invokeError)
      aiSummaryForEmail = randomEntry.ai_summary || "Summary could not be generated."
    }
  } else {
    // Use existing AI content
    aiSummaryForEmail = randomEntry.ai_summary
    
    if (typeof randomEntry.positive_affirmation === 'string') {
      try {
        const parsed = JSON.parse(randomEntry.positive_affirmation)
        if (Array.isArray(parsed)) {
          affirmationsForEmail = parsed.filter((item: any) => 
            typeof item === 'object' && item !== null && 'text' in item
          )
        }
      } catch (e) {
        // Keep affirmationsForEmail empty
      }
    } else if (Array.isArray(randomEntry.positive_affirmation)) {
      affirmationsForEmail = randomEntry.positive_affirmation.filter((item: any) => 
        typeof item === 'object' && item !== null && 'text' in item
      )
    }
  }

  // Build email HTML
  const emailHtml = buildEmailHtml(randomEntry, aiSummaryForEmail, affirmationsForEmail)
  const emailSubject = buildEmailSubject(randomEntry.title)

  // Send email
  const { error: emailError } = await supabase.functions.invoke("send-email", {
    body: {
      to: user.email,
      subject: emailSubject,
      html: emailHtml
    }
  })

  if (emailError) {
    throw new Error(`Error sending email to ${user.email}: ${emailError.message}`)
  }

  // Update last_sent timestamp
  const { error: updateError } = await supabase
    .from("email_subscriptions")
    .update({ last_sent: now.toISOString() })
    .eq("user_id", subscription.user_id)

  if (updateError) {
    console.error(`Error updating last_sent for user ${subscription.user_id}:`, updateError)
  }

  console.log(`Successfully sent email to ${user.email}`)
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
 * Build email HTML template
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
        href="${Deno.env.get("SITE_URL")}/search?query=${encodeURIComponent(entry.title)}&entry=${entry.id}" 
        style="display: inline-block; padding: 10px 15px; background-color: #f59e0b; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px;"
      >
        View Full Entry
      </a>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;" />
      <p style="color: #999; font-size: 0.9em;">
        Manage your notification preferences in your 
        <a href="${Deno.env.get("SITE_URL")}/notifications" style="color: #f59e0b;">notification settings</a>.
      </p>
    </div>
  `
}
