import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";
import { paginateItems } from "../../lib/pagination.js";
import { confirmAction, showError, showSuccess } from "../../lib/alerts.js";
import { adminRoute } from "../../lib/adminRoutes.js";
import AppointmentsPagination from "../../components/AppointmentsPagination.jsx";

const formatPeso = (value) => {
  if (value === null || value === undefined || value === "") return "₱0";
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return "₱0";
  return `₱${num.toLocaleString("en-PH")}`;
};

export default function AdminArchives() {
  const [archives, setArchives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const loadArchives = async () => {
    setLoading(true);
    try {
      // Query archived appointments
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("archived", true)
        .order("archived_at", { ascending: false });

      if (error) {
        // Fallback: If archived column is not present or error, try query status = 'Archived'
        const fallback = await supabase
          .from("appointments")
          .select("*")
          .eq("status", "Archived")
          .order("created_at", { ascending: false });

        if (!fallback.error && fallback.data) {
          setArchives(fallback.data);
        } else {
          console.error("Failed to load archives:", error.message);
          setArchives([]);
        }
      } else {
        setArchives(data || []);
      }
    } catch (err) {
      console.error("Error loading archives:", err);
      setArchives([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArchives();
  }, []);

  // Filter archives by search query and status
  const filteredArchives = useMemo(() => {
    let result = archives;

    if (statusFilter !== "all") {
      result = result.filter(
        (item) => (item.status || "").toLowerCase().trim() === statusFilter.toLowerCase()
      );
    }

    const query = search.trim().toLowerCase();
    if (query) {
      result = result.filter((item) =>
        [item.full_name, item.treatment, item.email, item.phone, item.appointment_date, item.status]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(query))
      );
    }

    return result;
  }, [archives, statusFilter, search]);

  const pagination = useMemo(
    () => paginateItems(filteredArchives, currentPage),
    [filteredArchives, currentPage]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, search]);

  const handleRestore = async (appointment) => {
    const result = await confirmAction({
      title: "Restore appointment?",
      text: `Move ${appointment.full_name}'s ${appointment.treatment} appointment back to active appointments?`,
      confirmButtonText: "Yes, restore it",
    });

    if (!result.isConfirmed) return;

    setActionLoadingId(appointment.id);
    try {
      const { error: rpcErr } = await supabase.rpc("restore_appointment", {
        p_appointment_id: appointment.id,
      });

      if (rpcErr) {
        // Fallback direct update
        const { error: updateErr } = await supabase
          .from("appointments")
          .update({ archived: false, archived_at: null })
          .eq("id", appointment.id);

        if (updateErr) {
          await showError(rpcErr.message || updateErr.message, "Could not restore appointment");
          return;
        }
      }

      await showSuccess("Appointment has been restored to active list.", "Restored");
      if (selectedAppointment?.id === appointment.id) {
        setSelectedAppointment(null);
      }
      setSelectedIds((prev) => prev.filter((id) => id !== appointment.id));
      await loadArchives();
    } catch (err) {
      await showError(err.message, "Restore failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeletePermanent = async (appointment) => {
    const result = await confirmAction({
      title: "Permanently delete record?",
      text: `This will permanently delete ${appointment.full_name}'s booking record from the database. This action CANNOT be undone.`,
      confirmButtonText: "Permanently Delete",
    });

    if (!result.isConfirmed) return;

    setActionLoadingId(appointment.id);
    try {
      const { error } = await supabase.from("appointments").delete().eq("id", appointment.id);

      if (error) {
        await showError(error.message, "Could not delete appointment");
        return;
      }

      await showSuccess("Appointment was permanently removed.", "Permanently Deleted");
      if (selectedAppointment?.id === appointment.id) {
        setSelectedAppointment(null);
      }
      setSelectedIds((prev) => prev.filter((id) => id !== appointment.id));
      await loadArchives();
    } catch (err) {
      await showError(err.message, "Deletion failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleBulkRestore = async () => {
    if (selectedIds.length === 0) return;

    const result = await confirmAction({
      title: `Restore ${selectedIds.length} appointments?`,
      text: "These appointments will be moved back to the active list.",
      confirmButtonText: "Restore Selected",
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ archived: false, archived_at: null })
        .in("id", selectedIds);

      if (error) {
        await showError(error.message, "Bulk restore failed");
      } else {
        await showSuccess(`${selectedIds.length} appointments restored successfully.`, "Restored");
        setSelectedIds([]);
        await loadArchives();
      }
    } catch (err) {
      await showError(err.message, "Bulk restore failed");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const result = await confirmAction({
      title: `Permanently delete ${selectedIds.length} records?`,
      text: "This will permanently remove the selected records from the database. This cannot be undone.",
      confirmButtonText: "Delete All Selected",
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("appointments").delete().in("id", selectedIds);

      if (error) {
        await showError(error.message, "Bulk delete failed");
      } else {
        await showSuccess(`${selectedIds.length} records permanently removed.`, "Deleted");
        setSelectedIds([]);
        await loadArchives();
      }
    } catch (err) {
      await showError(err.message, "Bulk delete failed");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === pagination.items.length && pagination.items.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pagination.items.map((item) => item.id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const completedCount = archives.filter(
    (a) => (a.status || "").toLowerCase() === "completed"
  ).length;
  const cancelledCount = archives.filter((a) =>
    ["cancelled", "declined"].includes((a.status || "").toLowerCase())
  ).length;

  return (
    <div className="admin-dashboard">
      <div className="appointments-panel">
        <div className="appointments-panel__header">
          <div>
            <h2 className="appointments-panel__title">Appointment Archives</h2>
            <p className="appointments-panel__subtitle">
              Stored history for past, completed, or cancelled appointments
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Link to={adminRoute("appointments")} className="appt-btn appt-btn--ghost">
              ← Active Appointments
            </Link>
            <button type="button" className="appt-btn appt-btn--ghost" onClick={loadArchives}>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="admin-dashboard__stats">
        <div className="admin-dashboard__stat admin-dashboard__stat--appointments">
          <span className="admin-dashboard__stat-label">Total Archived</span>
          <span className="admin-dashboard__stat-value">{archives.length}</span>
        </div>
        <div className="admin-dashboard__stat admin-dashboard__stat--approved">
          <span className="admin-dashboard__stat-label">Completed Sessions</span>
          <span className="admin-dashboard__stat-value">{completedCount}</span>
        </div>
        <div className="admin-dashboard__stat admin-dashboard__stat--pending">
          <span className="admin-dashboard__stat-label">Cancelled / Declined</span>
          <span className="admin-dashboard__stat-value">{cancelledCount}</span>
        </div>
        <div className="admin-dashboard__stat">
          <span className="admin-dashboard__stat-label">Storage Status</span>
          <span className="admin-dashboard__stat-value" style={{ fontSize: "1rem" }}>
            Safe & Preserved
          </span>
        </div>
      </div>

      <section className="appointments-panel">
        <div className="appt-toolbar">
          <div className="appt-toolbar__row">
            <div className="appt-toolbar__tabs" role="tablist">
              {[
                { id: "all", label: "All Archived", count: archives.length },
                { id: "completed", label: "Completed", count: completedCount },
                { id: "cancelled", label: "Cancelled", count: cancelledCount },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === tab.id}
                  className={`appt-toolbar__tab${statusFilter === tab.id ? " is-active" : ""}`}
                  onClick={() => setStatusFilter(tab.id)}
                >
                  {tab.label}
                  <span className="appt-toolbar__badge">{tab.count}</span>
                </button>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              {selectedIds.length > 0 && (
                <>
                  <button
                    type="button"
                    className="appt-btn appt-btn--approve"
                    onClick={handleBulkRestore}
                  >
                    Restore ({selectedIds.length})
                  </button>
                  <button
                    type="button"
                    className="appt-btn appt-btn--danger"
                    onClick={handleBulkDelete}
                  >
                    Delete ({selectedIds.length})
                  </button>
                </>
              )}
              <span className="appt-toolbar__meta">
                {filteredArchives.length} of {archives.length} shown
              </span>
            </div>
          </div>

          <div className="appt-toolbar__search">
            <svg
              className="appt-toolbar__search-icon"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M9 3.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="m14 14 3.5 3.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="search"
              className="appt-toolbar__search-input"
              placeholder="Search archived client, treatment, or date..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search archives"
            />
          </div>
        </div>

        {loading ? (
          <div className="appointments-panel__empty">Loading archives...</div>
        ) : archives.length === 0 ? (
          <div className="appointments-panel__empty">
            <p>No archived appointments found.</p>
            <p style={{ fontSize: "0.85rem", color: "var(--text-subtle)", marginTop: "0.25rem" }}>
              Completed or cancelled appointments you archive from the Appointments panel will appear here.
            </p>
          </div>
        ) : filteredArchives.length === 0 ? (
          <div className="appointments-panel__empty">No archived records match your search.</div>
        ) : (
          <div className="appt-table-wrap">
            <table className="appt-table">
              <thead>
                <tr>
                  <th style={{ width: "40px" }}>
                    <input
                      type="checkbox"
                      checked={
                        pagination.items.length > 0 &&
                        pagination.items.every((item) => selectedIds.includes(item.id))
                      }
                      onChange={toggleSelectAll}
                      aria-label="Select all on this page"
                    />
                  </th>
                  <th>Client</th>
                  <th>Treatment</th>
                  <th>Appointment Date</th>
                  <th>Status</th>
                  <th>Archived Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagination.items.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(a.id)}
                        onChange={() => toggleSelectOne(a.id)}
                        aria-label={`Select ${a.full_name}`}
                      />
                    </td>
                    <td>
                      <div className="appt-table__client">{a.full_name}</div>
                      <div className="appt-table__sub">
                        {a.phone ? `${a.phone} · ` : ""}
                        {a.email || "No email"}
                      </div>
                    </td>
                    <td>
                      <div>{a.treatment}</div>
                      <div className="appt-table__sub">
                        {formatPeso(a.price || a.treatment_price)}
                      </div>
                    </td>
                    <td>
                      <div>{a.appointment_date}</div>
                      <div className="appt-table__sub">{a.appointment_time}</div>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${a.status?.toLowerCase().replace(/\s+/g, "")}`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: "0.82rem", color: "var(--text-subtle)" }}>
                        {a.archived_at
                          ? new Date(a.archived_at).toLocaleDateString()
                          : a.created_at
                            ? new Date(a.created_at).toLocaleDateString()
                            : "—"}
                      </div>
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
                        <button
                          type="button"
                          className="appt-btn appt-btn--approve"
                          disabled={actionLoadingId === a.id}
                          onClick={() => handleRestore(a)}
                          title="Restore to active appointments"
                        >
                          Restore
                        </button>
                        <button
                          type="button"
                          className="appt-btn appt-btn--danger"
                          disabled={actionLoadingId === a.id}
                          onClick={() => handleDeletePermanent(a)}
                          title="Delete permanently"
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
      </section>

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
            aria-labelledby="archive-modal-title"
          >
            <div className="appt-modal-header">
              <h3 id="archive-modal-title" className="appt-modal-title">
                Archived Appointment Details
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
                      : "Not required"}
                  </p>
                </div>
                {selectedAppointment.archived_at && (
                  <div className="appt-modal-field appt-modal-field--full">
                    <span className="appt-modal-field-label">Archived At</span>
                    <p className="appt-modal-field-value">
                      {new Date(selectedAppointment.archived_at).toLocaleString()}
                    </p>
                  </div>
                )}
                {selectedAppointment.created_at && (
                  <div className="appt-modal-field appt-modal-field--full">
                    <span className="appt-modal-field-label">Original Booking Date</span>
                    <p className="appt-modal-field-value">
                      {new Date(selectedAppointment.created_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="appt-modal-footer">
              <button
                type="button"
                className="appt-btn appt-btn--approve"
                disabled={actionLoadingId === selectedAppointment.id}
                onClick={() => handleRestore(selectedAppointment)}
              >
                Restore to Active
              </button>
              <button
                type="button"
                className="appt-btn appt-btn--danger"
                disabled={actionLoadingId === selectedAppointment.id}
                onClick={() => handleDeletePermanent(selectedAppointment)}
              >
                Permanently Delete
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
