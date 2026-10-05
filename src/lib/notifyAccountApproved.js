import { supabase } from "./supabase.js";

const FALLBACK_APP_URL = "https://wardixx2.github.io/gleefulskin";
export const LIVE_LOGIN_URL = `${FALLBACK_APP_URL}/login`;

function isLocalHost(url) {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return true;
  }
}

export function getCustomerLoginUrl() {
  const fromEnv = String(import.meta.env.VITE_PUBLIC_APP_URL || "").replace(/\/$/, "");
  if (fromEnv && !isLocalHost(fromEnv)) {
    return `${fromEnv}/login`;
  }
  return LIVE_LOGIN_URL;
}

function hasStoredPassword(value) {
  return Boolean(String(value || "").replace(/\s+/g, ""));
}

async function readFunctionError(error, data) {
  if (data?.error) return data.error;

  const ctx = error?.context;
  if (ctx) {
    try {
      const cloned = typeof ctx.clone === "function" ? ctx.clone() : ctx;
      const body = await cloned.json();
      if (body?.error) return body.error;
      if (body?.message) return body.message;
    } catch {
      try {
        const cloned = typeof ctx.clone === "function" ? ctx.clone() : ctx;
        const text = await cloned.text();
        if (text) {
          try {
            const body = JSON.parse(text);
            if (body?.error) return body.error;
            if (body?.message) return body.message;
          } catch {
            return text;
          }
        }
      } catch {
        // Fall through to the generic Functions error.
      }
    }
  }

  return error?.message || "Could not send the email.";
}

async function currentAccessToken(fallback) {
  if (fallback) return fallback;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

async function invokeMail({ kind, email, fullName, accessToken, smtpUser, smtpPass }) {
  const to = String(email || "").trim().toLowerCase();
  if (!to || !to.includes("@")) {
    return { error: "This user has no email on file, so the message could not be sent." };
  }

  const token = await currentAccessToken(accessToken);
  const options = {
    body: {
      kind,
      email: to,
      fullName: fullName || "",
      loginUrl: getCustomerLoginUrl(),
    },
  };

  if (smtpUser) options.body.smtpUser = smtpUser;
  if (smtpPass) options.body.smtpPass = smtpPass;
  if (token) options.headers = { Authorization: `Bearer ${token}` };

  const { data, error } = await supabase.functions.invoke("notify-account-approved", options);

  if (error) {
    return { error: await readFunctionError(error, data) };
  }

  if (data?.error) {
    return { error: data.error };
  }

  return { error: null, provider: data?.provider || null };
}

export async function sendAccountApprovedEmail({ email, fullName }) {
  return invokeMail({ kind: "approved", email, fullName });
}

export async function sendAccountCreatedEmail({ email, fullName, accessToken }) {
  return invokeMail({ kind: "signup", email, fullName, accessToken });
}

export async function sendTestEmail({ email, smtpUser, smtpPass, accessToken }) {
  return invokeMail({ kind: "test", email, smtpUser, smtpPass, accessToken });
}

export async function loadMailSettings() {
  const { data, error } = await supabase
    .from("mail_settings")
    .select("smtp_user, smtp_host, smtp_port, from_name, smtp_pass")
    .eq("id", 1)
    .maybeSingle();

  if (error) return { settings: null, error: error.message };
  return {
    settings: data
      ? {
          ...data,
          hasPassword: hasStoredPassword(data.smtp_pass),
        }
      : null,
    error: null,
  };
}

export async function saveMailSettings({ smtpUser, smtpPass, smtpHost, smtpPort, fromName }) {
  const payload = {
    smtp_user: smtpUser.trim(),
    smtp_host: smtpHost.trim() || "smtp.gmail.com",
    smtp_port: Number(smtpPort) || 465,
    from_name: fromName.trim() || "Gleeful Skin Wellness Center",
    updated_at: new Date().toISOString(),
  };

  const trimmedPass = smtpPass.trim().replace(/\s+/g, "");
  if (trimmedPass) {
    payload.smtp_pass = trimmedPass;
  }

  const { data: existing, error: existingError } = await supabase
    .from("mail_settings")
    .select("id")
    .eq("id", 1)
    .maybeSingle();

  if (existingError) return { error: existingError.message };

  if (existing?.id) {
    const { error } = await supabase.from("mail_settings").update(payload).eq("id", 1);
    return { error: error?.message || null };
  }

  const { error } = await supabase.from("mail_settings").insert({ id: 1, ...payload });
  return { error: error?.message || null };
}
