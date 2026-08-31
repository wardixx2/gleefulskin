export const APPOINTMENT_STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "cancelled", label: "Cancelled" },
];

export function normalizeStatus(status) {
  return (status || "").toLowerCase().trim();
}

export function getStatusCounts(appointments) {
  const counts = { all: appointments.length, pending: 0, approved: 0, cancelled: 0 };

  appointments.forEach((item) => {
    const key = normalizeStatus(item.status);
    if (key in counts) {
      counts[key] += 1;
    }
  });

  return counts;
}

const STATUS_SORT_ORDER = {
  pending: 0,
  approved: 1,
  cancelled: 2,
};

function compareWithinStatus(a, b, status) {
  if (status === "pending") {
    return (b.created_at || "").localeCompare(a.created_at || "");
  }

  const dateCompare = (a.appointment_date || "").localeCompare(b.appointment_date || "");
  if (dateCompare !== 0) return dateCompare;

  return (a.appointment_time || "").localeCompare(b.appointment_time || "");
}

export function sortAppointments(appointments) {
  return [...appointments].sort((a, b) => {
    const statusA = STATUS_SORT_ORDER[normalizeStatus(a.status)] ?? 99;
    const statusB = STATUS_SORT_ORDER[normalizeStatus(b.status)] ?? 99;
    if (statusA !== statusB) return statusA - statusB;

    return compareWithinStatus(a, b, normalizeStatus(a.status));
  });
}

export function filterAppointments(appointments, { status = "all", search = "" }) {
  let result = appointments;

  if (status !== "all") {
    result = result.filter((item) => normalizeStatus(item.status) === status);
  }

  const query = search.trim().toLowerCase();
  if (query) {
    result = result.filter((item) =>
      [item.full_name, item.treatment, item.email, item.appointment_date, item.appointment_time, item.status]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(query))
    );
  }

  return sortAppointments(result);
}
