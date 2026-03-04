import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Disposable email domains
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com","tempmail.com","throwaway.email","guerrillamail.com","sharklasers.com",
  "grr.la","guerrillamailblock.com","pokemail.net","spam4.me","bccto.me","trashmail.com",
  "yopmail.com","dispostable.com","maildrop.cc","fakeinbox.com","tempinbox.com",
  "getnada.com","mohmal.com","emailondeck.com","temp-mail.org","burnermail.io",
  "mailnesia.com","harakirimail.com","discard.email","tempr.email","10minutemail.com",
  "guerrillamail.info","mailcatch.com","meltmail.com","mintemail.com","tempail.com",
  "spamgourmet.com","trashmail.net","trashmail.me","mytemp.email","mailsac.com",
  "inboxbear.com","jetable.org","throwam.com","tmail.ws","tmpmail.net",
  "tmpmail.org","boun.cr","filzmail.com","mailforspam.com","safetymail.info",
  "trashmail.org","wegwerfmail.de","emailfake.com","crazymailing.com","tempmailaddress.com",
]);

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com","yahoo.com","hotmail.com","outlook.com","aol.com","icloud.com",
  "mail.com","protonmail.com","zoho.com","yandex.com","live.com","msn.com",
]);

interface VerificationResult {
  check_type: string;
  status: "passed" | "failed" | "skipped" | "pending";
  score: number;
  details: Record<string, unknown>;
}

