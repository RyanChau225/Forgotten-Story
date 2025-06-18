import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

// Directly include CORS headers here
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS", // Ensure OPTIONS is included if you have preflight checks
};

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
  mood: number // Assuming mood is a number from 1-10
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

    console.log('Fetched subscriptions:', subscriptions); // Add this line
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
        let { data: entries, error: entriesError } = await supabase
          .from("entries")
          // Select new fields for AI content and images
          .select("id, title, content, date, mood, ai_summary, positive_affirmation, image_urls") 
          .eq("user_id", user.id)
          // .order("date", { ascending: false }) // Maybe order by random()? Check Supabase docs
          .limit(100) // Fetch more to increase randomness if needed

        if (entriesError) {
          console.error(`Error fetching entries for user ${user.id}:`, entriesError)
          continue // Skip this user if entries fail
        }

        if (entries && entries.length > 0) {
          let randomEntry = entries[Math.floor(Math.random() * entries.length)]
          
          // --- AI Content Generation (if needed) ---
          let entrySummaryForSubject = "A Memory From Your Journal"; // Fallback subject part
          let affirmationsForEmail: Array<{ text: string; based_on?: string }> = [];
          let aiSummaryForEmail = randomEntry.ai_summary;

          if (!randomEntry.ai_summary || !randomEntry.positive_affirmation || 
              (Array.isArray(randomEntry.positive_affirmation) && randomEntry.positive_affirmation.length === 0) ||
              randomEntry.positive_affirmation === "Could not generate affirmations.") {
            console.log(`AI content missing for entry ${randomEntry.id}. Attempting to generate...`);
            try {
              const { data: aiData, error: aiError } = await supabase.functions.invoke("generate-ai-content", {
                body: { entryContent: randomEntry.content },
              });

              if (aiError) {
                console.error(`Error generating AI content for entry ${randomEntry.id}:`, aiError.message);
                // Use fallback/error values if AI generation fails
                aiSummaryForEmail = randomEntry.ai_summary || "Summary could not be generated.";
                // Keep affirmations as empty or existing error string
                if (typeof randomEntry.positive_affirmation === 'string') {
                   // affirmationsForEmail remains empty, string will be handled below
                }
              } else if (aiData) {
                console.log(`AI content generated for entry ${randomEntry.id}:`, aiData);
                aiSummaryForEmail = aiData.summary;
                
                // Ensure affirmations are in the array format
                if (typeof aiData.affirmations === 'string') {
                    try {
                        const parsedAffirmations = JSON.parse(aiData.affirmations);
                        if (Array.isArray(parsedAffirmations)) {
                            affirmationsForEmail = parsedAffirmations.filter((item: any) => typeof item === 'object' && item !== null && 'text' in item);
                        } else {
                             // affirmationsForEmail remains empty, string will be handled below
                        }
                    } catch (e) {
                         // affirmationsForEmail remains empty, string will be handled below
                    }
                } else if (Array.isArray(aiData.affirmations)) {
                    affirmationsForEmail = aiData.affirmations.filter((item: any) => typeof item === 'object' && item !== null && 'text' in item);
                }


                // Update the entry in the database with new AI content
                const { error: updateEntryError } = await supabase
                  .from("entries")
                  .update({ 
                    ai_summary: aiSummaryForEmail, 
                    positive_affirmation: affirmationsForEmail.length > 0 ? affirmationsForEmail : aiData.affirmations // store original if parsing failed but was string
                  })
                  .eq("id", randomEntry.id);

                if (updateEntryError) {
                  console.error(`Error updating entry ${randomEntry.id} with AI content:`, updateEntryError.message);
                } else {
                  console.log(`Entry ${randomEntry.id} updated with new AI content.`);
                  // Update randomEntry in memory for email construction
                  randomEntry.ai_summary = aiSummaryForEmail;
                  randomEntry.positive_affirmation = affirmationsForEmail.length > 0 ? affirmationsForEmail : aiData.affirmations;
                }
              }
            } catch (invokeError) {
              console.error(`Error invoking generate-ai-content for entry ${randomEntry.id}:`, invokeError);
              aiSummaryForEmail = randomEntry.ai_summary || "Summary could not be generated.";
            }
          } else {
             aiSummaryForEmail = randomEntry.ai_summary;
             if (typeof randomEntry.positive_affirmation === 'string') {
                try {
                    const parsed = JSON.parse(randomEntry.positive_affirmation);
                    if (Array.isArray(parsed)) {
                        affirmationsForEmail = parsed.filter((item: any) => typeof item === 'object' && item !== null && 'text' in item);
                    }
                } catch (e) { /* affirmationsForEmail remains empty */ }
            } else if (Array.isArray(randomEntry.positive_affirmation)) {
                affirmationsForEmail = randomEntry.positive_affirmation.filter((item: any) => typeof item === 'object' && item !== null && 'text' in item);
            }
          }
          
          if (aiSummaryForEmail && aiSummaryForEmail !== "Summary could not be generated." && aiSummaryForEmail !== "Could not generate summary.") {
            entrySummaryForSubject = aiSummaryForEmail;
          }
          // --- End AI Content Generation ---

          // --- Email Formatting ---
          
          // Mood mapping (assuming 1-10 scale) - Adjust emojis and descriptions as needed
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
          };
          const currentMood = randomEntry.mood && moodMap[randomEntry.mood] ? moodMap[randomEntry.mood] : { emoji: "❓", description: "Unknown" };

          let moodHtml = "";
          if (randomEntry.mood) { // Check if mood data exists
            moodHtml = `
              <div style="margin-bottom: 15px; padding: 10px; background-color: #f0f0f0; border-radius: 4px; text-align: center;">
                <span style="font-size: 24px; margin-right: 8px;">${currentMood.emoji}</span>
                <span style="color: #555; font-weight: bold;">Mood: ${currentMood.description}</span>
              </div>`;
          }

          let affirmationsHtml = "";
          if (affirmationsForEmail.length > 0) {
            affirmationsHtml = `
              <h3 style="color: #444; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">✨ Positive Affirmations</h3>
              <ul style="list-style-type: none; padding-left: 0; color: #555;">`;
            affirmationsForEmail.forEach(aff => {
              affirmationsHtml += `
                <li style="margin-bottom: 10px; background-color: #f0f0f0; padding: 8px; border-radius: 3px;">
                  <p style="margin: 0 0 3px 0; font-weight: bold;">${aff.text}</p>
                  ${aff.based_on && aff.based_on !== "N/A" ? `<p style="margin: 0; font-size: 0.85em; color: #777; font-style: italic;">Based on: "${aff.based_on}"</p>` : ""}
                </li>`;
            });
            affirmationsHtml += `</ul>`;
          } else if (typeof randomEntry.positive_affirmation === 'string' && randomEntry.positive_affirmation && randomEntry.positive_affirmation !== "Could not generate affirmations.") {
            affirmationsHtml = `
              <h3 style="color: #444; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">✨ Positive Affirmation</h3>
              <div style="background-color: #f0f0f0; padding: 8px; border-radius: 3px; color: #555;">
                <p style="margin: 0;">${randomEntry.positive_affirmation}</p>
              </div>`;
          } else if (randomEntry.ai_summary && randomEntry.ai_summary !== "Could not generate summary.") {
             affirmationsHtml = `<p style="color: #666; font-size: 0.9em; margin-top: 15px;">Affirmations could not be generated for this entry. Try adding more detail next time!</p>`;
          }


          let imagesHtml = "";
          if (randomEntry.image_urls && randomEntry.image_urls.length > 0) {
            imagesHtml = `<h3 style="color: #444; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">🖼️ Images</h3><div style="display: flex; flex-wrap: wrap; gap: 10px;">`;
            randomEntry.image_urls.forEach(url => {
              imagesHtml += `<div style="width: 150px; height: 150px; overflow: hidden; border-radius: 4px; border: 1px solid #ddd;"><img src="${url}" alt="Entry Image" style="width: 100%; height: 100%; object-fit: cover;" /></div>`;
            });
            imagesHtml += `</div>`;
          }
          // --- End Email Formatting ---
          
          // Send email using the send-email function
          console.log(`Invoking send-email for user ${user.id} with entry ${randomEntry.id}`);

          // Shorter teaser for the subject line, ensuring it doesn't break words awkwardly if possible
          let subjectTeaser = entrySummaryForSubject;

          const emailSubject = subjectTeaser; // Use only the teaser for the subject
          
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 5px;">
              <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px;">🏷️ Title: ${randomEntry.title}</h2>
              
              ${moodHtml}
              
              ${affirmationsHtml}

              <h3 style="color: #444; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">📖 Your Journal Entry</h3>
              <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                <p style="color: #555; white-space: pre-wrap; line-height: 1.6;">${randomEntry.content}</p>
                <p style="color: #888; font-size: 0.9em; margin-top: 15px;">Written on: ${new Date(randomEntry.date).toLocaleDateString()}</p>
              </div>

              ${imagesHtml}

              <a 
                href="${Deno.env.get("SITE_URL")}/search?query=${encodeURIComponent(randomEntry.title)}&entry=${randomEntry.id}" 
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
          `;

          const { error: emailError } = await supabase.functions.invoke("send-email", {
            body: {
              to: user.email,
              subject: emailSubject,
              html: emailHtml
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