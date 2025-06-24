import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function utf8ToBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, subject, html } = await req.json();

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: "Missing required email parameters (to, subject, html)" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: Deno.env.get("GMAIL_CLIENT_ID")!,
        client_secret: Deno.env.get("GMAIL_CLIENT_SECRET")!,
        refresh_token: Deno.env.get("GMAIL_REFRESH_TOKEN")!,
        grant_type: "refresh_token",
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
        throw new Error(`Failed to get Gmail access token: ${JSON.stringify(tokenData)}`);
    }
    const { access_token } = tokenData;

    const email = [
      `To: ${to}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=UTF-8",
      `Subject: ${subject}`,
      "",
      html,
    ].join("\r\n");

    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw: utf8ToBase64(email).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
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
  } catch (error: unknown) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Internal Server Error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});