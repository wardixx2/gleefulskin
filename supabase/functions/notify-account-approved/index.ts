import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function approvalEmailHtml({ fullName, loginUrl }) {
  const name = fullName || "there";
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:24px;background:#fff7f7;font-family:Arial,sans-serif;color:#2c2520;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px;border:1px solid #f3d6d6;">
      <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.12em;color:#b76e79;font-weight:700;">GLEEFUL</p>
      <h1 style="margin:0 0 12px;font-size:22px;color:#8b3a48;">Your account is approved</h1>
      <p style="margin:0 0 16px;line-height:1.6;">Hi ${name},</p>
      <p style="margin:0 0 16px;line-height:1.6;">
        An administrator has approved your Gleeful Skin Wellness Center account.
        You can now log in and book appointments.
      </p>
      <p style="margin:24px 0;">
        <a href="${loginUrl}" style="display:inline-block;background:#b76e79;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:8px;">
          Log in to your account
        </a>
      </p>
      <p style="margin:0;font-size:13px;color:#777777;line-height:1.5;">
        Use the email and password you registered with. If the button does not work, open:<br />
        ${loginUrl}
      </p>
    </div>
  </body>
</html>`;
}

async function sendWithResend({ to, fullName, loginUrl }) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return { sent: false, provider: null };

  const from = Deno.env.get("RESEND_FROM") || "Gleeful <beth.t@example.com>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Your Gleeful account is approved — you can log in now",
      html: approvalEmailHtml({ fullName, loginUrl }),
      text: `Hi ${fullName || "there"}, your Gleeful account has been approved. Log in at ${loginUrl}`,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Resend failed: ${details}`);
  }

  return { sent: true, provider: "resend" };
}

async function sendLoginEmailViaAuth({ email, loginUrl }) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const response = await fetch(
    `${supabaseUrl}/auth/v1/otp?redirect_to=${encodeURIComponent(loginUrl)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        email,
        create_user: false,
      }),
    }
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Auth email failed: ${details}`);
  }

  return { sent: true, provider: "supabase-auth" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401);
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: adminCheck, error: adminError } = await supabase.rpc("is_admin_user");
    if (adminError || !adminCheck) {
      return json({ error: "Not authorized" }, 403);
    }

    const { email, fullName, loginUrl } = await req.json();
    const to = String(email || "").trim().toLowerCase();

    if (!to || !to.includes("@")) {
      return json({ error: "A valid user email is required" }, 400);
    }

    const appLoginUrl =
      String(loginUrl || "").trim() || "https://gleefulskin-main.pages.dev/login";

    try {
      const resend = await sendWithResend({
        to,
        fullName,
        loginUrl: appLoginUrl,
      });
      if (resend.sent) {
        return json({ ok: true, provider: resend.provider });
      }
    } catch (resendError) {
      console.error(resendError);
    }

    const fallback = await sendLoginEmailViaAuth({
      email: to,
      loginUrl: appLoginUrl,
    });

    return json({ ok: true, provider: fallback.provider });
  } catch (error) {
    console.error(error);
    return json({ error: error.message || "Failed to send approval email" }, 500);
  }
});
