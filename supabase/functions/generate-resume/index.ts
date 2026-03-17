import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GeminiError, generateGeminiChat, extractJSON } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidateData, style, targetRole } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert resume writer specializing in creating ATS-friendly, professional resumes. Generate resume content that:
- Uses strong action verbs and quantifiable achievements
- Is optimized for Applicant Tracking Systems
- Highlights relevant skills and experience
- Is concise yet impactful
- Matches the ${style} resume style

Return a JSON object with these exact fields:
{
  "summary": "A compelling 2-3 sentence professional summary",
  "experience": [{"title": "Job Title", "company": "Company Name", "duration": "Date Range", "highlights": ["Achievement 1", "Achievement 2"]}],
  "skills": {"technical": ["skill1", "skill2"], "soft": ["skill1", "skill2"]},
  "education": [{"degree": "Degree Name", "institution": "School Name", "year": "Year"}],
  "certifications": ["Certification 1"],
  "tips": ["Improvement tip 1", "Improvement tip 2"],
  "score": 85
}`;

    const userPrompt = `Create a professional resume for:
Name: ${candidateData.name}
Current Title: ${candidateData.title}
Experience: ${candidateData.experience_years || 0} years
Skills: ${candidateData.skills?.join(", ") || "Not specified"}
Education: ${JSON.stringify(candidateData.education || [])}
Bio: ${candidateData.bio || "Not provided"}
${targetRole ? `Target Role: ${targetRole} - Optimize the resume for this specific position.` : ""}

Generate ATS-optimized content that showcases their qualifications professionally.`;

    let content = "";
    try {
      content = await generateGeminiChat({
        model: "gemini-2.5-flash",
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
    } catch (error) {
      if (error instanceof GeminiError && error.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (error instanceof GeminiError && error.status === 403) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (error instanceof GeminiError) {
        console.error("Gemini API error:", error.status, error.body);
      } else {
        console.error("Gemini API error:", error);
      }
      throw new Error("AI generation failed");
    }

    // Parse JSON from the response
    let resumeData;
    try {
      resumeData = extractJSON(content);
    } catch (parseError) {
      console.error("Parse error:", parseError);
      // Fallback structure
      resumeData = {
        summary: content.substring(0, 300),
        experience: [],
        skills: { technical: [], soft: [] },
        education: [],
        certifications: [],
        tips: ["Complete your profile for better results"],
        score: 70,
      };
    }

    return new Response(JSON.stringify({ success: true, resume: resumeData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate resume";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
