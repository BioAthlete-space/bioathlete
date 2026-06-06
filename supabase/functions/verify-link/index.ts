import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()
    if (!url) {
      throw new Error('URL is required')
    }

    // Try to fetch the URL to see if it's accessible
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })
    
    let isAccessible = response.ok || [401, 403, 405, 503].includes(response.status);

    if (isAccessible && response.ok) {
      try {
        const text = await response.text();
        const lowerText = text.toLowerCase();
        if (
          lowerText.includes("404 la page") ||
          lowerText.includes("page n'est pas valide") ||
          lowerText.includes('page non trouvée') ||
          lowerText.includes('page introuvable') ||
          lowerText.includes('erreur 404') ||
          lowerText.includes('<title>404')
        ) {
          isAccessible = false;
        }
      } catch (e) {
        // Ignore text parsing errors
      }
    }

    const data = {
      ok: response.ok,
      isAccessible,
      status: response.status,
      contentType: response.headers.get('content-type'),
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message, ok: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }, // Return 200 so the frontend can read the JSON payload
    )
  }
})
