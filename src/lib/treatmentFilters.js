export const TREATMENT_STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
];

export function getTreatmentStatusCounts(treatments) {
  const counts = { all: treatments.length, active: 0, inactive: 0 };

  treatments.forEach((treatment) => {
    if (treatment.active) {
      counts.active += 1;
    } else {
      counts.inactive += 1;
    }
  });

  return counts;
}

export function filterTreatments(treatments, { status = "all", search = "" }) {
  let result = treatments;

  if (status === "active") {
    result = result.filter((t) => t.active);
  } else if (status === "inactive") {
    result = result.filter((t) => !t.active);
  }

  const query = search.trim().toLowerCase();
  if (query) {
    result = result.filter((t) =>
      [t.name, t.ors_number, String(t.price)]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(query))
    );
  }

  return [...result].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return (a.name || "").localeCompare(b.name || "");
  });
}
