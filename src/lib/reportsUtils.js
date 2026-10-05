export function formatPeso(value) {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return "₱0";
  return `₱${num.toLocaleString("en-PH")}`;
}

export function isSameDay(date, reference = new Date()) {
  return (
    date.getDate() === reference.getDate() &&
    date.getMonth() === reference.getMonth() &&
    date.getFullYear() === reference.getFullYear()
  );
}

export function isWithinLastDays(date, days, reference = new Date()) {
  const diffDays = (reference - date) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= days;
}

export function isSameMonth(date, reference = new Date()) {
  return (
    date.getMonth() === reference.getMonth() &&
    date.getFullYear() === reference.getFullYear()
  );
}

export function getReportSummary(appointments, reference = new Date()) {
  const approved = appointments.filter(
    (item) => item.status === "Approved" || item.status === "Completed"
  );
  const pending = appointments.filter((item) => item.status === "Pending");
  const completed = appointments.filter((item) => item.status === "Completed");

  let dailyIncome = 0;
  let weeklyIncome = 0;
  let monthlyIncome = 0;
  let totalIncome = 0;

  approved.forEach((item) => {
    const amount = Number(item.price || 0);
    const date = new Date(item.appointment_date);

    totalIncome += amount;

    if (isSameDay(date, reference)) {
      dailyIncome += amount;
    }

    if (isWithinLastDays(date, 7, reference)) {
      weeklyIncome += amount;
    }

    if (isSameMonth(date, reference)) {
      monthlyIncome += amount;
    }
  });

  return {
    dailyIncome,
    weeklyIncome,
    monthlyIncome,
    totalIncome,
    approvedCount: appointments.filter((item) => item.status === "Approved").length,
    completedCount: completed.length,
    pendingCount: pending.length,
    approved,
  };
}

export const REPORT_PERIOD_FILTERS = [
  { id: "all", label: "All Time" },
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
];

export function filterReportRows(rows, { period = "all", search = "" }, reference = new Date()) {
  let result = rows;

  if (period === "today") {
    result = result.filter((item) => isSameDay(new Date(item.appointment_date), reference));
  } else if (period === "week") {
    result = result.filter((item) =>
      isWithinLastDays(new Date(item.appointment_date), 7, reference)
    );
  } else if (period === "month") {
    result = result.filter((item) => isSameMonth(new Date(item.appointment_date), reference));
  }

  const query = search.trim().toLowerCase();
  if (query) {
    result = result.filter((item) =>
      [item.full_name, item.treatment, item.appointment_date, String(item.price)]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(query))
    );
  }

  return [...result].sort((a, b) =>
    (b.appointment_date || "").localeCompare(a.appointment_date || "")
  );
}

export function getPeriodCounts(rows, reference = new Date()) {
  return {
    all: rows.length,
    today: rows.filter((item) => isSameDay(new Date(item.appointment_date), reference)).length,
    week: rows.filter((item) =>
      isWithinLastDays(new Date(item.appointment_date), 7, reference)
    ).length,
    month: rows.filter((item) => isSameMonth(new Date(item.appointment_date), reference)).length,
  };
}
