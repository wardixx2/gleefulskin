import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase.js";
import {
  filterReportRows,
  formatPeso,
  getReportSummary,
} from "../../lib/reportsUtils.js";
import { paginateItems } from "../../lib/pagination.js";
import ReportsFilterBar from "../../components/ReportsFilterBar.jsx";
import AppointmentsPagination from "../../components/AppointmentsPagination.jsx";
import "../../styles/Reports.css";

const STAT_CARDS = [
  { key: "dailyIncome", label: "Daily Income", format: "currency" },
  { key: "weeklyIncome", label: "Weekly Income", format: "currency" },
  { key: "monthlyIncome", label: "Monthly Income", format: "currency" },
  { key: "totalIncome", label: "Total Income", format: "currency" },
  { key: "approvedCount", label: "Approved Bookings", format: "number" },
  { key: "pendingCount", label: "Pending Bookings", format: "number" },
];

export default function Reports() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const loadReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .order("appointment_date", { ascending: false });

    if (error) {
      console.error("Failed to load reports:", error.message);
      setAppointments([]);
    } else {
      setAppointments(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadReports();
  }, []);

  const summary = useMemo(() => getReportSummary(appointments), [appointments]);

  const filteredRows = useMemo(
    () => filterReportRows(summary.approved, { period: periodFilter, search }),
    [summary.approved, periodFilter, search]
  );

  const pagination = useMemo(
    () => paginateItems(filteredRows, currentPage),
    [filteredRows, currentPage]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [periodFilter, search]);

  return (
    <div className="reports-panel">
      <div className="appointments-panel">
        <div className="appointments-panel__header">
          <div>
            <h2 className="appointments-panel__title">Income Reports</h2>
            <p className="appointments-panel__subtitle">
              Revenue overview from approved appointments
            </p>
          </div>
          <button type="button" className="appt-btn appt-btn--ghost" onClick={loadReports}>
            Refresh
          </button>
        </div>
      </div>

      <div className="reports-stats-grid">
        {STAT_CARDS.map((card) => (
          <div key={card.key} className={`reports-stat-card reports-stat-card--${card.key}`}>
            <span className="reports-stat-card__label">{card.label}</span>
            <span className="reports-stat-card__value">
              {card.format === "currency"
                ? formatPeso(summary[card.key])
                : summary[card.key].toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      <section className="appointments-panel reports-table-panel">
        <div className="appointments-panel__header reports-table-panel__header">
          <div>
            <h2 className="appointments-panel__title">Approved Appointments</h2>
            <p className="appointments-panel__subtitle">
              Detailed breakdown of completed revenue
            </p>
          </div>
        </div>

        {!loading && summary.approved.length > 0 && (
          <ReportsFilterBar
            rows={summary.approved}
            periodFilter={periodFilter}
            onPeriodChange={setPeriodFilter}
            search={search}
            onSearchChange={setSearch}
            filteredCount={filteredRows.length}
          />
        )}

        {loading ? (
          <div className="appointments-panel__empty">Loading reports...</div>
        ) : summary.approved.length === 0 ? (
          <div className="appointments-panel__empty">
            No approved appointments yet. Income will appear here once bookings are approved.
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="appointments-panel__empty">No records match your filters.</div>
        ) : (
          <div className="appt-table-wrap">
            <table className="appt-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Treatment</th>
                  <th>Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pagination.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.appointment_date}</td>
                    <td>
                      <div className="appt-table__client">{item.full_name}</div>
                      {item.email && <div className="appt-table__sub">{item.email}</div>}
                    </td>
                    <td>{item.treatment}</td>
                    <td>{formatPeso(item.price)}</td>
                    <td>
                      <span className="status-pill approved">{item.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <AppointmentsPagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              startIndex={pagination.startIndex}
              endIndex={pagination.endIndex}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </section>
    </div>
  );
}
