import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/AdminPanel.css";
import { supabase } from "../lib/supabase.js";
import TreatmentsPanel from "./TreatmentsPanel.jsx";

  const [section, setSection] = useState("dashboard");
  const [appointments, setAppointments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // 🔐 AUTH GUARD
  useEffect(() => {
    if (profile && profile.role !== "admin") {
      navigate("/dashboard");
    }
  }, [profile, navigate]);

  // 📦 LOAD DATA
  useEffect(() => {
    const loadData = async () => {
      if (!session?.user?.id) return;

      setLoading(true);

      const [{ data: appointmentsData }, { data: usersData }] =
        await Promise.all([
          supabase.from("appointments").select("*").order("created_at", { ascending: false }),
          supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        ]);

      setAppointments(appointmentsData || []);
      setUsers(usersData || []);
      setLoading(false);
    };

    loadData();
  }, [session]);

  // 🔄 REFRESH
  const refreshData = async () => {
    setLoading(true);

    const [{ data: appointmentsData }, { data: usersData }] =
      await Promise.all([
        supabase.from("appointments").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      ]);

    setAppointments(appointmentsData || []);
    setUsers(usersData || []);
    setLoading(false);
  };

  // ✏️ UPDATE STATUS
  const updateStatus = async (id, status) => {
    await supabase.from("appointments").update({ status }).eq("id", id);
    refreshData();
  };

  // 🗑️ DELETE
  const deleteAppointment = async (id) => {
    if (!confirm("Delete this appointment?")) return;

    await supabase.from("appointments").delete().eq("id", id);
    refreshData();
  };

  // 🚪 LOGOUT
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="admin-layout">

      {/* SIDEBAR */}
      <aside className="admin-sidebar">

        <div className="sidebar-brand">
          <h2>GLEEFUL</h2>
          <p>Admin</p>
        </div>

        <div className="sidebar-menu">
          {[
            "dashboard",
            "appointments",
            "users",
            "treatments",
            "settings",
          ].map((item) => (
            <button
              key={item}
              className={section === item ? "active" : ""}
              onClick={() => setSection(item)}
            >
              {item === "treatments" ? "TREATMENTS" : item.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>

      </aside>

      {/* MAIN */}
      <main className="admin-main">

        {/* HEADER */}
        <div className="admin-header">
          <h1>
            {{
              dashboard: "Dashboard Overview",
              appointments: "Appointment Management",
              users: "User Management",
              settings: "System Settings",
            }[section]}
          </h1>

          <p>
            Welcome back, <span className="highlight">{profile?.full_name || "Admin"}</span>
          </p>
        </div>

        {/* DASHBOARD */}
        {section === "dashboard" && (
          <div className="stats-grid">

            <div className="stat-card">
              <h3>Total Users</h3>
              <p>{users.length}</p>
            </div>

            <div className="stat-card">
              <h3>Total Appointments</h3>
              <p>{appointments.length}</p>
            </div>

          </div>
        )}

        {/* APPOINTMENTS */}
        {section === "appointments" && (
          <div className="card">

            <div className="card-header">
              <h3>All Appointments</h3>
              <button onClick={refreshData}>Refresh</button>
            </div>

            {loading ? (
              <div className="empty-state">
                <h3>Loading appointments...</h3>
              </div>
            ) : appointments.length === 0 ? (
              <div className="empty-state">
                <h3>No appointments yet</h3>
                <p>Bookings will appear here once users start scheduling.</p>
              </div>
            ) : (
              <div className="appointments-list">

                {appointments.map((a) => (
                  <div key={a.id} className="appointment-item">

                    <div className="appointment-info">
                      <strong>{a.full_name}</strong>
                      <p>{a.treatment}</p>
                      <p>
                        {a.appointment_date} • {a.appointment_time}
                      </p>
                      <p className={`status-pill ${a.status.toLowerCase()}`}>
                        {a.status}
                      </p>
                    </div>

                    <div className="appointment-actions">
                      {a.status === "Pending" && (
                        <button
                          className="action-button"
                          onClick={() => updateStatus(a.id, "Approved")}
                        >
                          Approve
                        </button>
                      )}

                      <button
                        className="action-button secondary"
                        onClick={() => deleteAppointment(a.id)}
                      >
                        Delete
                      </button>
                    </div>

                  </div>
                ))}

              </div>
            )}
          </div>
        )}

        {/* USERS */}
        {section === "users" && (
          <div className="card">

            <h3>Registered Users</h3>

            {users.length === 0 ? (
              <div className="empty-state">
                <h3>No users found</h3>
              </div>
            ) : (
              <div className="appointments-list">

                {users.map((u) => (
                  <div key={u.id} className="appointment-item">

                    <div className="appointment-info">
                      <strong>{u.email}</strong>
                      <p>Role: {u.role}</p>
                    </div>

                  </div>
                ))}

              </div>
            )}

          </div>
        )}

        {/* TREATMENTS */}
        {section === "treatments" && (
          <TreatmentsPanel onRefreshed={refreshData} />
        )}

        {/* SETTINGS */}
        {section === "settings" && (
          <div className="card">

            <h3>System Settings</h3>

            <div className="welcome-content">
              <p>Business configuration panel</p>

              <input placeholder="Business Name" />
              <input placeholder="Business Hours" />

              <button className="action-button">
                Save Changes
              </button>
            </div>

          </div>
        )}

      </main>
    </div>
  );
