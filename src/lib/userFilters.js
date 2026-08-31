export const USER_APPROVAL_FILTERS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

const APPROVAL_SORT_ORDER = {
  pending: 0,
  approved: 1,
  rejected: 2,
};

export function normalizeApprovalStatus(status) {
  if (status === "approved" || status === "rejected") return status;
  return "pending";
}

export function getUserApprovalCounts(users) {
  const counts = { all: users.length, pending: 0, approved: 0, rejected: 0 };

  users.forEach((user) => {
    const key = normalizeApprovalStatus(user.approval_status);
    counts[key] += 1;
  });

  return counts;
}

export function filterUsers(users, { status = "all", search = "" }) {
  let result = users;

  if (status !== "all") {
    result = result.filter(
      (user) => normalizeApprovalStatus(user.approval_status) === status
    );
  }

  const query = search.trim().toLowerCase();
  if (query) {
    result = result.filter((user) =>
      [user.full_name, user.role, user.approval_status, user.email, user.id]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(query))
    );
  }

  return [...result].sort((a, b) => {
    const statusA = APPROVAL_SORT_ORDER[normalizeApprovalStatus(a.approval_status)] ?? 99;
    const statusB = APPROVAL_SORT_ORDER[normalizeApprovalStatus(b.approval_status)] ?? 99;
    if (statusA !== statusB) return statusA - statusB;
    return (b.created_at || "").localeCompare(a.created_at || "");
  });
}

export function getUserDisplayName(user) {
  const name = user?.full_name?.trim();
  if (name && name !== "Unnamed User") return name;
  const email = user?.email?.trim();
  if (email) return email.split("@")[0];
  return "Unnamed User";
}

export function getShortUserId(id) {
  if (!id) return "—";
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}
