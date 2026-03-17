import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LANG_NAMES: Record<string, string> = {
  es: 'Spanish', fr: 'French', hi: 'Hindi', ar: 'Arabic',
  pt: 'Portuguese', zh: 'Chinese (Simplified)', ja: 'Japanese',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, description, targetLanguages } = await req.json();

    if (!title || !targetLanguages?.length) {
      return new Response(JSON.stringify({ error: 'Missing title or targetLanguages' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Translation service not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const langList = targetLanguages.map((code: string) => `${code}: ${LANG_NAMES[code] || code}`).join(', ');

    const prompt = `Translate this job posting into these languages: ${langList}.

Job Title: ${title}

Job Description:
${description || '(No description provided)'}

Return ONLY valid JSON with this exact structure (no markdown, no code blocks):
{
${targetLanguages.map((code: string) => `  "${code}": { "title": "translated title", "description": "translated description" }`).join(',\n')}
}

Rules:
- Keep job-specific terms (e.g. brand names, tech stack) untranslated
- Use professional, natural language appropriate for job postings
- For Arabic, use Modern Standard Arabic
- For Chinese, use Simplified Chinese`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
        }),
      }
    );

    const geminiData = await geminiResponse.json();
    const responseText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: 'Failed to parse translations', raw: responseText }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const translations = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ translations }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
