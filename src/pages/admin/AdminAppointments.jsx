import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";
import { filterAppointments } from "../../lib/appointmentFilters.js";
import { paginateItems } from "../../lib/pagination.js";
import { confirmAction, showError, showSuccess } from "../../lib/alerts.js";
import { adminRoute } from "../../lib/adminRoutes.js";
import AppointmentsFilterBar from "../../components/AppointmentsFilterBar.jsx";
import AppointmentsPagination from "../../components/AppointmentsPagination.jsx";

const formatPeso = (value) => {
  if (value === null || value === undefined || value === "") return "₱0";
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return "₱0";
  return `₱${num.toLocaleString("en-PH")}`;
};

export default function AdminAppointments() {
  const [allAppointments, setAllAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Active appointments (exclude archived)
  const appointments = useMemo(
    () => allAppointments.filter((a) => !a.archived),
    [allAppointments]
  );

  const archivedCount = useMemo(
    () => allAppointments.filter((a) => a.archived).length,
    [allAppointments]
  );

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error.message);
      setAllAppointments([]);
    } else {
      setAllAppointments(data || []);
      // If modal is open, refresh its data
      if (selectedAppointment) {
        const updated = data?.find((item) => item.id === selectedAppointment.id);
        setSelectedAppointment(updated || null);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const updateStatus = async (appointment, newStatus, confirmMsg = null) => {
    if (confirmMsg) {
      const result = await confirmAction({
        title: confirmMsg.title,
        text: confirmMsg.text,
        confirmButtonText: confirmMsg.btnText || "Yes, proceed",
      });
      if (!result.isConfirmed) return;
    }

    setActionLoadingId(appointment.id);
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: newStatus })
        .eq("id", appointment.id);

      if (error) {
        await showError(error.message, "Could not update appointment");
        return;
      }

      await showSuccess(
        `Appointment marked as ${newStatus}.`,
        "Status Updated"
      );
      await load();
    } catch (err) {
      await showError(err.message, "Action failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const deleteAppointment = async (id, clientName) => {
    const result = await confirmAction({
      title: "Delete appointment permanently?",
      text: `This will completely remove the booking record for ${clientName || "this client"}. This cannot be undone.`,
      confirmButtonText: "Delete",
    });

    if (!result.isConfirmed) return;

    setActionLoadingId(id);
    try {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) {
        await showError(error.message, "Could not delete appointment");
        return;
      }

      await showSuccess("Appointment has been deleted.", "Deleted");
      if (selectedAppointment?.id === id) {
        setSelectedAppointment(null);
      }
      await load();
    } catch (err) {
      await showError(err.message, "Delete failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const archiveAppointment = async (appointment) => {
    const result = await confirmAction({
      title: "Archive this appointment?",
      text: `Move ${appointment.full_name}'s booking to the Archives? You can review or restore it at any time.`,
      confirmButtonText: "Yes, archive it",
    });

    if (!result.isConfirmed) return;

    setActionLoadingId(appointment.id);
    try {
      const { error: rpcErr } = await supabase.rpc("archive_appointment", {
        p_appointment_id: appointment.id,
      });

      if (rpcErr) {
        // Fallback direct update
        const { error: updateErr } = await supabase
          .from("appointments")
          .update({ archived: true, archived_at: new Date().toISOString() })
          .eq("id", appointment.id);

        if (updateErr) {
          await showError(rpcErr.message || updateErr.message, "Could not archive appointment");
          return;
        }
      }

      await showSuccess("Appointment moved to Archives.", "Archived");
      if (selectedAppointment?.id === appointment.id) {
        setSelectedAppointment(null);
      }
      await load();
    } catch (err) {
      await showError(err.message, "Archive failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="appointments-panel">
      <div className="appointments-panel__header">
        <div>
          <h2 className="appointments-panel__title">Appointments</h2>
          <p className="appointments-panel__subtitle">Manage and review all booking requests</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link to={adminRoute("archives")} className="appt-btn appt-btn--ghost">
            📦 Archives {archivedCount > 0 ? `(${archivedCount})` : ""}
          </Link>
          <button type="button" className="appt-btn appt-btn--ghost" onClick={load}>
            Refresh
          </button>
        </div>
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

      {loading ? (
        <div className="appointments-panel__empty">Loading appointments...</div>
      ) : appointments.length === 0 ? (
        <div className="appointments-panel__empty">No appointments yet.</div>
      ) : filteredAppointments.length === 0 ? (
        <div className="appointments-panel__empty">
          No appointments match your filters.
        </div>
      ) : (
        <div className="appt-table-wrap">
          <table className="appt-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Treatment</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagination.items.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="appt-table__client">{a.full_name}</div>
                    <div className="appt-table__sub">
                      {a.phone ? `${a.phone} · ` : ""}
                      {a.email || "No email"}
                    </div>
                  </td>
                  <td>
                    <div>{a.treatment}</div>
                    <div className="appt-table__sub">{formatPeso(a.price || a.treatment_price)}</div>
                  </td>
                  <td>{a.appointment_date}</td>
                  <td>{a.appointment_time}</td>
                  <td>
                    <span
                      className={`status-pill ${a.status?.toLowerCase().replace(/\s+/g, "")}`}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td>
                    <div className="appt-table__actions">
                      <button
                        type="button"
                        className="appt-btn appt-btn--ghost"
                        onClick={() => setSelectedAppointment(a)}
                      >
                        Details
                      </button>

                      {a.status === "Pending" && (
                        <>
                          <button
                            type="button"
                            className="appt-btn appt-btn--approve"
                            disabled={actionLoadingId === a.id}
                            onClick={() => updateStatus(a, "Approved")}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="appt-btn appt-btn--danger"
                            disabled={actionLoadingId === a.id}
                            onClick={() =>
                              updateStatus(a, "Cancelled", {
                                title: "Decline appointment?",
                                text: `Decline ${a.full_name}'s request for ${a.treatment} on ${a.appointment_date}?`,
                                btnText: "Decline",
                              })
                            }
                          >
                            Decline
                          </button>
                        </>
                      )}

                      {a.status === "Approved" && (
                        <>
                          <button
                            type="button"
                            className="appt-btn appt-btn--complete"
                            disabled={actionLoadingId === a.id}
                            onClick={() =>
                              updateStatus(a, "Completed", {
                                title: "Mark as Completed?",
                                text: `Confirm that ${a.full_name} has received the ${a.treatment} session?`,
                                btnText: "Mark Completed",
                              })
                            }
                          >
                            Complete
                          </button>
                          <button
                            type="button"
                            className="appt-btn appt-btn--danger"
                            disabled={actionLoadingId === a.id}
                            onClick={() =>
                              updateStatus(a, "Cancelled", {
                                title: "Cancel approved appointment?",
                                text: `Cancel ${a.full_name}'s session on ${a.appointment_date}?`,
                                btnText: "Cancel Session",
                              })
                            }
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        className="appt-btn appt-btn--ghost"
                        disabled={actionLoadingId === a.id}
                        onClick={() => archiveAppointment(a)}
                        title="Move to archives"
                      >
                        Archive
                      </button>
                      <button
                        type="button"
                        className="appt-btn appt-btn--danger"
                        disabled={actionLoadingId === a.id}
                        onClick={() => deleteAppointment(a.id, a.full_name)}
                        title="Delete record"
                      >
                        Delete
                      </button>
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
            aria-labelledby="admin-appointment-modal-title"
          >
            <div className="appt-modal-header">
              <h3 id="admin-appointment-modal-title" className="appt-modal-title">
                Appointment Information
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
                    {selectedAppointment.appointment_date} · {selectedAppointment.appointment_time}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="appt-modal-treatment-price">
                    {formatPeso(selectedAppointment.price || selectedAppointment.treatment_price)}
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
                  <span className="appt-modal-field-label">Customer Name</span>
                  <p className="appt-modal-field-value">{selectedAppointment.full_name}</p>
                </div>
                <div className="appt-modal-field">
                  <span className="appt-modal-field-label">Phone Number</span>
                  <p className="appt-modal-field-value">{selectedAppointment.phone || "—"}</p>
                </div>
                <div className="appt-modal-field appt-modal-field--full">
                  <span className="appt-modal-field-label">Email Address</span>
                  <p className="appt-modal-field-value">{selectedAppointment.email || "—"}</p>
                </div>
                <div className="appt-modal-field">
                  <span className="appt-modal-field-label">Scheduled Date</span>
                  <p className="appt-modal-field-value">{selectedAppointment.appointment_date}</p>
                </div>
                <div className="appt-modal-field">
                  <span className="appt-modal-field-label">Scheduled Time</span>
                  <p className="appt-modal-field-value">{selectedAppointment.appointment_time}</p>
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
                      : "Not required for this treatment"}
                  </p>
                </div>
                {selectedAppointment.created_at && (
                  <div className="appt-modal-field appt-modal-field--full">
                    <span className="appt-modal-field-label">Booked At</span>
                    <p className="appt-modal-field-value">
                      {new Date(selectedAppointment.created_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="appt-modal-footer">
              {selectedAppointment.status === "Pending" && (
                <>
                  <button
                    type="button"
                    className="appt-btn appt-btn--approve"
                    disabled={actionLoadingId === selectedAppointment.id}
                    onClick={() => updateStatus(selectedAppointment, "Approved")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="appt-btn appt-btn--danger"
                    disabled={actionLoadingId === selectedAppointment.id}
                    onClick={() =>
                      updateStatus(selectedAppointment, "Cancelled", {
                        title: "Decline appointment?",
                        text: `Decline ${selectedAppointment.full_name}'s request?`,
                        btnText: "Decline",
                      })
                    }
                  >
                    Decline
                  </button>
                </>
              )}

              {selectedAppointment.status === "Approved" && (
                <>
                  <button
                    type="button"
                    className="appt-btn appt-btn--complete"
                    disabled={actionLoadingId === selectedAppointment.id}
                    onClick={() =>
                      updateStatus(selectedAppointment, "Completed", {
                        title: "Mark as Completed?",
                        text: `Confirm that ${selectedAppointment.full_name} has received the treatment?`,
                        btnText: "Mark Completed",
                      })
                    }
                  >
                    Mark Completed
                  </button>
                  <button
                    type="button"
                    className="appt-btn appt-btn--danger"
                    disabled={actionLoadingId === selectedAppointment.id}
                    onClick={() =>
                      updateStatus(selectedAppointment, "Cancelled", {
                        title: "Cancel session?",
                        text: `Cancel this approved appointment?`,
                        btnText: "Cancel Session",
                      })
                    }
                  >
                    Cancel Session
                  </button>
                </>
              )}

              <button
                type="button"
                className="appt-btn appt-btn--ghost"
                disabled={actionLoadingId === selectedAppointment.id}
                onClick={() => archiveAppointment(selectedAppointment)}
              >
                Archive Record
              </button>
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
