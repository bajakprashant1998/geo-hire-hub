import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateGeminiChat, extractJSON } from "../_shared/gemini.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rlKey = getRateLimitKey(req);
    const rlResult = checkRateLimit(rlKey, { maxRequests: 10, windowMs: 60_000 });
    const rlResponse = rateLimitResponse(rlResult, corsHeaders);
    if (rlResponse) return rlResponse;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, jobId, jobTitle, companyName, jobDescription, skills, questionIndex, answer, sessionId } = await req.json();

    if (action === "generate_questions") {
      // Generate tailored interview questions
      const systemPrompt = `You are an expert interview coach. Generate 5 realistic interview questions tailored to the specific job and company.

RULES:
1. Mix question types: behavioral (STAR method), technical, situational, and cultural fit
2. Make questions specific to the job title, company, and required skills
3. Order from easier to harder
4. Return ONLY a JSON object with this structure:
{
  "questions": [
    {
      "question": "the interview question",
      "type": "behavioral|technical|situational|cultural",
      "difficulty": "easy|medium|hard",
      "tip": "a brief tip for answering this question well"
    }
  ]
}`;

      const userPrompt = `Job Title: ${jobTitle || "General"}
Company: ${companyName || "Unknown"}
Job Description: ${jobDescription || "Not provided"}
Required Skills: ${(skills || []).join(", ") || "Not specified"}

Generate 5 tailored interview questions.`;

      const content = await generateGeminiChat({
        model: "gemini-2.0-flash",
        temperature: 0.6,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const parsed = extractJSON<{ questions: any[] }>(content);

      return new Response(JSON.stringify({ questions: parsed.questions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "evaluate_answer") {
      // Evaluate a candidate's answer to a specific question
      const systemPrompt = `You are an expert interview coach evaluating a candidate's answer. Provide constructive, actionable feedback.

RULES:
1. Score from 1-10
2. Highlight strengths
3. Identify areas for improvement
4. Provide a model answer snippet
5. Return ONLY a JSON object:
{
  "score": 8,
  "strengths": ["specific strength 1", "specific strength 2"],
  "improvements": ["specific improvement 1"],
  "model_answer": "A brief example of a strong answer...",
  "overall_feedback": "One paragraph of encouraging, constructive feedback"
}`;

      const userPrompt = `Job: ${jobTitle} at ${companyName || "a company"}
Question: ${questionIndex !== undefined ? `Question #${questionIndex + 1}` : ""}
The question was: "${answer?.question || ""}"
Candidate's answer: "${answer?.answer || ""}"

Evaluate this answer.`;

      const content = await generateGeminiChat({
        model: "gemini-2.0-flash",
        temperature: 0.4,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const parsed = extractJSON<any>(content);

      return new Response(JSON.stringify({ feedback: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "overall_assessment") {
      // Provide overall interview performance summary
      const systemPrompt = `You are an expert interview coach providing an overall performance summary after a mock interview.

Return ONLY a JSON object:
{
  "overall_score": 75,
  "grade": "B+",
  "summary": "A paragraph summarizing overall performance",
  "top_strengths": ["strength 1", "strength 2", "strength 3"],
  "key_improvements": ["improvement 1", "improvement 2"],
  "hiring_likelihood": "likely|possible|needs_work",
  "next_steps": ["actionable step 1", "actionable step 2"]
}`;

      const userPrompt = `Job: ${jobTitle} at ${companyName || "a company"}
Here are the questions, answers, and individual feedback:
${JSON.stringify(answer, null, 2)}

Provide an overall assessment.`;

      const content = await generateGeminiChat({
        model: "gemini-2.0-flash",
        temperature: 0.4,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const parsed = extractJSON<any>(content);

      return new Response(JSON.stringify({ assessment: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Interview prep error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
