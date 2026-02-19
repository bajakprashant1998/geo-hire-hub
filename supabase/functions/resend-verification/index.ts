import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { email, options } = await req.json();

        if (!email) {
            throw new Error("Missing required field: email");
        }

        // 1. Generate the signup link (which acts as verification for unverified users)
        // We use generateLink with type 'signup' again.
        // Note: We don't have the password involved here, so we actually want to generate a 'magiclink' or 'signup' link?
        // 'signup' link usually requires password. 'magiclink' doesn't.
        // But we want them to just verify.
        // Actually, 'signup' type in generateLink creates a confirmation audit log.
        // If the user already exists, 'signup' link sends a "fake" link? No, admin generateLink works.

        // BETTER APPROACH: Use 'magiclink' type if we just want them to log in / verify?
        // No, we want to VERIFY the email.
        // 'signup' type checks if user is confirmed?
        // Let's use 'magiclink' (login link) for resending? That logs them in, which effectively verifies?
        // Or 'invite'?

        // Correct approach for existing unverified user:
        // generateLink({ type: 'signup', email, password: ... }) requires password? 
        // Docs say: "If you want to generate a link for a user that already exists, use type: 'magiclink' or 'recovery' or 'invite'."
        // But 'signup' is for new users.

        // If we want to resend the *verification* email, and we don't know the password...
        // We should probably use 'magiclink' which will log them in and confirm their email if not confirmed.

        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: "magiclink",
            email,
            options: {
                redirectTo: options?.emailRedirectTo || "https://hireforjob.com/login",
            }
        });

        if (linkError) throw linkError;

        // 2. Send the custom email via Resend
        const verificationLink = linkData.properties.action_link;

        const emailResponse = await resend.emails.send({
            from: "Hire for Job <noreply@hireforjob.com>",
            to: [email],
            subject: "Verify Your Email - Hire for Job",
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px 40px; text-align: center;">
                      <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 16px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                        <span style="color: white; font-size: 28px; font-weight: bold;">H</span>
                      </div>
                      <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #1e293b;">
                        Verify Your Email
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 0 40px 30px 40px;">
                      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 26px; color: #475569;">
                        Hi there,
                      </p>
                      <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 26px; color: #475569;">
                        We received a request to resend your verification email. Click the button below to verify your email and sign in.
                      </p>
                      
                      <!-- Button -->
                      <table role="presentation" style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td align="center">
                            <a href="${verificationLink}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 12px; box-shadow: 0 4px 14px 0 rgba(59, 130, 246, 0.4);">
                              Verify My Email
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 30px 0 0 0; font-size: 14px; line-height: 24px; color: #64748b;">
                        If the button doesn't work, copy and paste this link into your browser:
                      </p>
                      <p style="margin: 10px 0 0 0; font-size: 12px; line-height: 20px; color: #94a3b8; word-break: break-all;">
                        ${verificationLink}
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f8fafc; border-radius: 0 0 16px 16px;">
                      <p style="margin: 0 0 10px 0; font-size: 14px; color: #64748b; text-align: center;">
                        This link will expire in 24 hours.
                      </p>
                      <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
                        If you didn't request this email, you can safely ignore it.
                      </p>
                    </td>
                  </tr>
                </table>
                
                <!-- Legal Footer -->
                <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; margin-top: 20px;">
                  <tr>
                    <td style="padding: 0 40px; text-align: center;">
                      <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                        © ${new Date().getFullYear()} Hire for Job. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
        });

        console.log("Resend verification email sent successfully:", emailResponse);

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
        });

    } catch (error: any) {
        console.error("Error in resend-verification:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 400,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            }
        );
    }
};

serve(handler);
