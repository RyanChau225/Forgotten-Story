import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.2"; // Import Supabase client
import { corsHeaders } from "../_shared/cors.ts";

const GMAIL_API_KEY = Deno.env.get("GMAIL_API_KEY")!; // This was removed in the reverted version, but is not used in this function. Keeping it here for consistency with environment variables.
const GMAIL_CLIENT_ID = Deno.env.get("GMAIL_CLIENT_ID")!;
const GMAIL_CLIENT_SECRET = Deno.env.get("GMAIL_CLIENT_SECRET")!;
const GMAIL_REFRESH_TOKEN = Deno.env.get("GMAIL_REFRESH_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const GENERATE_AI_CONTENT_FUNCTION_URL = Deno.env.get("GENERATE_AI_CONTENT_FUNCTION_URL")!; // URL for the AI function

interface EmailRequest {
  // We will now fetch entry content internally, so these might change
  // For now, let's assume the request might still provide some context,
  // but the core content comes from a fetched entry.
  // We might need to refine the input based on how this function is triggered.
  userId?: string; // Assuming we might get a user ID to fetch an entry for
  // The test email route might send 'to', 'subject', 'html' directly,
  // so we should still allow them, but prioritize fetching an entry.
  to?: string;
  subject?: string;
  html?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with the user's auth header
    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestBody: EmailRequest = await req.json();
    let to = requestBody.to;
    let subject = requestBody.subject;
    let html = requestBody.html;

    let entry = null;

    // If 'to', 'subject', and 'html' are NOT provided, fetch an entry and generate content
    if (!to || !subject || !html) {
       // --- Fetch a random entry for the user ---
      // TODO: Implement logic to fetch a *random* entry.
      // For now, fetching the most recent entry as a placeholder.
      const { data: entries, error: fetchError } = await supabase
        .from("entries")
        .select("id, content, ai_summary, positive_affirmation, created_at, title") // Added title and created_at
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (fetchError || !entries || entries.length === 0) {
        console.error("Error fetching entry:", fetchError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch journal entry for email" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      entry = entries[0];
      let summary = entry.ai_summary;
      let affirmation = entry.positive_affirmation;

      // --- Check and Generate AI Content if missing ---
      if (!summary || !affirmation) {
        console.log(`AI content missing for entry ${entry.id}, generating...`);
        try {
          const aiResponse = await fetch(GENERATE_AI_CONTENT_FUNCTION_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              // Pass the user's auth header to the AI function for authentication/RLS if needed
              Authorization: authHeader,
            },
            body: JSON.stringify({ entryContent: entry.content }),
          });

          if (!aiResponse.ok) {
            const errorBody = await aiResponse.text();
            throw new Error(`AI function error: ${aiResponse.status} - ${errorBody}`);
          }

          const aiResult = await aiResponse.json();
          summary = aiResult.summary;
          affirmation = aiResult.affirmation;

          // --- Update Entry with Generated AI Content ---
          const { error: updateError } = await supabase
            .from("entries")
            .update({ ai_summary: summary, positive_affirmation: affirmation })
            .eq("id", entry.id)
            .eq("user_id", user.id); // Ensure user owns the entry

          if (updateError) {
            console.error("Error updating entry with AI content:", updateError);
            // Decide how to handle this error - maybe still send email but log the issue
          }

        } catch (aiError) {
          console.error("Error calling AI function:", aiError);
          // Decide how to handle AI generation failure - maybe send email without AI content
          summary = "Could not generate summary."; // Provide fallback text
          affirmation = "Could not generate affirmation."; // Provide fallback text
        }
      } else {
        console.log(`Using existing AI content for entry ${entry.id}.`);
      }

      // --- Prepare Email Content from Entry ---
      to = user.email; // Send email to the authenticated user
      subject = `Your Daily Journal Insight for ${new Date(entry.created_at).toLocaleDateString()}`; // Example subject
      // TODO: Create a proper HTML email template
      html = `
        <h1>Journal Entry Insight</h1>
        <p>Here's an insight from your entry on ${new Date(entry.created_at).toLocaleDateString()}:</p>
        <h2>Summary:</h2>
        <p>${summary}</p>
        <h2>Positive Affirmation:</h2>
        <p>${affirmation}</p>
        <br/>
        <p>Original Entry Title: ${entry.title}</p>
        <p>Original Entry Content (first 200 chars): ${entry.content.substring(0, 200)}...</p>
        <br/>
        <p>Log in to see the full entry.</p>
        `;
    } else {
      // If 'to', 'subject', 'html' are provided, use them directly (for test emails)
      console.log("Sending email with provided content (likely a test email).");
    }


    // Get access token using refresh token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: GMAIL_CLIENT_ID,
        client_secret: GMAIL_CLIENT_SECRET,
        refresh_token: GMAIL_REFRESH_TOKEN,
        grant_type: "refresh_token",
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
        throw new Error(`Failed to get Gmail access token: ${JSON.stringify(tokenData)}`);
    }
    const { access_token } = tokenData;


    // Create email message
    const email = [
      `To: ${to}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=UTF-8",
      `Subject: ${subject}`,
      "",
      html,
    ].join("\r\n");

    // Send email using Gmail API
    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw: btoa(email).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gmail API error: ${JSON.stringify(error)}`);
    }

    return new Response(
      JSON.stringify({ message: "Email sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) { // Explicitly type error as unknown
    console.error("Error in send-email function:", error); // More general error message
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Internal Server Error" }), // Return error message from thrown error
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});