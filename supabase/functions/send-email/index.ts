import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY") || "";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Gestion du pré-vol CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { to, subject, htmlContent, senderName = "BioAthlete", senderEmail = "noreply@bioathlete.app" } = payload;

    if (!to || !subject || !htmlContent) {
      throw new Error("Missing required fields: to, subject, htmlContent");
    }

    const brevoPayload = {
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to }],
      subject: subject,
      htmlContent: htmlContent
    };

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify(brevoPayload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Brevo API Error:", data);
      throw new Error(`Brevo API Error: ${data.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully", data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
