import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, jobTitle, bio, skills, experienceYears, currentCompany, workExperience, position, company } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let prompt = "";

    switch (type) {
      case "headline":
        prompt = `Generate a professional headline for a candidate profile (like LinkedIn headline). Max 120 characters.
Job Title: ${jobTitle || "Not specified"}
Experience: ${experienceYears || 0} years
Skills: ${(skills || []).slice(0, 10).join(", ") || "Not specified"}
Current Company: ${currentCompany || "Not specified"}
Return ONLY the headline text, nothing else.`;
        break;

      case "summary":
        prompt = `Write a professional summary/about section for a candidate profile. 3-4 sentences, compelling and specific.
Job Title: ${jobTitle || "Not specified"}
Experience: ${experienceYears || 0} years
Skills: ${(skills || []).slice(0, 15).join(", ") || "Not specified"}
Current Company: ${currentCompany || "Not specified"}
Return ONLY the summary text, nothing else.`;
        break;

      case "work_description":
        prompt = `Write a professional work experience description with 3-5 bullet points highlighting key responsibilities and achievements.
Position: ${position || "Not specified"}
Company: ${company || "Not specified"}
Skills context: ${(skills || []).slice(0, 10).join(", ") || "General"}
Return ONLY the description text with bullet points (use • character), nothing else.`;
        break;

      case "cover_letter":
        prompt = `Write a professional default cover letter template that can be customized for job applications. 3-4 paragraphs.
Candidate: ${jobTitle || "Professional"} with ${experienceYears || 0} years experience
Skills: ${(skills || []).slice(0, 15).join(", ") || "Various"}
Current Company: ${currentCompany || ""}
Keep it professional but personable. Use [Company Name] and [Position] as placeholders.
Return ONLY the cover letter text, nothing else.`;
        break;

      case "languages":
        prompt = `Suggest 8-10 commonly spoken world languages that a professional might know, as a JSON array of strings.
Return ONLY a JSON array like ["English", "Hindi", "Spanish", ...], nothing else.`;
        break;

      case "industries":
        prompt = `Based on the job title "${jobTitle || "general"}", suggest 10-12 relevant industry categories as a JSON array of strings.
Include both directly related and adjacent industries. Use standard industry names.
Return ONLY a JSON array like ["Information Technology", "Finance", ...], nothing else.`;
        break;

      default:
        throw new Error("Invalid content type");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a professional career advisor. Be concise and specific. No markdown formatting unless bullet points requested." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // For array types, parse JSON
    if (type === "languages" || type === "industries") {
      try {
        const match = content.match(/\[[\s\S]*\]/);
        const items = match ? JSON.parse(match[0]) : [];
        return new Response(JSON.stringify({ suggestions: items }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ suggestions: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ content: content.trim() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ai-profile-content error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
