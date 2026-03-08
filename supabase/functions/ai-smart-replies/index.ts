import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { generateGeminiChat, extractJSON } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recentMessages, userRole } = await req.json();

    if (!recentMessages || recentMessages.length === 0) {
      return new Response(JSON.stringify({ replies: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const conversationContext = recentMessages
      .slice(-6)
      .map((m: any) => `${m.isOwn ? "Me" : "Them"}: ${m.content}`)
      .join("\n");

    const result = await generateGeminiChat({
      messages: [
        {
          role: "system",
          content: `You are a smart reply suggestion engine for a job platform messaging system. The user is a ${userRole || "professional"}.
Generate exactly 3 short, contextual, professional reply suggestions based on the conversation. 
Each reply must be 3-15 words, natural, and relevant.
Return ONLY valid JSON: {"replies": ["reply1", "reply2", "reply3"]}`,
        },
        {
          role: "user",
          content: `Recent conversation:\n${conversationContext}\n\nSuggest 3 quick replies I could send next.`,
        },
      ],
      temperature: 0.8,
    });

    const parsed = extractJSON<{ replies: string[] }>(result);
    const replies = (parsed.replies || []).slice(0, 3);

    return new Response(JSON.stringify({ replies }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Smart replies error:", error);
    return new Response(
      JSON.stringify({ replies: [], error: "Failed to generate suggestions" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
