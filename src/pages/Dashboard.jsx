import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { filterAppointments } from "../lib/appointmentFilters.js";
import { paginateItems } from "../lib/pagination.js";
import AppointmentsFilterBar from "../components/AppointmentsFilterBar.jsx";
import AppointmentsPagination from "../components/AppointmentsPagination.jsx";

export default function Dashboard({ session, profile }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const loadAppointments = useCallback(async () => {
    if (!session?.user?.id) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    let query = supabase.from("appointments").select(
      "id, full_name, treatment, appointment_date, appointment_time, status, created_at"
    );

    if (profile?.role !== "admin") {
      query = query.eq("user_id", session.user.id);
    }

    const { data, error } = await query.order("appointment_date", {
      ascending: true,
    });

    if (error) {
      console.error("Failed to load appointments:", error.message);
      setAppointments([]);
    } else {
      setAppointments(data || []);
    }

    setLoading(false);
  }, [session, profile]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const pendingCount = appointments.filter((item) => item.status === "Pending").length;
  const approvedCount = appointments.filter((item) => item.status === "Approved").length;
  const upcomingCount = appointments.filter((item) => item.status !== "Cancelled").length;

  const filteredAppointments = useMemo(
    () => filterAppointments(appointments, { status: statusFilter, search }),
    [appointments, statusFilter, search]
  );

  const pagination = useMemo(
    () => paginateItems(filteredAppointments, currentPage),
    [filteredAppointments, currentPage]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, search]);

  const nextAppointment = useMemo(() => {
    return appointments.find(
      (item) => item.status === "Approved" || item.status === "Pending"
    );
  }, [appointments]);

  return (
    <div className="admin-dashboard">
      <div className="appointments-panel">
        <div className="appointments-panel__header">
          <div>
            <h2 className="appointments-panel__title">Your Overview</h2>
            <p className="appointments-panel__subtitle">
              Track upcoming beauty sessions and continue your skincare journey
            </p>
          </div>
          <button type="button" className="appt-btn appt-btn--ghost" onClick={loadAppointments}>
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="appointments-panel">
          <div className="appointments-panel__empty">Loading dashboard...</div>
        </div>
      ) : (
        <>
          <div className="admin-dashboard__stats">
            <div className="admin-dashboard__stat admin-dashboard__stat--appointments">
              <span className="admin-dashboard__stat-label">Upcoming Sessions</span>
              <span className="admin-dashboard__stat-value">{upcomingCount}</span>
            </div>
            <div className="admin-dashboard__stat admin-dashboard__stat--pending">
              <span className="admin-dashboard__stat-label">Pending</span>
              <span className="admin-dashboard__stat-value">{pendingCount}</span>
            </div>
            <div className="admin-dashboard__stat admin-dashboard__stat--approved">
              <span className="admin-dashboard__stat-label">Approved</span>
              <span className="admin-dashboard__stat-value">{approvedCount}</span>
            </div>
            <div className="admin-dashboard__stat">
              <span className="admin-dashboard__stat-label">Account Type</span>
              <span className="admin-dashboard__stat-value">
                {profile?.role === "admin" ? "Admin" : "Customer"}
              </span>
            </div>
          </div>

          <div className="admin-dashboard__grid">
            <section className="admin-dashboard__card">
              <h3 className="admin-dashboard__card-title">Next Appointment</h3>
              {nextAppointment ? (
                <>
                  <p className="admin-dashboard__highlight">{nextAppointment.treatment}</p>
                  <p className="admin-dashboard__meta">
                    {nextAppointment.appointment_date} · {nextAppointment.appointment_time}
                  </p>
                </>
              ) : (
                <p className="admin-dashboard__meta">No upcoming appointments yet.</p>
              )}
            </section>

            <section className="admin-dashboard__card">
              <h3 className="admin-dashboard__card-title">Quick Actions</h3>
              <div className="admin-dashboard__actions">
                <Link to="/book" className="admin-dashboard__action-link">
                  Book Appointment
                </Link>
                <Link to="/profile" className="admin-dashboard__action-link">
                  Update Profile
                </Link>
                <Link to="/inbox" className="admin-dashboard__action-link">
                  View Inbox
                </Link>
              </div>
            </section>
          </div>

          <section className="appointments-panel">
            <div className="appointments-panel__header">
              <div>
                <h2 className="appointments-panel__title">My Appointments</h2>
                <p className="appointments-panel__subtitle">
                  Your booking history and upcoming sessions
                </p>
              </div>
              <Link to="/book" className="appt-btn appt-btn--ghost">
                Book Now
              </Link>
            </div>

            {!loading && appointments.length > 0 && (
              <AppointmentsFilterBar
                appointments={appointments}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                search={search}
                onSearchChange={setSearch}
                filteredCount={filteredAppointments.length}
              />
            )}

            {appointments.length === 0 ? (
              <div className="appointments-panel__empty">
                <p>No appointments yet. Your next glow-up starts here.</p>
                <div className="customer-empty-action">
                  <Link to="/book" className="appt-btn appt-btn--ghost">
                    Book Now
                  </Link>
                </div>
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="appointments-panel__empty">
                No appointments match your filters.
              </div>
            ) : (
              <div className="appt-table-wrap">
                <table className="appt-table">
                  <thead>
                    <tr>
                      <th>Treatment</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagination.items.map((appointment) => (
                      <tr key={appointment.id}>
                        <td>
                          <div className="appt-table__client">{appointment.treatment}</div>
                        </td>
                        <td>{appointment.appointment_date}</td>
                        <td>{appointment.appointment_time}</td>
                        <td>
                          <span
                            className={`status-pill ${appointment.status
                              ?.toLowerCase()
                              .replace(/\s+/g, "")}`}
                          >
                            {appointment.status}
                          </span>
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
        </>
      )}
    </div>
  );
}
