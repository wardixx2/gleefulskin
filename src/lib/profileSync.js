import { supabase } from "./supabase.js";
import { ADMIN_EMAIL, normalizeProfile } from "./profileApproval.js";

async function fetchProfileRow(userId) {
  const withApproval = await supabase
    .from("profiles")
    .select("id, full_name, role, approval_status, created_at")
    .eq("id", userId)
    .single();

  if (!withApproval.error) {
    return withApproval.data;
  }

  if (withApproval.error.code === "PGRST116") {
    return null;
  }

  const fallback = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at")
    .eq("id", userId)
    .single();

  if (fallback.error) {
    if (fallback.error.code === "PGRST116") return null;
    throw fallback.error;
  }

  return {
    ...fallback.data,
    approval_status: fallback.data.role === "admin" ? "approved" : null,
  };
}

export async function loadUserProfile(userId) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return null;
  }

  const email = userData.user.email || "";
  let profile = await fetchProfileRow(userId);

  if (!profile) {
    const isAdmin = email.trim().toLowerCase() === ADMIN_EMAIL;
    const role = isAdmin ? "admin" : "customer";
    const approval_status = isAdmin ? "approved" : "pending";
    const fullName = userData.user.user_metadata?.full_name || "";

    const insertResult = await supabase.from("profiles").insert({
      id: userId,
      full_name: fullName,
      role,
      approval_status,
    });

    if (insertResult.error) {
      profile = await fetchProfileRow(userId);
      if (!profile) {
        return normalizeProfile(
          { id: userId, full_name: fullName, role, approval_status },
          email
        );
      }
    } else {
      profile = { id: userId, full_name: fullName, role, approval_status };
    }
  }

  const normalized = normalizeProfile(profile, email);

  if (
    profile &&
    (profile.role !== normalized.role || profile.approval_status !== normalized.approval_status)
  ) {
    await supabase
      .from("profiles")
      .update({
        role: normalized.role,
        approval_status: normalized.approval_status,
      })
      .eq("id", userId);
  }

  return normalized;
}
