import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import { corsHeaders } from "../_shared/cors.ts"

// Retrieve secrets from environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const functionSecret = Deno.env.get("FUNCTION_SECRET") // Get the secret for auth

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface EmailSubscription {
  user_id: string
  frequency: string // Expect '1', '3', '7', '30'
  is_active: boolean
  last_sent: string | null
}

interface User {
  email: string
  id: string
}

interface Entry {
  id: string
  title: string
  content: string
  date: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  // --- Authorization Check --- 
  // Check for the secret query parameter
  const url = new URL(req.url)
  const secret = url.searchParams.get("secret")
  if (!functionSecret || secret !== functionSecret) {
    console.warn("Unauthorized access attempt detected to send-reminder-emails.") // Optional: Log attempts
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    )
  }
  // --- End Authorization Check ---

  try {
    // Get all active subscriptions
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from("email_subscriptions")
      .select("*")
      .eq("is_active", true)

    if (subscriptionError) throw subscriptionError

    // Get users for these subscriptions
    const userIds = subscriptions.map((sub: EmailSubscription) => sub.user_id)
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) throw usersError
    
    // Filter admin user list to match subscription userIds and get their emails
    const users = usersData.users
      .filter(u => userIds.includes(u.id) && u.email)
      .map(u => ({ id: u.id, email: u.email! })) // We filtered for users with email

    // Process each subscription
    for (const subscription of subscriptions) {
      const user = users.find((u: User) => u.id === subscription.user_id)
      if (!user) continue // Skip if user not found or has no email

      // Check if it's time to send based on frequency
      const lastSent = subscription.last_sent ? new Date(subscription.last_sent) : null
      const now = new Date()
      let shouldSend = false

      // Use the correct frequency values ('1', '3', '7', '30')
      const frequencyDays = parseInt(subscription.frequency, 10) // Ensure base 10
      if (!isNaN(frequencyDays) && frequencyDays > 0) {
        shouldSend = !lastSent || now.getTime() - lastSent.getTime() >= frequencyDays * 24 * 60 * 60 * 1000
      } else {
        // Log if frequency is invalid, but don't error out the whole process
        console.warn(`Invalid frequency '${subscription.frequency}' for user ${subscription.user_id}`)
      }
      
      if (shouldSend) {
        console.log(`Sending reminder to user ${user.id}`)
        // Get a random entry for this user
        const { data: entries, error: entriesError } = await supabase
          .from("entries")
          .select("id, title, content, date")
          .eq("user_id", user.id)
          // .order("date", { ascending: false }) // Maybe order by random()? Check Supabase docs
          .limit(100) // Fetch more to increase randomness if needed

        if (entriesError) {
          console.error(`Error fetching entries for user ${user.id}:`, entriesError)
          continue // Skip this user if entries fail
        }

        if (entries && entries.length > 0) {
          const randomEntry = entries[Math.floor(Math.random() * entries.length)]
          
          // Send email using the send-email function
          console.log(`Invoking send-email for user ${user.id} with entry ${randomEntry.id}`)
          const { error: emailError } = await supabase.functions.invoke("send-email", {
            body: {
              to: user.email,
              subject: "Your Random Journal Entry Reminder",
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 5px;">
                  <h2 style="color: #333;">A Memory From Your Journal</h2>
                  <p style="color: #666; font-size: 1.1em; margin-bottom: 15px;">Here's an entry from your past:</p>
                  <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                    <h3 style="color: #444; margin-top: 0;">${randomEntry.title}</h3>
                    <p style="color: #555; white-space: pre-wrap; line-height: 1.6;">${randomEntry.content.substring(0, 300)}${randomEntry.content.length > 300 ? '...' : ''}</p>
                    <p style="color: #888; font-size: 0.9em; margin-top: 15px;">Written on: ${new Date(randomEntry.date).toLocaleDateString()}</p>
                  </div>
                  <a 
                    href="${Deno.env.get("SITE_URL")}/search?query=${encodeURIComponent(randomEntry.title)}&entry=${randomEntry.id}" 
                    style="display: inline-block; padding: 10px 15px; background-color: #f59e0b; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold;"
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
          })

          if (emailError) {
            console.error(`Error sending email to user ${user.id}:`, emailError)
            continue // Skip updating last_sent if email failed
          }

          // Update last_sent timestamp
          const { error: updateError } = await supabase
            .from("email_subscriptions")
            .update({ last_sent: now.toISOString() })
            .eq("user_id", user.id)

          if (updateError) {
             console.error(`Error updating last_sent for user ${user.id}:`, updateError)
             // Decide if you want to continue or stop here
          }
          console.log(`Successfully processed and updated last_sent for user ${user.id}`)
        } else {
          console.log(`No entries found for user ${user.id}, skipping email.`)
        }
      }
    }

    console.log("Finished processing all eligible subscriptions.")
    return new Response(
      JSON.stringify({ message: "Emails processed successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
     console.error("General error in send-reminder-emails function:", error)
     return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    )
  }
}) 