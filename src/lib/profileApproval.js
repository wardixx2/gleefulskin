export const ADMIN_EMAIL = "admin@glow.com";

export function normalizeRole(role) {
  if (role === "admin") return "admin";
  return "customer";
}

export function isAdminUser(profile, email) {
  if (normalizeRole(profile?.role) === "admin") return true;
  return email?.trim().toLowerCase() === ADMIN_EMAIL;
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
