import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Sends an email using Brevo (formerly Sendinblue) API.
 * 
 * This is a simple delivery service - it takes pre-built HTML emails
 * and sends them via Brevo. The email templates are built elsewhere
 * (in send-reminder-emails or send-test-email).
 * 
 * Required environment variables in Supabase:
 * - BREVO_API_KEY: Your Brevo API key
 * - SENDER_EMAIL: The verified sender email (e.g., chau.r225@gmail.com)
 * - SENDER_NAME: The sender name (e.g., "Forgotten Story")
 */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, subject, html } = await req.json();

    // Validate required parameters
    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: "Missing required email parameters (to, subject, html)" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get environment variables
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    const senderEmail = Deno.env.get("SENDER_EMAIL");
    const senderName = Deno.env.get("SENDER_NAME") || "Forgotten Story";

    // Validate API key exists
    if (!brevoApiKey) {
      throw new Error("BREVO_API_KEY environment variable is not set");
    }

    if (!senderEmail) {
      throw new Error("SENDER_EMAIL environment variable is not set");
    }

    console.log(`Sending email to ${to} from ${senderName} <${senderEmail}>`);

    // Send email via Brevo API
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "api-key": brevoApiKey,
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [
          {
            email: to,
          }
        ],
        subject: subject,
        htmlContent: html,
      }),
    });

    // Handle Brevo API response
    if (!response.ok) {
      const error = await response.json();
      console.error("Brevo API error:", error);
      throw new Error(`Brevo API error (${response.status}): ${JSON.stringify(error)}`);
    }

    const result = await response.json();
    console.log("✅ Email sent successfully via Brevo. Message ID:", result.messageId);

    return new Response(
      JSON.stringify({ 
        message: "Email sent successfully",
        messageId: result.messageId 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("❌ Error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Internal Server Error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});