import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { generateGeminiChat } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query } = await req.json();
    if (!query || query.length < 2) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = await generateGeminiChat({
      messages: [
        {
          role: "system",
          content: `You are a location autocomplete engine. Given a partial location query, return up to 5 real city suggestions as a JSON array. Each element must have: city, state, country. Focus on well-known cities globally. Respond ONLY with the JSON array, no explanations.`,
        },
        {
          role: "user",
          content: `Location query: "${query}"`,
        },
      ],
      temperature: 0.1,
    });

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return new Response(JSON.stringify({ suggestions: suggestions.slice(0, 5) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-location-suggest error:", e);
    return new Response(JSON.stringify({ suggestions: [], error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
