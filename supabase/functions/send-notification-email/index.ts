import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, title, message, type } = await req.json();

    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check user email notification preferences
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    // Default to enabled if no preferences set
    const emailEnabled = prefs?.email_notifications_enabled ?? true;

    if (!emailEnabled) {
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

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
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
        from: 'Hire for Job <notifications@hireforjob1.lovable.app>',
        to: [email],
        subject: title,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #4285F4; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 20px;">Hire for Job</h1>
            </div>
            <div style="background: #f8f9fa; padding: 24px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
              <h2 style="color: #202124; margin-top: 0;">${title}</h2>
              ${message ? `<p style="color: #5f6368; line-height: 1.6;">${message}</p>` : ''}
              <a href="https://hireforjob1.lovable.app" style="display: inline-block; background: #4285F4; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
                View in Dashboard
              </a>
            </div>
            <p style="color: #9aa0a6; font-size: 12px; text-align: center; margin-top: 16px;">
              You can manage your notification preferences in your dashboard settings.
            </p>
          </div>
        `,
      }),
    });

    const result = await emailResponse.json();

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
