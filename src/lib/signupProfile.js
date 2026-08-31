import { supabase } from "../lib/supabase.js";
import { ADMIN_EMAIL } from "../lib/profileApproval.js";

export async function saveSignupProfile({ userId, fullName, email }) {
  const isAdmin = email.trim().toLowerCase() === ADMIN_EMAIL;
  const role = isAdmin ? "admin" : "customer";
  const approval_status = isAdmin ? "approved" : "pending";

  const rpcResult = await supabase.rpc("complete_signup_profile", {
    user_full_name: fullName,
    user_email: email,
  });

  if (!rpcResult.error) {
    return { error: null };
  }

  const upsertResult = await supabase.from("profiles").upsert(
    {
      id: userId,
      full_name: fullName,
      email,
      role,
      approval_status,
    },
    { onConflict: "id" }
  );

  return { error: upsertResult.error?.message || rpcResult.error.message };
}
