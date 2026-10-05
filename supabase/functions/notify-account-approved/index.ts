import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LIVE_LOGIN_URL = "https://wardixx2.github.io/gleefulskin/login";
const DEFAULT_SMTP_USER = "gleefulskinwellnesscentercaste@gmail.com";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function brandedEmailHtml({ eyebrow, title, greeting, paragraphs, buttonLabel, loginUrl }) {
  const body = paragraphs
    .map(
      (text) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#5a3a3a;">${text}</p>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#fff7f5;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff7f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#8b4a55;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 20px;text-align:center;">
                <p style="margin:0;font-size:18px;letter-spacing:0.12em;font-weight:700;color:#ffffff;">GLEEFUL</p>
                <p style="margin:4px 0 0;font-size:12px;color:#f3d6d6;">Skin Wellness Center</p>
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff;padding:32px 28px 28px;">
                <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;color:#d4af37;">${escapeHtml(eyebrow)}</p>
                <h1 style="margin:0 0 14px;font-size:24px;line-height:1.3;color:#8b3a48;">${escapeHtml(title)}</h1>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#5a3a3a;">Hi ${escapeHtml(greeting)},</p>
                ${body}
                <p style="margin:24px 0;">
                  <a href="${escapeHtml(loginUrl)}" style="display:inline-block;background:#b76e79;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:8px;">
                    ${escapeHtml(buttonLabel)}
                  </a>
                </p>
                <p style="margin:0;font-size:13px;color:#777777;line-height:1.5;">
                  If the button does not work, open:<br />${escapeHtml(loginUrl)}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function signupContent({ fullName, loginUrl }) {
  const name = fullName || "there";
  return {
    subject: "Thank you for creating an account at Gleeful",
    text: `Hi ${name}, thank you for creating an account at Gleeful Skin Wellness Center. Please wait while an administrator approves your account. After approval, sign in at ${loginUrl}`,
    html: brandedEmailHtml({
      eyebrow: "WELCOME",
      title: "Thank you for creating an account",
      greeting: name,
      paragraphs: [
        "Thank you for creating an account at Gleeful Skin Wellness Center.",
        "Please wait a moment while an administrator reviews and approves your account. You will receive another email when you can log in.",
      ],
      buttonLabel: "Go to Gleeful",
      loginUrl,
    }),
  };
}

function approvalContent({ fullName, loginUrl }) {
  const name = fullName || "there";
  return {
    subject: "Your Gleeful account is approved — you can log in now",
    text: `Hi ${name}, your Gleeful account has been approved. Log in at ${loginUrl}`,
    html: brandedEmailHtml({
      eyebrow: "APPROVED",
      title: "Your account is approved",
      greeting: name,
      paragraphs: [
        "An administrator has approved your Gleeful Skin Wellness Center account.",
        "You can now log in and book appointments using the email and password you registered with.",
      ],
      buttonLabel: "Log in to your account",
      loginUrl,
    }),
  };
}

function testContent({ loginUrl }) {
  return {
    subject: "Gleeful mail test",
    text: `This is a test email from Gleeful. Login page: ${loginUrl}`,
    html: brandedEmailHtml({
      eyebrow: "TEST",
      title: "Mail is working",
      greeting: "Admin",
      paragraphs: [
        "Gleeful can send email with the Gmail settings saved in Admin Settings.",
        "Signup and account-approved messages will use this same sender.",
      ],
      buttonLabel: "Open login",
      loginUrl,
    }),
  };
}

function safeLoginUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    const host = url.hostname;
    if (url.protocol !== "https:") return LIVE_LOGIN_URL;
    if (host === "localhost" || host === "127.0.0.1") return LIVE_LOGIN_URL;
    return url.toString();
  } catch {
    return LIVE_LOGIN_URL;
  }
}

function callerEmail(authHeader) {
  try {
    const token = String(authHeader || "").replace(/^Bearer\s+/i, "");
    const payload = JSON.parse(atob(token.split(".")[1]));
    return String(payload.email || "").trim().toLowerCase();
  } catch {
    return "";
  }
}

function adminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(supabaseUrl, serviceKey);
}

async function confirmAuthUserByEmail(email) {
  const admin = adminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (!profile?.id) return;

  const { error } = await admin.auth.admin.updateUserById(profile.id, {
    email_confirm: true,
  });

  if (error) {
    throw error;
  }
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
    }),
  ]);
}

function explainMailError(message) {
  const text = String(message || "");
  if (/username and password not accepted|application-specific password|invalid login|535/i.test(text)) {
    return "Gmail rejected the login. Use a 16-character Google App Password, not the normal Gmail password. Create one at Google Account → Security → 2-Step Verification → App passwords.";
  }
  if (/timed out|timeout|connection|network|refused|tls|eof/i.test(text)) {
    return `${text} The mail server could not be reached from Gleeful. Confirm the App Password is saved, then try again.`;
  }
  return text;
}

