
﻿﻿import { useEffect, useState } from "react";

import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import "../styles/Dashboard.css";

export default function Dashboard({ session, profile }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 🔐 Redirect admins to admin panel
  useEffect(() => {
    if (profile?.role === "admin") {
      navigate("/admin", { replace: true });
    }
  }, [profile, navigate]);

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!session?.user?.id) {
        setAppointments([]);
        setLoading(false);
        return;
      }

      let query = supabase.from("appointments").select(
        "id, full_name, treatment, appointment_date, appointment_time, status, created_at"
      );

      // Admin sees all appointments; regular users see only their own
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
    };

    fetchAppointments();
  }, [session, profile]);

  const upcoming = appointments.filter((item) => item.status !== "Cancelled");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="page dashboard-page">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">Glow & Bloom</div>
        <div className="sidebar-summary">
          <p className="sidebar-role">{profile?.role === "admin" ? "Administrator" : "Customer"}</p>
        </div>
        <nav className="sidebar-nav">
          <Link to="/dashboard" className="sidebar-link active">
            Dashboard
          </Link>
          <Link to="/book" className="sidebar-link">
            Book Appointment
          </Link>
          <Link to="/profile" className="sidebar-link">
            My Profile
          </Link>
          {profile?.role === "admin" && (
            <Link to="/admin" className="sidebar-link">
              Admin Panel
            </Link>
          )}
        </nav>
        <div className="sidebar-footer">
          <button className="sidebar-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <div className="dashboard-welcome card">
          <div className="welcome-content">
            <h2>
              Welcome back, <span className="highlight">{profile?.full_name || session?.user?.email}</span>
            </h2>
            <p>
              {profile?.role === "admin"
                ? "Manage appointments, customers, and treatment schedules from your salon dashboard."
                : "Track your upcoming beauty sessions and continue your skincare journey with us."}
            </p>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <h3>Upcoming Sessions</h3>
            <p>{upcoming.length}</p>
          </div>
          <div className="stat-card">
            <h3>Account Type</h3>
            <p>{profile?.role || "Customer"}</p>
          </div>
        </div>

        <div className="appointments-card card">
          <h2>
            💖 {profile?.role === "admin" ? "All Appointments" : "My Beauty Appointments"}
          </h2>
          {loading ? (
            <p>Loading appointments...</p>
          ) : appointments.length === 0 ? (
            <div className="empty-state">
              <h3>No appointments yet</h3>
              <p>Your next glow-up starts here ✨</p>
              <Link to="/book" className="action-button">
                Book Now
              </Link>
            </div>
          ) : (
            <div className="appointments-list">
              {appointments.map((appointment) => (
                <div key={appointment.id} className="appointment-item">
                  <div className="appointment-info">
                    <strong>{appointment.treatment}</strong>
                    <p>📅 {appointment.appointment_date}</p>
                    <p>⏰ {appointment.appointment_time}</p>
                  </div>
                  <span
                    className={`status-pill ${appointment.status
                      .toLowerCase()
                      .replace(/\s+/g, "")}`}
                  >
                    {appointment.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
