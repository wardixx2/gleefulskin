import { supabase } from "./supabase.js";

function mapProfileRows(rows) {
  return (rows || []).map((user) => ({
    ...user,
    approval_status: user.approval_status || "pending",
  }));
}

export async function fetchAllProfilesForAdmin() {
  const rpcResult = await supabase.rpc("admin_list_profiles");

  if (!rpcResult.error) {
    return { users: mapProfileRows(rpcResult.data), error: null };
  }

  const withApproval = await supabase
    .from("profiles")
    .select("id, full_name, email, role, approval_status, created_at")
    .order("created_at", { ascending: false });

  if (!withApproval.error) {
    return { users: mapProfileRows(withApproval.data), error: null };
  }

  const fallback = await supabase
    .from("profiles")
    .select("id, full_name, email, role, created_at")
    .order("created_at", { ascending: false });

  if (fallback.error) {
    return { users: [], error: fallback.error.message };
  }

  return { users: mapProfileRows(fallback.data), error: null };
}

export async function updateProfileAsAdmin(userId, { role, approval_status }) {
  const rpcResult = await supabase.rpc("admin_update_profile", {
    target_user_id: userId,
    new_role: role ?? null,
    new_approval_status: approval_status ?? null,
  });

  if (!rpcResult.error) {
    return { error: null };
  }

  const updates = {};
  if (role) updates.role = role;
  if (approval_status) updates.approval_status = approval_status;

  const direct = await supabase.from("profiles").update(updates).eq("id", userId);
  return { error: direct.error?.message || null };
}

export async function deleteCustomerAsAdmin(userId) {
  const rpcResult = await supabase.rpc("admin_delete_customer", {
    target_user_id: userId,
  });

  if (!rpcResult.error) {
    return { error: null };
  }

  return { error: rpcResult.error.message };
}