async function loadSmtpConfig(overrides = {}) {
  const envUser = Deno.env.get("SMTP_USER") || DEFAULT_SMTP_USER;
  const envPass = Deno.env.get("SMTP_PASS") || "";
  const envHost = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
  const envPort = Number(Deno.env.get("SMTP_PORT") || "465");
  const envFrom = Deno.env.get("SMTP_FROM") || "";

  let row = null;
  const { data, error } = await adminClient()
    .from("mail_settings")
    .select("smtp_user, smtp_pass, smtp_host, smtp_port, from_name")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error(error);
  } else {
    row = data;
  }

  const user =
    String(overrides.user || row?.smtp_user || envUser).trim() || DEFAULT_SMTP_USER;
  const pass = String(overrides.pass || row?.smtp_pass || envPass).replace(/\s+/g, "");
  const host = String(row?.smtp_host || envHost).trim() || "smtp.gmail.com";
  const port = Number(row?.smtp_port || envPort || 465);
  const fromName = String(row?.from_name || "Gleeful Skin Wellness Center").trim();
  const from = envFrom || `${fromName} <${user}>`;

  return { user, pass, host, port, from };
}

async function sendWithSmtp({ to, subject, html, text, smtp }) {
  if (!smtp.pass) {
    throw new Error(
      "No Gmail app password is saved. Paste a Google App Password in Admin Settings, click Save mail settings, then Send test email."
    );
  }

  const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");
  const attempts = [
    { port: 465, tls: true },
    { port: 587, tls: false },
    { port: Number(smtp.port) || 465, tls: Number(smtp.port) !== 587 },
  ];

  const seen = new Set();
  const errors = [];

  for (const attempt of attempts) {
    const key = `${attempt.port}:${attempt.tls}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const client = new SMTPClient({
      connection: {
        hostname: smtp.host,
        port: attempt.port,
        tls: attempt.tls,
        auth: { username: smtp.user, password: smtp.pass },
      },
    });

    try {
      await withTimeout(
        client.send({
          from: smtp.from,
          to,
          subject,
          content: text,
          html,
        }),
        12000,
        `Gmail SMTP ${attempt.port}`
      );
      return { sent: true, provider: `smtp:${attempt.port}` };
    } catch (error) {
      errors.push(`port ${attempt.port}: ${error?.message || error}`);
    } finally {
      try {
        await client.close();
      } catch {
        // Ignore close errors after a failed send.
      }
    }
  }

  throw new Error(explainMailError(errors.join(" | ")));
}

async function sendWithResend({ to, subject, html, text }) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return { sent: false };

  const from = Deno.env.get("RESEND_FROM") || "Gleeful <beth.t@example.com>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });

  if (!response.ok) {
    throw new Error(`Resend failed: ${await response.text()}`);
  }

  return { sent: true, provider: "resend" };
}

async function sendMail({ to, content, smtpOverrides }) {
  const smtp = await loadSmtpConfig(smtpOverrides);
  const errors = [];

  try {
    return await sendWithSmtp({ to, ...content, smtp });
  } catch (error) {
    errors.push(error.message);
    console.error(error);
  }

  try {
    const resend = await sendWithResend({ to, ...content });
    if (resend.sent) return resend;
  } catch (error) {
    errors.push(error.message);
    console.error(error);
  }

  throw new Error(errors.filter(Boolean).join(" | ") || "Could not send email.");
}

async function authorize({ kind, to, authHeader }) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const fromToken = callerEmail(authHeader);
  const bootstrapAdmin = ["edwardraquipo26@gmail.com", "admin@glow.com"].includes(fromToken);

  let isAdmin = bootstrapAdmin;
  if (authHeader) {
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: adminCheck } = await supabase.rpc("is_admin_user");
    if (adminCheck) isAdmin = true;
  }

  if (kind === "approved" || kind === "test") {
    if (!isAdmin) return "Not authorized";
    return null;
  }

  if (kind === "signup") {
    if (fromToken && fromToken === to) return null;
    if (isAdmin) return null;

    const { data: profile } = await adminClient()
      .from("profiles")
      .select("email, created_at")
      .eq("email", to)
      .maybeSingle();

    if (!profile) return "Not authorized";

    const createdAt = Date.parse(profile.created_at);
    const fiveMinutes = 5 * 60 * 1000;
    if (!Number.isNaN(createdAt) && Date.now() - createdAt <= fiveMinutes) {
      return null;
    }

    return "Not authorized";
  }

  return "Unknown email type";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const body = await req.json();
    const kind = String(body.kind || "approved").trim().toLowerCase();
    const to = String(body.email || "").trim().toLowerCase();
    const fullName = String(body.fullName || "").trim();
    const loginUrl = safeLoginUrl(body.loginUrl);

    if (!to || !to.includes("@")) {
      return json({ error: "A valid user email is required" }, 400);
    }

    const authError = await authorize({ kind, to, authHeader });
    if (authError) {
      return json({ error: authError }, 403);
    }

    const content =
      kind === "signup"
        ? signupContent({ fullName, loginUrl })
        : kind === "test"
          ? testContent({ loginUrl })
          : approvalContent({ fullName, loginUrl });

    const smtpOverrides =
      kind === "signup"
        ? {}
        : {
            user: String(body.smtpUser || "").trim(),
            pass: String(body.smtpPass || "").replace(/\s+/g, ""),
          };

    if (kind === "approved") {
      try {
        await confirmAuthUserByEmail(to);
      } catch (confirmError) {
        console.error(confirmError);
      }
    }

    const result = await sendMail({ to, content, smtpOverrides });
    return json({ ok: true, provider: result.provider, kind });
  } catch (error) {
    console.error(error);
    return json({ error: error.message || "Failed to send email" }, 500);
  }
});
