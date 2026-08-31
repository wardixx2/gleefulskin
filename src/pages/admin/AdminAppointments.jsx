import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { filterAppointments } from "../../lib/appointmentFilters.js";
import { paginateItems } from "../../lib/pagination.js";
import AppointmentsFilterBar from "../../components/AppointmentsFilterBar.jsx";
import AppointmentsPagination from "../../components/AppointmentsPagination.jsx";

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error.message);
      setAppointments([]);
    } else {
      setAppointments(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
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

  const updateStatus = async (id, status) => {
    await supabase.from("appointments").update({ status }).eq("id", id);
    load();
  };

  const deleteAppointment = async (id) => {
    if (!confirm("Delete this appointment?")) return;
    await supabase.from("appointments").delete().eq("id", id);
    load();
  };

  return (
    <div className="appointments-panel">
      <div className="appointments-panel__header">
        <div>
          <h2 className="appointments-panel__title">Appointments</h2>
          <p className="appointments-panel__subtitle">Manage and review all booking requests</p>
        </div>
        <button type="button" className="appt-btn appt-btn--ghost" onClick={load}>
          Refresh
        </button>
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
                    {a.email && <div className="appt-table__sub">{a.email}</div>}
                  </td>
                  <td>{a.treatment}</td>
                  <td>{a.appointment_date}</td>
                  <td>{a.appointment_time}</td>
                  <td>
                    <span className={`status-pill ${a.status?.toLowerCase()}`}>
                      {a.status}
                    </span>
                  </td>
                  <td>
                    <div className="appt-table__actions">
                      {a.status === "Pending" && (
                        <button
                          type="button"
                          className="appt-btn appt-btn--approve"
                          onClick={() => updateStatus(a.id, "Approved")}
                        >
                          Approve
                        </button>
                      )}
                      <button
                        type="button"
                        className="appt-btn appt-btn--danger"
                        onClick={() => deleteAppointment(a.id)}
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
    </div>
  );
}
