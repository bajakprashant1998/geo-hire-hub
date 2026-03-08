import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, data } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let systemPrompt = "";
    let userPrompt = "";

    switch (action) {
      case "site_audit": {
        systemPrompt = `You are an expert SEO auditor. Analyze the provided website data and return a comprehensive SEO audit. 
Score each category from 0-100 and provide specific, actionable recommendations.
Categories: Technical SEO, On-Page SEO, Content Quality, Mobile Optimization, Performance, Structured Data, Internal Linking, Social Signals.
For each issue found, classify severity as: critical, warning, or info.
Format your response as JSON with this structure:
{
  "overall_score": number,
  "categories": [{"name": string, "score": number, "issues": [{"severity": "critical"|"warning"|"info", "title": string, "description": string, "fix": string}]}],
  "top_priorities": [string],
  "quick_wins": [string]
}`;
        userPrompt = `Analyze this website for SEO:
Domain: ${data.domain || "hireforjob.com"}
Pages: ${JSON.stringify(data.pages || [])}
Current meta tags: ${JSON.stringify(data.metaTags || {})}
Sitemap URLs count: ${data.sitemapCount || 0}
Has robots.txt: ${data.hasRobots || true}
Has SSL: ${data.hasSSL || true}
Mobile responsive: ${data.isMobile || true}
Page load time: ${data.loadTime || "unknown"}
Target keywords: ${JSON.stringify(data.keywords || ["hire for job", "jobs near me", "job listings near me", "jobs hiring near me"])}`;
        break;
      }

      case "optimize_page": {
        systemPrompt = `You are an SEO optimization specialist. Given a page's current content and metadata, generate optimized versions targeting the specified keywords.
Return JSON:
{
  "optimized_title": string (max 60 chars),
  "optimized_description": string (max 160 chars),
  "h1_suggestion": string,
  "h2_suggestions": [string],
  "keyword_density": {"keyword": string, "current": number, "recommended": number}[],
  "content_suggestions": [string],
  "internal_link_opportunities": [{"anchor_text": string, "target_url": string}],
  "schema_markup": object
}`;
        userPrompt = `Optimize this page for SEO:
URL: ${data.url}
Current Title: ${data.title}
Current Description: ${data.description}
Current H1: ${data.h1}
Page Content Summary: ${data.contentSummary}
Target Keywords: ${JSON.stringify(data.keywords || [])}
Page Type: ${data.pageType || "general"}`;
        break;
      }

      case "keyword_research": {
        systemPrompt = `You are a keyword research expert specializing in job search platforms. Generate keyword suggestions with estimated search volume and competition.
Return JSON:
{
  "primary_keywords": [{"keyword": string, "volume": string, "competition": "low"|"medium"|"high", "difficulty": number, "opportunity_score": number}],
  "long_tail_keywords": [{"keyword": string, "volume": string, "intent": "informational"|"transactional"|"navigational"}],
  "question_keywords": [string],
  "local_keywords": [{"keyword": string, "location": string}],
  "trending_keywords": [string],
  "content_gap_opportunities": [{"topic": string, "suggested_url": string, "priority": "high"|"medium"|"low"}]
}`;
        userPrompt = `Research keywords for a job search platform called "Hire For Job" (hireforjob.com).
Seed keywords: ${JSON.stringify(data.seedKeywords || ["hire for job", "jobs near me", "job listings near me", "jobs hiring near me"])}
Industry: Job Search / Recruitment
Target market: ${data.targetMarket || "Global, primarily India"}
Competitors: ${JSON.stringify(data.competitors || ["indeed.com", "naukri.com", "linkedin.com"])}`;
        break;
      }

      case "content_brief": {
        systemPrompt = `You are a content strategist for SEO. Create a detailed content brief for a blog post or landing page.
Return JSON:
{
  "title_options": [string],
  "target_word_count": number,
  "outline": [{"heading": string, "subheadings": [string], "key_points": [string]}],
  "target_keywords": {"primary": string, "secondary": [string], "lsi": [string]},
  "internal_links": [{"anchor": string, "url": string}],
  "external_link_suggestions": [string],
  "cta_suggestions": [string],
  "meta_title": string,
  "meta_description": string,
  "faq_questions": [string]
}`;
        userPrompt = `Create a content brief for:
Topic: ${data.topic}
Target Keyword: ${data.keyword}
Content Type: ${data.contentType || "blog post"}
Target Audience: ${data.audience || "job seekers and employers"}
Brand: Hire For Job (hireforjob.com)`;
        break;
      }

      case "competitor_analysis": {
        systemPrompt = `You are a competitive SEO analyst. Analyze the competitor landscape and provide strategic recommendations.
Return JSON:
{
  "competitor_overview": [{"name": string, "strengths": [string], "weaknesses": [string], "estimated_traffic": string}],
  "keyword_gaps": [{"keyword": string, "competitor_ranking": string, "our_opportunity": string}],
  "content_gaps": [{"topic": string, "competitors_covering": [string], "recommended_action": string}],
  "backlink_strategies": [string],
  "differentiation_opportunities": [string]
}`;
        userPrompt = `Analyze competitors for Hire For Job (hireforjob.com), a map-based job search platform.
Competitors: ${JSON.stringify(data.competitors || ["indeed.com", "naukri.com", "linkedin.com", "glassdoor.com"])}
Our USP: Interactive map-based job search, location-first approach
Target keywords: ${JSON.stringify(data.keywords || ["hire for job", "jobs near me"])}`;
        break;
      }

      case "chat": {
        systemPrompt = `You are an expert SEO consultant for "Hire For Job" (hireforjob.com), a map-based job search platform. 
You help with all aspects of SEO: technical, on-page, off-page, content strategy, keyword research, link building, and more.
Target keywords: "hire for job", "jobs near me", "job listings near me", "jobs hiring near me".
Always provide actionable, specific advice. Reference real SEO best practices and Google guidelines.
When suggesting changes, be specific about what to change and where.`;
        userPrompt = data.message;
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const isChat = action === "chat";
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...(data.history || []),
          { role: "user", content: userPrompt },
        ],
        stream: isChat,
        ...(isChat ? {} : { response_format: { type: "json_object" } }),
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    if (isChat) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { raw: content };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("seo-agent error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
