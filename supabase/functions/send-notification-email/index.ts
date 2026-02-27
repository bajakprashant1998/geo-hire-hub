import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BRANDED_WRAPPER = (content: string, ctaUrl: string, ctaText: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr><td style="background:#4285F4;padding:24px 32px;border-radius:12px 12px 0 0;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Hire for Job</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="background:#ffffff;padding:32px;border:1px solid #e5e7eb;border-top:none;">
          ${content}
          ${ctaUrl ? `
          <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr><td style="background:#4285F4;border-radius:8px;padding:14px 28px;">
              <a href="${ctaUrl}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;display:inline-block;">${ctaText}</a>
            </td></tr>
          </table>` : ''}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 32px;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">
            You're receiving this because you have an account on Hire for Job.<br/>
            <a href="https://hireforjob1.lovable.app/candidate-settings" style="color:#6b7280;text-decoration:underline;">Manage notification preferences</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const body = await req.json();
    
    // Support both old format {user_id, title, message} and new {user_id, template_key, variables}
    const user_id = body.user_id;
    const template_key = body.template_key;
    const variables: Record<string, string> = body.variables || {};

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'Missing user_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check notification preferences
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('email_notifications_enabled')
      .eq('user_id', user_id)
      .maybeSingle();

    if (prefs?.email_notifications_enabled === false) {
      return new Response(JSON.stringify({ skipped: true, reason: 'Email notifications disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user email
    const { data: userData } = await supabase.auth.admin.getUserById(user_id);
    const email = userData?.user?.email;
    if (!email) {
      return new Response(JSON.stringify({ error: 'User email not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's name for fallback variables
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user_id)
      .maybeSingle();

    const userName = profile?.full_name || email.split('@')[0];

    let subject: string;
    let htmlContent: string;
    let ctaUrl = variables.link || 'https://hireforjob1.lovable.app';
    let ctaText = 'View in Dashboard';

    if (template_key) {
      // Fetch template from DB
      const { data: template, error: tplError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('template_key', template_key)
        .eq('is_active', true)
        .maybeSingle();

      if (tplError || !template) {
        // Log failure
        await supabase.from('email_logs').insert({
          template_key: template_key || 'unknown',
          recipient_email: email,
          recipient_user_id: user_id,
          subject: 'N/A',
          status: 'failed',
          error_message: `Template "${template_key}" not found or inactive`,
        });
        return new Response(JSON.stringify({ error: `Template "${template_key}" not found` }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Replace variables in subject and body
      subject = template.subject;
      htmlContent = template.html_body;

      // Add default variables
      const allVars: Record<string, string> = {
        recipient_name: userName,
        candidate_name: userName,
        employer_name: userName,
        ...variables,
      };

      for (const [key, value] of Object.entries(allVars)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        subject = subject.replace(regex, value);
        htmlContent = htmlContent.replace(regex, value);
      }

      // Set CTA based on template type
      const ctaMap: Record<string, { url: string; text: string }> = {
        'application_received': { url: '/employer-dashboard', text: 'View Candidate' },
        'application_status': { url: '/candidate-dashboard', text: 'View Application' },
        'job_application_submitted': { url: '/candidate-dashboard', text: 'View Application' },
        'interview_scheduled': { url: '/candidate-dashboard', text: 'View Interview Details' },
        'interview_request': { url: '/employer-dashboard', text: 'Schedule Interview' },
        'new_message': { url: '/messages', text: 'View Message' },
        'welcome': { url: '/candidate-dashboard', text: 'Get Started' },
        'employer_welcome': { url: '/employer-dashboard', text: 'Complete Your Profile' },
        'job_post_approved': { url: '/employer-dashboard', text: 'View Job Post' },
      };

      const cta = ctaMap[template_key];
      if (cta) {
        ctaUrl = variables.link || `https://hireforjob1.lovable.app${cta.url}`;
        ctaText = cta.text;
      }
    } else {
      // Legacy format fallback
      subject = body.title || 'Notification from Hire for Job';
      htmlContent = `<h2 style="color:#111827;margin:0 0 12px;">${body.title || ''}</h2>
        ${body.message ? `<p style="color:#4b5563;line-height:1.6;margin:0;">${body.message}</p>` : ''}`;
    }

    // Wrap in branded template
    const finalHtml = BRANDED_WRAPPER(htmlContent, ctaUrl, ctaText);

    // Send via Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      await supabase.from('email_logs').insert({
        template_key: template_key || 'legacy',
        recipient_email: email,
        recipient_user_id: user_id,
        subject,
        status: 'failed',
        error_message: 'RESEND_API_KEY not configured',
      });
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Hire for Job <noreply@hireforjob.com>',
        to: [email],
        subject,
        html: finalHtml,
      }),
    });

    const result = await emailResponse.json();

    // Log the attempt
    await supabase.from('email_logs').insert({
      template_key: template_key || 'legacy',
      recipient_email: email,
      recipient_user_id: user_id,
      subject,
      status: emailResponse.ok ? 'sent' : 'failed',
      error_message: emailResponse.ok ? null : JSON.stringify(result),
      metadata: { resend_id: result.id || null },
    });

    return new Response(JSON.stringify({ success: emailResponse.ok, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
