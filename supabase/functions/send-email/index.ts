import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

const GMAIL_API_KEY = Deno.env.get("GMAIL_API_KEY")!
const GMAIL_CLIENT_ID = Deno.env.get("GMAIL_CLIENT_ID")!
const GMAIL_CLIENT_SECRET = Deno.env.get("GMAIL_CLIENT_SECRET")!
const GMAIL_REFRESH_TOKEN = Deno.env.get("GMAIL_REFRESH_TOKEN")!

interface EmailRequest {
  to: string
  subject: string
  html: string
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { to, subject, html }: EmailRequest = await req.json()

    if (!to || !subject || !html) {
      throw new Error("Missing required email fields")
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
    })

    const { access_token } = await tokenResponse.json()

    // Create email message
    const email = [
      `To: ${to}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=UTF-8",
      `Subject: ${subject}`,
      "",
      html,
    ].join("\r\n")

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
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Gmail API error: ${JSON.stringify(error)}`)
    }

    return new Response(
      JSON.stringify({ message: "Email sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    )
  }
}) 