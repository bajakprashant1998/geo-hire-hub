import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const rlKey = getRateLimitKey(req);
    const rlResult = checkRateLimit(rlKey, { maxRequests: 20, windowMs: 60_000 });
    const rlResponse = rateLimitResponse(rlResult, corsHeaders);
    if (rlResponse) return rlResponse;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Authentication required");

    const adminClient = createClient(supabaseUrl, supabaseKey);
    const { data: isAdmin } = await adminClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) throw new Error("Admin access required");

    const { action, content_type, content_id, content_text, moderation_item_id } = await req.json();

    if (action === "scan_content") {
      // Scan a single piece of content
      const riskAnalysis = await analyzeContent(LOVABLE_API_KEY, content_type, content_text);

      // Save scan result
      await adminClient.from("content_moderation_scans").insert({
        content_type,
        content_id,
        content_text: content_text.slice(0, 5000),
        risk_score: riskAnalysis.risk_score,
        risk_reasons: riskAnalysis.risk_reasons,
        recommendation: riskAnalysis.recommendation,
        flagged: riskAnalysis.risk_score >= 60,
      });

      // If linked to a moderation item, update it
      if (moderation_item_id) {
        await adminClient.from("moderation_queue").update({
          ai_risk_score: riskAnalysis.risk_score,
          ai_risk_reasons: riskAnalysis.risk_reasons,
          ai_recommendation: riskAnalysis.recommendation,
          ai_scanned_at: new Date().toISOString(),
        }).eq("id", moderation_item_id);
      }

      return new Response(JSON.stringify(riskAnalysis), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "scan_moderation_item") {
      // Fetch the content based on moderation item
      const { data: item } = await adminClient.from("moderation_queue").select("*").eq("id", moderation_item_id).single();
      if (!item) throw new Error("Moderation item not found");

      let fetchedText = "";
      if (item.content_type === "job") {
        const { data: job } = await adminClient.from("jobs").select("title, description, requirements, salary_range").eq("id", item.content_id).single();
        fetchedText = job ? `Job Title: ${job.title}\nDescription: ${job.description}\nRequirements: ${job.requirements}\nSalary: ${job.salary_range}` : "";
      } else if (item.content_type === "profile") {
        const { data: profile } = await adminClient.from("profiles").select("full_name, bio").eq("id", item.content_id).single();
        const { data: candidate } = await adminClient.from("candidates").select("bio, headline, job_title").eq("profile_id", item.content_id).maybeSingle();
        fetchedText = [
          profile?.full_name ? `Name: ${profile.full_name}` : "",
          profile?.bio ? `Bio: ${profile.bio}` : "",
          candidate?.headline ? `Headline: ${candidate.headline}` : "",
          candidate?.bio ? `About: ${candidate.bio}` : "",
        ].filter(Boolean).join("\n");
      } else if (item.content_type === "message") {
        const { data: msg } = await adminClient.from("messages").select("content").eq("id", item.content_id).single();
        fetchedText = msg?.content || "";
      }

      const textToAnalyze = fetchedText || item.reason || "No content available";
      const riskAnalysis = await analyzeContent(LOVABLE_API_KEY, item.content_type, textToAnalyze);

      await adminClient.from("moderation_queue").update({
        ai_risk_score: riskAnalysis.risk_score,
        ai_risk_reasons: riskAnalysis.risk_reasons,
        ai_recommendation: riskAnalysis.recommendation,
        ai_scanned_at: new Date().toISOString(),
      }).eq("id", moderation_item_id);

      await adminClient.from("content_moderation_scans").insert({
        content_type: item.content_type,
        content_id: item.content_id,
        content_text: textToAnalyze.slice(0, 5000),
        risk_score: riskAnalysis.risk_score,
        risk_reasons: riskAnalysis.risk_reasons,
        recommendation: riskAnalysis.recommendation,
        flagged: riskAnalysis.risk_score >= 60,
        created_moderation_item_id: moderation_item_id,
      });

      return new Response(JSON.stringify(riskAnalysis), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "bulk_scan") {
      // Scan all pending moderation items
      const { data: pendingItems } = await adminClient
        .from("moderation_queue")
        .select("id")
        .eq("status", "pending")
        .is("ai_scanned_at", null)
        .limit(20);

      const scannedCount = pendingItems?.length || 0;
      // Return immediately, scanning happens async-like via sequential calls
      // For now we just flag them for scan
      return new Response(JSON.stringify({ message: `${scannedCount} items queued for scanning`, count: scannedCount, item_ids: pendingItems?.map(i => i.id) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (e) {
    console.error("AI Content Moderator error:", e);
    const status = (e as Error).message?.includes("Authentication") ? 401 : (e as Error).message?.includes("Admin") ? 403 : 500;
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function analyzeContent(apiKey: string, contentType: string, text: string) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: `You are a content moderation AI for a job platform. Analyze the given ${contentType} content for:
1. Spam or scam indicators (fake jobs, phishing, MLM schemes)
2. Inappropriate or offensive language
3. Fake or misleading information (unrealistic salaries, fake companies)
4. Contact information harvesting attempts
5. Discrimination or bias in job posts
6. Suspicious patterns (copy-paste templates, keyword stuffing)

You must respond using the provided tool.`,
        },
        { role: "user", content: `Analyze this ${contentType} content:\n\n${text.slice(0, 4000)}` },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "content_risk_analysis",
            description: "Return the risk analysis for the content",
            parameters: {
              type: "object",
              properties: {
                risk_score: {
                  type: "integer",
                  description: "Risk score 0-100. 0=safe, 100=definitely malicious",
                },
                risk_reasons: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of specific risk factors found",
                },
                recommendation: {
                  type: "string",
                  enum: ["approve", "review", "reject"],
                  description: "approve=safe, review=needs human review, reject=clearly violating",
                },
                summary: {
                  type: "string",
                  description: "Brief summary of findings in 1-2 sentences",
                },
              },
              required: ["risk_score", "risk_reasons", "recommendation", "summary"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "content_risk_analysis" } },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("AI rate limit exceeded, please try again later");
    if (response.status === 402) throw new Error("AI credits exhausted, please top up");
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("AI did not return structured output");

  const result = JSON.parse(toolCall.function.arguments);
  return {
    risk_score: Math.min(100, Math.max(0, result.risk_score)),
    risk_reasons: result.risk_reasons || [],
    recommendation: result.recommendation || "review",
    summary: result.summary || "Analysis complete",
  };
}
