import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateGeminiChat, extractJSON } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: authUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authUser.id;

    // Use service role for cross-table operations
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Get candidate - first get profile, then candidate
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, full_name, latitude, longitude")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: candidate } = await adminClient
      .from("candidates")
      .select("*")
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (!candidate) {
      return new Response(JSON.stringify({ error: "Candidate not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get preferences
    const { data: prefs } = await adminClient
      .from("auto_apply_preferences")
      .select("*")
      .eq("candidate_id", candidate.id)
      .maybeSingle();

    if (!prefs?.is_enabled) {
      return new Response(
        JSON.stringify({ message: "Auto-apply is not enabled", applied: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Count today's auto-applies
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: todayCount } = await adminClient
      .from("auto_apply_logs")
      .select("*", { count: "exact", head: true })
      .eq("candidate_id", candidate.id)
      .eq("status", "applied")
      .gte("created_at", todayStart.toISOString());

    const remaining = prefs.daily_limit - (todayCount || 0);
    if (remaining <= 0) {
      return new Response(
        JSON.stringify({ message: "Daily limit reached", applied: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get already-applied job IDs
    const { data: existingApps } = await adminClient
      .from("applications")
      .select("job_id")
      .eq("candidate_id", candidate.id);
    const appliedJobIds = new Set((existingApps || []).map((a: any) => a.job_id));

    // Get excluded company names (lowercase)
    const excludedCompanies = (prefs.excluded_companies || []).map((c: string) =>
      c.toLowerCase()
    );

    // Fetch open jobs
    let jobQuery = adminClient
      .from("jobs")
      .select("*, employers!jobs_employer_id_fkey(company_name, team_size, industry)")
      .eq("is_active", true)
      .eq("status", "open")
      .limit(50);

    const { data: jobs } = await jobQuery;
    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ message: "No open jobs found", applied: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter out already-applied and excluded, log skip reasons
    let skippedAlready = 0, skippedExcluded = 0, skippedRemote = 0;
    const eligibleJobs = jobs.filter((job: any) => {
      if (appliedJobIds.has(job.id)) { skippedAlready++; return false; }
      const companyName = job.employers?.company_name?.toLowerCase() || "";
      if (excludedCompanies.some((exc: string) => companyName.includes(exc))) { skippedExcluded++; return false; }
      // Remote filter - check job_type, title, and description for remote indicators
      if (prefs.remote_only) {
        const isRemote = /remote/i.test(job.job_type || "") || 
                         /remote/i.test(job.title || "") || 
                         /remote/i.test(job.description || "") ||
                         /work.from.home/i.test(job.description || "");
        if (!isRemote) { skippedRemote++; return false; }
      }
      return true;
    });

    console.log(`Jobs: ${jobs.length} total, ${eligibleJobs.length} eligible. Skipped: ${skippedAlready} already applied, ${skippedExcluded} excluded companies, ${skippedRemote} not remote`);

    if (eligibleJobs.length === 0) {
      return new Response(
        JSON.stringify({
          message: `No matching jobs found. ${skippedAlready} already applied, ${skippedExcluded} excluded, ${skippedRemote} not remote.`,
          applied: 0,
          details: { total: jobs.length, skippedAlready, skippedExcluded, skippedRemote },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: any[] = [];
    let appliedCount = 0;

    for (const job of eligibleJobs) {
      if (appliedCount >= remaining) break;

      try {
        // Calculate match score via Gemini
        const matchPrompt = `You are a job matching AI. Score how well this candidate matches this job from 0-100.

CANDIDATE:
- Name: ${profile.full_name || "Unknown"}
- Title: ${candidate.job_title}
- Skills: ${(candidate.skills || []).join(", ")}
- Experience: ${candidate.experience_years || 0} years
- Preferred Locations: ${(prefs.preferred_locations || []).join(", ")}
- Preferred Titles: ${(prefs.preferred_titles || []).join(", ")}
- Focus Skills: ${(prefs.focus_skills || []).join(", ")}

JOB:
- Title: ${job.title}
- Company: ${job.employers?.company_name || "Unknown"}
- Skills Required: ${(job.skills || []).join(", ")}
- Location: ${job.location_city || ""}, ${job.location_state || ""}
- Salary: ${job.salary_range || "Not specified"}
- Type: ${job.job_type || "Not specified"}
- Experience: ${job.min_experience || 0}-${job.max_experience || "any"} years

Return ONLY valid JSON: {"score": <number 0-100>, "reasons": ["reason1", "reason2"]}`;

        const matchResponse = await generateGeminiChat({
          messages: [
            { role: "system", content: "You are a precise job matching scorer. Return only valid JSON." },
            { role: "user", content: matchPrompt },
          ],
          temperature: 0.3,
        });

        const matchResult = extractJSON<{ score: number; reasons: string[] }>(matchResponse);
        const score = Math.min(100, Math.max(0, matchResult.score));

        if (score < prefs.match_threshold) {
          // Log as skipped
          await adminClient.from("auto_apply_logs").insert({
            candidate_id: candidate.id,
            job_id: job.id,
            match_score: score,
            status: "skipped",
            skip_reason: `Score ${score}% below threshold ${prefs.match_threshold}%`,
          });
          continue;
        }

        // Salary check
        if (prefs.min_salary && job.salary_range) {
          const salaryNum = parseInt(job.salary_range.replace(/[^0-9]/g, ""));
          const minSalaryNum = parseInt(prefs.min_salary.replace(/[^0-9]/g, ""));
          if (salaryNum > 0 && minSalaryNum > 0 && salaryNum < minSalaryNum) {
            await adminClient.from("auto_apply_logs").insert({
              candidate_id: candidate.id,
              job_id: job.id,
              match_score: score,
              status: "skipped",
              skip_reason: "Salary below minimum",
            });
            continue;
          }
        }

        // Generate cover letter if enabled
        let coverLetter: string | null = null;
        if (prefs.generate_cover_letter) {
          const clPrompt = `Write a brief, professional cover letter (150 words max) for this candidate applying to this job.
Candidate: ${profile.full_name}, ${candidate.job_title}, Skills: ${(candidate.skills || []).join(", ")}
Job: ${job.title} at ${job.employers?.company_name}
Description: ${(job.description || "").substring(0, 500)}

Write naturally, no placeholders. Start with "Dear Hiring Manager,".`;

          coverLetter = await generateGeminiChat({
            messages: [
              { role: "system", content: "Write concise, professional cover letters." },
              { role: "user", content: clPrompt },
            ],
            temperature: 0.7,
          });
        }

        // Insert application
        const { data: application, error: appError } = await adminClient
          .from("applications")
          .insert({
            candidate_id: candidate.id,
            job_id: job.id,
            status: "pending",
            cover_letter: coverLetter,
          })
          .select("id")
          .single();

        if (appError) {
          await adminClient.from("auto_apply_logs").insert({
            candidate_id: candidate.id,
            job_id: job.id,
            match_score: score,
            status: "failed",
            skip_reason: appError.message,
          });
          continue;
        }

        // Log success
        await adminClient.from("auto_apply_logs").insert({
          candidate_id: candidate.id,
          job_id: job.id,
          match_score: score,
          cover_letter: coverLetter,
          application_id: application.id,
          status: "applied",
        });

        // Create notification
        await adminClient.from("notifications").insert({
          user_id: userId,
          type: "auto_apply",
          title: "Auto Applied",
          message: `Applied to "${job.title}" at ${job.employers?.company_name} (${score}% match)`,
          link: "/candidate-dashboard",
        });

        appliedCount++;
        results.push({
          job_id: job.id,
          title: job.title,
          company: job.employers?.company_name,
          score,
        });
      } catch (err) {
        console.error(`Error processing job ${job.id}:`, err);
        await adminClient.from("auto_apply_logs").insert({
          candidate_id: candidate.id,
          job_id: job.id,
          match_score: 0,
          status: "failed",
          skip_reason: String(err),
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Auto-applied to ${appliedCount} job(s)`,
        applied: appliedCount,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Auto-apply error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
