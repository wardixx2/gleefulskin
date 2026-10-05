export const ADMIN_EMAIL = "edwardraquipo26@gmail.com";
export const ADMIN_EMAILS = ["edwardraquipo26@gmail.com", "admin@glow.com"];

export function normalizeRole(role) {
  if (role === "admin") return "admin";
  return "customer";
}

export function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(email?.trim().toLowerCase());
}

export function isAdminUser(profile, email) {
  if (normalizeRole(profile?.role) === "admin") return true;
  return isAdminEmail(email);
}

export function isProfileApproved(profile, email) {
  if (!profile) return false;
  if (isAdminUser(profile, email)) return true;
  if (profile.approval_status === "pending") return false;
  if (profile.approval_status === "rejected") return false;
  return true;
}

export function getApprovalLabel(status) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Pending";
}

export function normalizeProfile(profile, email) {
  if (!profile) return null;

  const role = isAdminUser(profile, email) ? "admin" : normalizeRole(profile.role);
  const approval_status = role === "admin" ? "approved" : profile.approval_status || "approved";

  return {
    ...profile,
    role,
    approval_status,
  };
}
