import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase.js";

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("appointments").select("*").order("created_at", { ascending: false });
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
    <div className="card">
      <div className="card-header">
        <h3>All Appointments</h3>
        <button onClick={load}>Refresh</button>
      </div>

      {loading ? (
        <div className="empty-state"><h3>Loading appointments...</h3></div>
      ) : appointments.length === 0 ? (
        <div className="empty-state"><h3>No appointments yet</h3></div>
      ) : (
        <div className="appointments-list">
          {appointments.map((a) => (
            <div key={a.id} className="appointment-item">
              <div className="appointment-info">
                <strong>{a.full_name}</strong>
                <p>{a.treatment}</p>
                <p>{a.appointment_date} • {a.appointment_time}</p>
                <p className={`status-pill ${a.status?.toLowerCase()}`}>{a.status}</p>
              </div>

              <div className="appointment-actions">
                {a.status === "Pending" && (
                  <button className="action-button" onClick={() => updateStatus(a.id, "Approved")}>Approve</button>
                )}
                <button className="action-button secondary" onClick={() => deleteAppointment(a.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
