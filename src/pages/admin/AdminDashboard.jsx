import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";
import { formatPeso, getReportSummary } from "../../lib/reportsUtils.js";
import { adminRoute } from "../../lib/adminRoutes.js";
import "../../styles/AdminDashboard.css";

const STAT_CARDS = [
  { key: "users", label: "Total Users", format: "number", accent: "users" },
  { key: "appointments", label: "Total Appointments", format: "number", accent: "appointments" },
  { key: "pendingCount", label: "Pending Bookings", format: "number", accent: "pending" },
  { key: "approvedCount", label: "Approved Bookings", format: "number", accent: "approved" },
  { key: "completedCount", label: "Completed Sessions", format: "number", accent: "approved" },
  { key: "dailyIncome", label: "Daily Income", format: "currency", accent: "income" },
  { key: "weeklyIncome", label: "Weekly Income", format: "currency", accent: "income" },
  { key: "monthlyIncome", label: "Monthly Income", format: "currency", accent: "income" },
  { key: "totalIncome", label: "Total Income", format: "currency", accent: "income-total" },
];

function getTopTreatment(appointments) {
  const treatmentCount = {};

  appointments?.forEach((item) => {
    if (!item.treatment) return;
    treatmentCount[item.treatment] = (treatmentCount[item.treatment] || 0) + 1;
  });

  let name = null;
  let bookings = 0;

  Object.entries(treatmentCount).forEach(([treatment, count]) => {
    if (count > bookings) {
      name = treatment;
      bookings = count;
    }
  });

  return name ? { name, bookings } : null;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const loadDashboard = async () => {
    setLoading(true);
    const [{ data: userData }, { data: appointmentData }] = await Promise.all([
      supabase.from("profiles").select("id"),
      supabase.from("appointments").select("*").order("created_at", { ascending: false }),
    ]);

    setUsers(userData || []);
    setAppointments(appointmentData || []);
    setLoading(false);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const summary = useMemo(() => getReportSummary(appointments), [appointments]);
  const topTreatment = useMemo(() => getTopTreatment(appointments), [appointments]);

  const pendingAppointments = useMemo(
    () => appointments.filter((item) => item.status === "Pending").slice(0, 5),
    [appointments]
  );

  const stats = {
    users: users.length,
    appointments: appointments.length,
    pendingCount: summary.pendingCount,
    approvedCount: summary.approvedCount,
    completedCount: summary.completedCount || 0,
    dailyIncome: summary.dailyIncome,
    weeklyIncome: summary.weeklyIncome,
    monthlyIncome: summary.monthlyIncome,
    totalIncome: summary.totalIncome,
  };

  return (
    <div className="admin-dashboard">
      <div className="appointments-panel">
        <div className="appointments-panel__header">
          <div>
            <h2 className="appointments-panel__title">Business Analytics</h2>
            <p className="appointments-panel__subtitle">
              Gleeful Skin Wellness Center overview
            </p>
          </div>
          <button type="button" className="appt-btn appt-btn--ghost" onClick={loadDashboard}>
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="appointments-panel__empty">Loading dashboard...</div>
      ) : (
        <>
          <div className="admin-dashboard__stats">
            {STAT_CARDS.map((card) => (
              <div
                key={card.key}
                className={`admin-dashboard__stat admin-dashboard__stat--${card.accent}`}
              >
                <span className="admin-dashboard__stat-label">{card.label}</span>
                <span className="admin-dashboard__stat-value">
                  {card.format === "currency"
                    ? formatPeso(stats[card.key])
                    : stats[card.key].toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          <div className="admin-dashboard__grid">
            <section className="admin-dashboard__card">
              <h3 className="admin-dashboard__card-title">Top Treatment</h3>
              {topTreatment ? (
                <>
                  <p className="admin-dashboard__highlight">{topTreatment.name}</p>
                  <p className="admin-dashboard__meta">
                    {topTreatment.bookings} total bookings
                  </p>
                </>
              ) : (
                <p className="admin-dashboard__meta">No treatment data yet.</p>
              )}
            </section>

            <section className="admin-dashboard__card">
              <h3 className="admin-dashboard__card-title">Quick Actions</h3>
              <div className="admin-dashboard__actions">
                <Link to={adminRoute("appointments")} className="admin-dashboard__action-link">
                  Review Appointments
                  {stats.pendingCount > 0 && (
                    <span className="admin-dashboard__badge">{stats.pendingCount}</span>
                  )}
                </Link>
                <Link to={adminRoute("treatments")} className="admin-dashboard__action-link">
                  Manage Treatments
                </Link>
                <Link to={adminRoute("users")} className="admin-dashboard__action-link">
                  View Users
                </Link>
                <Link to={adminRoute("reports")} className="admin-dashboard__action-link">
                  Income Reports
                </Link>
              </div>
            </section>
          </div>

          <section className="appointments-panel admin-dashboard__pending">
            <div className="appointments-panel__header admin-dashboard__pending-header">
              <div>
                <h2 className="appointments-panel__title">Pending Requests</h2>
                <p className="appointments-panel__subtitle">
                  Bookings waiting for approval
                </p>
              </div>
              <Link to={adminRoute("appointments")} className="appt-btn appt-btn--ghost">
                View All
              </Link>
            </div>

            {pendingAppointments.length === 0 ? (
              <div className="appointments-panel__empty">
                No pending bookings right now.
              </div>
            ) : (
              <div className="appt-table-wrap">
                <table className="appt-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Treatment</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingAppointments.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="appt-table__client">{item.full_name}</div>
                        </td>
                        <td>{item.treatment}</td>
                        <td>{item.appointment_date}</td>
                        <td>{item.appointment_time}</td>
                        <td>
                          <span className="status-pill pending">{item.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
