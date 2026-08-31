import { supabase } from "./supabase.js";

export function getCustomerLoginUrl() {
  const configured = import.meta.env.VITE_PUBLIC_APP_URL?.replace(/\/$/, "");
  const base = import.meta.env.BASE_URL || "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const origin =
    configured ||
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? ""
      : window.location.origin);

  if (origin) {
    return new URL(`${normalizedBase}login`, `${origin}/`).toString();
  }

  return new URL(`${normalizedBase}login`, window.location.origin).toString();
}

async function sendLoginMailThroughAuth(email, loginUrl) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: loginUrl,
    },
  });

  return { error: error?.message || null };
}

export async function sendAccountApprovedEmail({ email, fullName }) {
  const to = email?.trim();
  if (!to) {
    return { error: "This account has no email address." };
  }

  const loginUrl = getCustomerLoginUrl();

  const { data, error } = await supabase.functions.invoke("notify-account-approved", {
    body: {
      email: to,
      fullName: fullName || "",
      loginUrl,
    },
  });

  if (!error && !data?.error) {
    return { error: null };
  }

  return sendLoginMailThroughAuth(to, loginUrl);
}
