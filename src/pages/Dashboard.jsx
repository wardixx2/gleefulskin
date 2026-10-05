import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { filterAppointments } from "../lib/appointmentFilters.js";
import { paginateItems } from "../lib/pagination.js";
import { confirmAction, showError, showSuccess } from "../lib/alerts.js";
import AppointmentsFilterBar from "../components/AppointmentsFilterBar.jsx";
import AppointmentsPagination from "../components/AppointmentsPagination.jsx";

const formatPeso = (value) => {
  if (value === null || value === undefined || value === "") return "₱0";
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return "₱0";
  return `₱${num.toLocaleString("en-PH")}`;
};

export default function Dashboard({ session, profile }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const loadAppointments = useCallback(async () => {
    if (!session?.user?.id) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    let query = supabase.from("appointments").select(
      "id, full_name, email, phone, treatment, price, ors_required, ors_number, ors_amount, appointment_date, appointment_time, status, created_at"
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

  const handleCancelAppointment = async (appointment) => {
    const result = await confirmAction({
      title: "Cancel this appointment?",
      text: `Are you sure you want to cancel your ${appointment.treatment} appointment on ${appointment.appointment_date} at ${appointment.appointment_time}?`,
      confirmButtonText: "Yes, cancel it",
    });

    if (!result.isConfirmed) return;

    setCancellingId(appointment.id);
    try {
      const { error: rpcErr } = await supabase.rpc("cancel_customer_appointment", {
        p_appointment_id: appointment.id,
      });

      if (rpcErr) {
        // Fallback direct update
        const { error: updateErr } = await supabase
          .from("appointments")
          .update({ status: "Cancelled" })
          .eq("id", appointment.id);

        if (updateErr) {
          await showError(
            rpcErr.message || updateErr.message,
            "Could not cancel appointment"
          );
          return;
        }
      }

      await showSuccess(
        "Your appointment has been cancelled.",
        "Appointment Cancelled"
      );
      if (selectedAppointment?.id === appointment.id) {
        setSelectedAppointment(null);
      }
      await loadAppointments();
    } catch (err) {
      await showError(err.message, "Cancellation failed");
    } finally {
      setCancellingId(null);
    }
  };

  const pendingCount = appointments.filter((item) => item.status === "Pending").length;
  const approvedCount = appointments.filter((item) => item.status === "Approved").length;
  const completedCount = appointments.filter((item) => item.status === "Completed").length;
  const upcomingCount = appointments.filter(
    (item) => item.status === "Pending" || item.status === "Approved"
  ).length;

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
              <span className="admin-dashboard__stat-label">Completed</span>
              <span className="admin-dashboard__stat-value">{completedCount}</span>
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
                      <th>Actions</th>
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
                        <td>
                          <div className="appt-table__actions">
                            <button
                              type="button"
                              className="appt-btn appt-btn--ghost"
                              onClick={() => setSelectedAppointment(appointment)}
                            >
                              Details
                            </button>
                            {(appointment.status === "Pending" ||
                              appointment.status === "Approved") && (
                              <button
                                type="button"
                                className="appt-btn appt-btn--danger"
                                disabled={cancellingId === appointment.id}
                                onClick={() => handleCancelAppointment(appointment)}
                              >
                                {cancellingId === appointment.id ? "Cancelling..." : "Cancel"}
                              </button>
                            )}
                          </div>
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

      {selectedAppointment && (
        <div
          className="appt-modal-overlay"
          onClick={() => setSelectedAppointment(null)}
          role="presentation"
        >
          <div
            className="appt-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="appointment-modal-title"
          >
            <div className="appt-modal-header">
              <h3 id="appointment-modal-title" className="appt-modal-title">
                Appointment Details
              </h3>
              <button
                type="button"
                className="appt-modal-close-btn"
                onClick={() => setSelectedAppointment(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="appt-modal-body">
              <div className="appt-modal-treatment-box">
                <div>
                  <h4>{selectedAppointment.treatment}</h4>
                  <p>
                    {selectedAppointment.appointment_date} at {selectedAppointment.appointment_time}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="appt-modal-treatment-price">
                    {formatPeso(selectedAppointment.price)}
                  </div>
                  <span
                    className={`status-pill ${selectedAppointment.status
                      ?.toLowerCase()
                      .replace(/\s+/g, "")}`}
                    style={{ marginTop: "0.4rem" }}
                  >
                    {selectedAppointment.status}
                  </span>
                </div>
              </div>

              <div className="appt-modal-details-grid">
                <div className="appt-modal-field">
                  <span className="appt-modal-field-label">Preferred Date</span>
                  <p className="appt-modal-field-value">{selectedAppointment.appointment_date}</p>
                </div>
                <div className="appt-modal-field">
                  <span className="appt-modal-field-label">Preferred Time</span>
                  <p className="appt-modal-field-value">{selectedAppointment.appointment_time}</p>
                </div>
                <div className="appt-modal-field">
                  <span className="appt-modal-field-label">Full Name</span>
                  <p className="appt-modal-field-value">{selectedAppointment.full_name}</p>
                </div>
                <div className="appt-modal-field">
                  <span className="appt-modal-field-label">Phone</span>
                  <p className="appt-modal-field-value">{selectedAppointment.phone || "—"}</p>
                </div>
                <div className="appt-modal-field appt-modal-field--full">
                  <span className="appt-modal-field-label">Email</span>
                  <p className="appt-modal-field-value">{selectedAppointment.email || "—"}</p>
                </div>
                <div className="appt-modal-field appt-modal-field--full">
                  <span className="appt-modal-field-label">ORS Requirement</span>
                  <p className="appt-modal-field-value">
                    {selectedAppointment.ors_required
                      ? `Required · No. ${selectedAppointment.ors_number || "—"}${
                          selectedAppointment.ors_amount != null
                            ? ` · ${formatPeso(selectedAppointment.ors_amount)}`
                            : ""
                        }`
                      : "Not required"}
                  </p>
                </div>
                {selectedAppointment.created_at && (
                  <div className="appt-modal-field appt-modal-field--full">
                    <span className="appt-modal-field-label">Requested On</span>
                    <p className="appt-modal-field-value">
                      {new Date(selectedAppointment.created_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="appt-modal-footer">
              {(selectedAppointment.status === "Pending" ||
                selectedAppointment.status === "Approved") && (
                <button
                  type="button"
                  className="appt-btn appt-btn--danger"
                  disabled={cancellingId === selectedAppointment.id}
                  onClick={() => handleCancelAppointment(selectedAppointment)}
                >
                  {cancellingId === selectedAppointment.id ? "Cancelling..." : "Cancel Appointment"}
                </button>
              )}
              <button
                type="button"
                className="appt-btn appt-btn--ghost"
                onClick={() => setSelectedAppointment(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
