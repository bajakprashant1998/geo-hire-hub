import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, limit = 10 } = await req.json();
    if (!query || query.length < 2) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Search local database first
    const searchTerm = query.toLowerCase();
    const { data: dbResults } = await supabase
      .from("world_cities")
      .select("city, state, country, population")
      .or(`search_text.ilike.%${searchTerm}%`)
      .order("population", { ascending: false })
      .limit(limit);

    const localResults = (dbResults || []).map((r: any) => ({
      city: r.city,
      state: r.state,
      country: r.country,
      source: "local",
    }));

    // If we have enough local results, return them
    if (localResults.length >= limit) {
      return new Response(JSON.stringify({ results: localResults.slice(0, limit) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Fallback to Google Maps Places API (Autocomplete)
    const googleMapsKey = Deno.env.get("GOOGLE_MAPS_API_KEY") || Deno.env.get("VITE_GOOGLE_MAPS_API_KEY");
    let apiResults: any[] = [];

    if (googleMapsKey) {
      try {
        const placesUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=(cities)&key=${googleMapsKey}`;
        const placesResponse = await fetch(placesUrl);

        if (placesResponse.ok) {
          const placesData = await placesResponse.json();
          if (placesData.predictions && Array.isArray(placesData.predictions)) {
            // Parse structured formatting from Google
            apiResults = placesData.predictions.map((p: any) => {
              const terms = p.terms || [];
              const city = terms[0]?.value || p.structured_formatting?.main_text || "";
              const country = terms.length > 0 ? terms[terms.length - 1]?.value || "" : "";
              const state = terms.length > 2 ? terms[terms.length - 2]?.value || null : null;
              return {
                city,
                state,
                country,
                source: "google",
                place_id: p.place_id,
              };
            });
          }
        }
      } catch (googleError) {
        console.error("Google Places API error:", googleError);
      }
    }

    // Step 3: Merge results, deduplicate, prefer local
    const seen = new Set<string>();
    const merged: any[] = [];

    for (const r of [...localResults, ...apiResults]) {
      const key = `${r.city.toLowerCase()}-${(r.state || "").toLowerCase()}-${r.country.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(r);
      }
    }

    // Step 4: Cache new Google results back to local DB (fire-and-forget)
    const newCities = apiResults.filter((r) => {
      const key = `${r.city.toLowerCase()}-${(r.state || "").toLowerCase()}-${r.country.toLowerCase()}`;
      return !localResults.some(
        (lr: any) => `${lr.city.toLowerCase()}-${(lr.state || "").toLowerCase()}-${lr.country.toLowerCase()}` === key
      );
    });

    if (newCities.length > 0) {
      const insertRows = newCities.map((c: any) => ({
        city: c.city,
        state: c.state,
        country: c.country,
        population: 0,
      }));
      supabase.from("world_cities").upsert(insertRows, { 
        onConflict: "city,country",
        ignoreDuplicates: true 
      }).then(() => {}).catch(() => {});
    }

    return new Response(JSON.stringify({ results: merged.slice(0, limit) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("search-cities error:", error);
    return new Response(
      JSON.stringify({ results: [], error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
