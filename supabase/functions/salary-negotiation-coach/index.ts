import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateGeminiChat, extractJSON } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // ACTION: analyze_offer
    if (action === "analyze_offer") {
      const { jobTitle, companyName, salary, currency, benefits, equity, location, currentSalary, yearsExperience } = body;

      const prompt = `You are an expert salary negotiation coach. Analyze this job offer and provide detailed guidance.

Job Offer Details:
- Position: ${jobTitle || "Not specified"}
- Company: ${companyName || "Not specified"}
- Offered Salary: ${currency || "USD"} ${salary || "Not specified"}
- Benefits: ${benefits || "Not specified"}
- Equity/Stock: ${equity || "None"}
- Location: ${location || "Not specified"}
- Candidate's Current Salary: ${currency || "USD"} ${currentSalary || "Not specified"}
- Years of Experience: ${yearsExperience || "Not specified"}

Return a JSON object:
{
  "market_comparison": {
    "rating": "above_market" | "at_market" | "below_market",
    "estimated_range": { "low": number, "mid": number, "high": number },
    "percentile": number
  },
  "strengths": ["list of strong aspects of this offer"],
  "weaknesses": ["list of areas where offer could be better"],
  "negotiation_leverage": ["specific leverage points to use"],
  "counter_offer": {
    "suggested_salary": number,
    "rationale": "why this amount is justified",
    "script": "exact words to say when countering"
  },
  "benefits_analysis": {
    "good": ["benefits that are competitive"],
    "missing": ["common benefits not included"],
    "negotiable": ["benefits worth negotiating"]
  },
  "overall_score": number,
  "verdict": "short 1-2 sentence overall assessment"
}`;

      const result = await generateGeminiChat({
        messages: [
          { role: "system", content: "You are a salary negotiation expert. Always return valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.6,
      });

      const analysis = extractJSON(result);
      return new Response(JSON.stringify({ analysis }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: negotiation_chat
    if (action === "negotiation_chat") {
      const { messages, context } = body;

      const systemPrompt = `You are an expert salary negotiation coach helping a candidate negotiate their job offer. Be supportive, strategic, and specific.

Context about their situation:
${context ? JSON.stringify(context) : "No specific context provided."}

Guidelines:
- Provide specific scripts and exact wording they can use
- Reference market data and negotiation psychology
- Be encouraging but realistic
- If they share an offer, analyze it and suggest improvements
- Give actionable next steps
- Use bullet points and formatting for clarity
- Keep responses concise but thorough`;

      const chatMessages = [
        { role: "system" as const, content: systemPrompt },
        ...(messages || []).map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      const result = await generateGeminiChat({
        messages: chatMessages,
        temperature: 0.7,
      });

      return new Response(JSON.stringify({ reply: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: generate_playbook
    if (action === "generate_playbook") {
      const { jobTitle, companyName, currentSalary, targetSalary, currency, situation } = body;

      const prompt = `Generate a complete salary negotiation playbook for this scenario:

Position: ${jobTitle || "Not specified"}
Company: ${companyName || "Not specified"}
Current Salary: ${currency || "USD"} ${currentSalary || "Not specified"}
Target Salary: ${currency || "USD"} ${targetSalary || "Not specified"}
Situation: ${situation || "Standard new offer negotiation"}

Return a JSON object:
{
  "phases": [
    {
      "phase": 1,
      "title": "Research & Preparation",
      "duration": "1-2 days",
      "tasks": ["specific task 1", "specific task 2"],
      "scripts": ["exact phrase or email template to use"],
      "tips": ["pro tip"]
    },
    {
      "phase": 2,
      "title": "Setting Your Anchor",
      "duration": "During negotiation",
      "tasks": [],
      "scripts": [],
      "tips": []
    },
    {
      "phase": 3,
      "title": "The Counter-Offer",
      "duration": "1-2 days after initial offer",
      "tasks": [],
      "scripts": [],
      "tips": []
    },
    {
      "phase": 4,
      "title": "Closing the Deal",
      "duration": "Final stage",
      "tasks": [],
      "scripts": [],
      "tips": []
    }
  ],
  "do_list": ["things to definitely do"],
  "dont_list": ["things to avoid"],
  "power_phrases": ["high-impact negotiation phrases"],
  "email_templates": {
    "counter_offer": "full email template",
    "follow_up": "full email template",
    "acceptance": "full email template"
  }
}`;

      const result = await generateGeminiChat({
        messages: [
          { role: "system", content: "You are a salary negotiation strategist. Return valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.6,
      });

      const playbook = extractJSON(result);
      return new Response(JSON.stringify({ playbook }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: practice_simulate
    if (action === "practice_simulate") {
      const { scenario, candidateMessage, conversationHistory } = body;

      const systemPrompt = `You are playing the role of a hiring manager in a salary negotiation role-play. Your goal is to test the candidate's negotiation skills by being realistic but fair.

Scenario: ${scenario || "Standard salary negotiation for a mid-level role"}

Rules:
- Stay in character as the hiring manager
- Be realistic: push back on requests, ask for justification
- Don't give in too easily but be reasonable
- After each exchange, silently evaluate the candidate's approach
- If the conversation seems to be reaching a conclusion, provide your evaluation

If the candidate says "END_SIMULATION" or the negotiation reaches a natural conclusion, break character and respond with JSON:
{
  "simulation_complete": true,
  "score": number (1-100),
  "grade": "A+" | "A" | "B+" | "B" | "C+" | "C" | "D",
  "strengths": ["what they did well"],
  "mistakes": ["what they could improve"],
  "tips": ["specific advice for next time"],
  "outcome": "description of the negotiation outcome"
}

Otherwise, respond in character as the hiring manager (plain text, not JSON).`;

      const chatMessages = [
        { role: "system" as const, content: systemPrompt },
        ...(conversationHistory || []).map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        ...(candidateMessage ? [{ role: "user" as const, content: candidateMessage }] : []),
      ];

      const result = await generateGeminiChat({
        messages: chatMessages,
        temperature: 0.7,
      });

      // Check if simulation ended
      let simulationResult = null;
      try {
        if (result.includes("simulation_complete")) {
          simulationResult = extractJSON(result);
        }
      } catch { /* not JSON, still in conversation */ }

      return new Response(JSON.stringify({
        reply: simulationResult ? null : result,
        simulation_result: simulationResult,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action: " + action }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("salary-negotiation-coach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