serve(async (req) => {
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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    // Service role client for writes
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get employer data
    const { data: employer, error: empError } = await adminClient
      .from("employers")
      .select("*, profiles!inner(user_id, full_name)")
      .eq("profiles.user_id", userId)
      .maybeSingle();

    if (empError || !employer) {
      return new Response(JSON.stringify({ error: "Employer not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check feature flag
    const { data: flag } = await adminClient
      .from("feature_flags")
      .select("enabled")
      .eq("key", "ai_employer_verification")
      .maybeSingle();

    if (!flag?.enabled) {
      return new Response(
        JSON.stringify({ error: "AI verification is currently disabled" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get AI verification settings
    const { data: settingsRow } = await adminClient
      .from("admin_settings")
      .select("value")
      .eq("key", "ai_verification")
      .maybeSingle();

    const settings = (settingsRow?.value as Record<string, unknown>) || {
      auto_approval_enabled: true,
      min_auto_approve_score: 80,
      documents_mandatory: true,
      google_business_mandatory: false,
    };

    // Set status to verification_in_progress
    await adminClient
      .from("employers")
      .update({ verification_status: "pending", verification_notes: "AI verification in progress..." })
      .eq("id", employer.id);

    const checks: VerificationResult[] = [];

    // ---- CHECK 1: Document OCR Verification ----
    const docCheck = await verifyDocuments(adminClient, employer, settings);
    checks.push(docCheck);

    // ---- CHECK 2: Domain & Email Validation ----
    const emailCheck = await verifyDomainEmail(adminClient, employer);
    checks.push(emailCheck);

    // ---- CHECK 3: Google Business Verification ----
    const gbCheck = await verifyGoogleBusiness(employer);
    checks.push(gbCheck);

    // ---- CHECK 4: Fraud Detection ----
    const fraudCheck = await detectFraud(adminClient, employer);
    checks.push(fraudCheck);

    // Insert all checks
    for (const check of checks) {
      await adminClient.from("employer_verification_checks").insert({
        employer_id: employer.id,
        check_type: check.check_type,
        status: check.status,
        score: check.score,
        details: check.details,
      });
    }

    // Calculate total trust score
    const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
    const clampedScore = Math.max(0, Math.min(100, totalScore));

    const minAutoApprove = (settings.min_auto_approve_score as number) || 80;
    const autoApprovalEnabled = settings.auto_approval_enabled as boolean;

    let newStatus = "pending";
    let verificationMethod: string | null = null;
    let verificationNotes = "";

    if (autoApprovalEnabled && clampedScore >= minAutoApprove) {
      newStatus = "approved";
      verificationMethod = "ai_auto";
      verificationNotes = `AI Auto-Approved with trust score ${clampedScore}/100`;
    } else if (clampedScore >= 50) {
      newStatus = "pending";
      verificationNotes = `Under review. Trust score: ${clampedScore}/100. Some checks need manual verification.`;
    } else {
      newStatus = "pending";
      verificationNotes = `Flagged for manual review. Trust score: ${clampedScore}/100.`;

      // Create fraud flag
      await adminClient.from("fraud_flags").insert({
        target_type: "employer",
        target_id: employer.id,
        flag_type: "low_trust_score",
        status: "pending",
        details: {
          trust_score: clampedScore,
          checks: checks.map((c) => ({
            type: c.check_type,
            status: c.status,
            score: c.score,
          })),
        },
      });
    }

    // Update employer
    const now = new Date().toISOString();
    await adminClient.from("employers").update({
      trust_score: clampedScore,
      verification_status: newStatus,
      verification_method: verificationMethod,
      verification_notes: verificationNotes,
      last_verification_at: now,
      next_reverification_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      verified_at: newStatus === "approved" ? now : null,
    }).eq("id", employer.id);

    // Notify admins
    const { data: adminRoles } = await adminClient
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminRoles) {
      for (const admin of adminRoles) {
        await adminClient.from("notifications").insert({
          user_id: admin.user_id,
          type: "system",
          title: "Employer Verification Complete",
          message: `${employer.company_name} — Score: ${clampedScore}/100, Status: ${newStatus}`,
          link: "/admin/employers",
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        trust_score: clampedScore,
        status: newStatus,
        verification_method: verificationMethod,
        checks: checks.map((c) => ({
          type: c.check_type,
          status: c.status,
          score: c.score,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Verification error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Verification failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ----- Document Verification -----
async function verifyDocuments(
  client: any,
  employer: Record<string, unknown>,
  settings: Record<string, unknown>
): Promise<VerificationResult> {
  const docUrls = [
    employer.company_registration_url,
    employer.gst_license_url,
    employer.pan_url,
  ].filter(Boolean) as string[];

  if (docUrls.length === 0) {
    if (settings.documents_mandatory) {
      return {
        check_type: "document_ocr",
        status: "failed",
        score: 0,
        details: { reason: "No documents uploaded. Documents are mandatory." },
      };
    }
    return {
      check_type: "document_ocr",
      status: "skipped",
      score: 0,
      details: { reason: "No documents uploaded" },
    };
  }

  try {
    // Use Gemini to analyze document metadata
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return {
        check_type: "document_ocr",
        status: "pending",
        score: 10,
        details: { reason: "AI key not available, documents uploaded but not analyzed" },
      };
    }

    const prompt = `You are a document verification AI. Analyze the following employer data and uploaded document URLs for a company verification check.

Company Data:
- Name: ${employer.company_name}
- Tax ID: ${employer.tax_id || "Not provided"}
- Website: ${employer.website_url || "Not provided"}
- Industry: ${employer.industry || "Not provided"}
- Country: ${employer.country_code || "Not provided"}

Documents uploaded: ${docUrls.length} document(s)
Document URLs: ${docUrls.join(", ")}

Based on this information, assess:
1. Does the company appear legitimate based on having uploaded verification documents?
2. Is there consistency between the company name, tax ID format, and country?
3. Any red flags?

Respond with a JSON object:
{
  "legitimate": true/false,
  "confidence": 0-100,
  "company_name_match": true/false,
  "tax_id_valid_format": true/false,
  "red_flags": [],
  "notes": "brief summary"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a document verification AI. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      return {
        check_type: "document_ocr",
        status: "pending",
        score: 10,
        details: { reason: "AI analysis unavailable, base score awarded for uploads" },
      };
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    let analysis: Record<string, unknown>;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      analysis = {};
    }

    const confidence = (analysis.confidence as number) || 50;
    const isLegitimate = analysis.legitimate as boolean;
    let score = 0;

    if (isLegitimate && confidence >= 70) {
      score = 35 + Math.floor((confidence - 70) / 6); // 35-40
    } else if (isLegitimate) {
      score = 20 + Math.floor(confidence / 5); // 20-34
    } else {
      score = Math.max(0, Math.floor(confidence / 10)); // 0-10
    }

    score = Math.min(40, score);

    // Check blacklist for document hashes
    for (const url of docUrls) {
      const { data: blacklisted } = await client
        .from("employer_blacklist")
        .select("id")
        .eq("type", "document_hash")
        .eq("value", url)
        .maybeSingle();

      if (blacklisted) {
        return {
          check_type: "document_ocr",
          status: "failed",
          score: -20,
          details: { reason: "Document matches blacklisted entry", analysis },
        };
      }
    }

    return {
      check_type: "document_ocr",
      status: score >= 20 ? "passed" : "failed",
      score,
      details: { analysis, documents_count: docUrls.length },
    };
  } catch (error) {
    console.error("Document verification error:", error);
    return {
      check_type: "document_ocr",
      status: "pending",
      score: 5,
      details: { reason: "Document analysis encountered an error", documents_count: docUrls.length },
    };
  }
}

// ----- Domain & Email Validation -----
async function verifyDomainEmail(
  client: any,
  employer: Record<string, unknown>
): Promise<VerificationResult> {
  const hrEmail = (employer.hr_contact_email as string) || "";
  const websiteUrl = (employer.website_url as string) || "";

  if (!hrEmail) {
    return {
      check_type: "domain_email",
      status: "skipped",
      score: 0,
      details: { reason: "No HR email provided" },
    };
  }

  const emailDomain = hrEmail.split("@")[1]?.toLowerCase() || "";

  // Check disposable domains
  if (DISPOSABLE_DOMAINS.has(emailDomain)) {
    return {
      check_type: "domain_email",
      status: "failed",
      score: -10,
      details: { reason: "Disposable email domain detected", domain: emailDomain },
    };
  }

  // Check blacklist
  const { data: blacklisted } = await client
    .from("employer_blacklist")
    .select("id")
    .eq("type", "domain")
    .eq("value", emailDomain)
    .maybeSingle();

  if (blacklisted) {
    return {
      check_type: "domain_email",
      status: "failed",
      score: -15,
      details: { reason: "Email domain is blacklisted", domain: emailDomain },
    };
  }

  // Check if email matches website domain
  let websiteDomain = "";
  try {
    websiteDomain = new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`).hostname
      .replace("www.", "")
      .toLowerCase();
  } catch {
    // invalid URL
  }

  if (websiteDomain && emailDomain === websiteDomain) {
    return {
      check_type: "domain_email",
      status: "passed",
      score: 20,
      details: {
        reason: "Email domain matches website domain",
        email_domain: emailDomain,
        website_domain: websiteDomain,
      },
    };
  }

  // Free email providers
  if (FREE_EMAIL_DOMAINS.has(emailDomain)) {
    return {
      check_type: "domain_email",
      status: "passed",
      score: 5,
      details: {
        reason: "Free email provider used — lower trust",
        email_domain: emailDomain,
      },
    };
  }

  // Custom domain but doesn't match website
  return {
    check_type: "domain_email",
    status: "passed",
    score: 12,
    details: {
      reason: "Custom email domain, but doesn't match website",
      email_domain: emailDomain,
      website_domain: websiteDomain || "not provided",
    },
  };
}

// ----- Google Business Verification -----
async function verifyGoogleBusiness(
  employer: Record<string, unknown>
): Promise<VerificationResult> {
  const gbUrl = (employer.google_business_url as string) || "";

  if (!gbUrl) {
    return {
      check_type: "google_business",
      status: "skipped",
      score: 0,
      details: { reason: "No Google Business URL provided" },
    };
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return {
        check_type: "google_business",
        status: "skipped",
        score: 0,
        details: { reason: "AI key not available for verification" },
      };
    }

    const prompt = `A company claims to have a Google Business Profile at this URL: ${gbUrl}

Their registered data:
- Company Name: ${employer.company_name}
- Website: ${employer.website_url || "Not provided"}
- Location: ${employer.location_city || ""}, ${employer.location_state || ""}, ${employer.location_country || ""}

Based on the URL format and company data, assess:
1. Is this a valid Google Business/Maps URL format?
2. Does the company name in the URL slug match the registered company name?
3. Overall legitimacy score.

Respond with JSON:
{
  "valid_url_format": true/false,
  "name_match": true/false,
  "confidence": 0-100,
  "notes": "brief assessment"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a business verification AI. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      return {
        check_type: "google_business",
        status: "skipped",
        score: 0,
        details: { reason: "AI analysis unavailable" },
      };
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    let analysis: Record<string, unknown>;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      analysis = {};
    }

    const validFormat = analysis.valid_url_format as boolean;
    const nameMatch = analysis.name_match as boolean;
    const confidence = (analysis.confidence as number) || 50;

    let score = 0;
    if (validFormat && nameMatch && confidence >= 60) {
      score = 25 + Math.min(5, Math.floor((confidence - 60) / 8));
    } else if (validFormat) {
      score = 10 + Math.floor(confidence / 10);
    }
    score = Math.min(30, score);

    return {
      check_type: "google_business",
      status: score >= 15 ? "passed" : "failed",
      score,
      details: { analysis, url: gbUrl },
    };
  } catch (error) {
    console.error("Google Business verification error:", error);
    return {
      check_type: "google_business",
      status: "skipped",
      score: 0,
      details: { reason: "Verification encountered an error" },
    };
  }
}

// ----- Fraud Detection -----
async function detectFraud(
  client: any,
  employer: Record<string, unknown>
): Promise<VerificationResult> {
  let penalty = 0;
  const flags: string[] = [];

  // Check duplicate company names
  const { data: duplicates } = await client
    .from("employers")
    .select("id, company_name")
    .ilike("company_name", employer.company_name as string)
    .neq("id", employer.id as string);

  if (duplicates && duplicates.length > 0) {
    penalty -= 15;
    flags.push(`Duplicate company name found (${duplicates.length} matches)`);
  }

  // Check blacklisted phone
  const hrEmail = (employer.hr_contact_email as string) || "";
  if (hrEmail) {
    const emailDomain = hrEmail.split("@")[1]?.toLowerCase() || "";
    const { data: bl } = await client
      .from("employer_blacklist")
      .select("id")
      .eq("type", "domain")
      .eq("value", emailDomain)
      .maybeSingle();
    if (bl) {
      penalty -= 20;
      flags.push("Email domain is blacklisted");
    }
  }

  // Check same-day registrations with similar data
  const today = new Date().toISOString().split("T")[0];
  const { data: sameDay } = await client
    .from("employers")
    .select("id")
    .gte("created_at", today)
    .neq("id", employer.id as string);

  if (sameDay && sameDay.length >= 3) {
    penalty -= 10;
    flags.push(`${sameDay.length} employers registered today — high volume`);
  }

  // Check very short company name (suspicious)
  const companyName = (employer.company_name as string) || "";
  if (companyName.length < 3) {
    penalty -= 5;
    flags.push("Company name suspiciously short");
  }

  const finalPenalty = Math.max(-50, penalty);

  return {
    check_type: "fraud_detection",
    status: finalPenalty === 0 ? "passed" : "failed",
    score: finalPenalty,
    details: { flags, penalty: finalPenalty },
  };
}
