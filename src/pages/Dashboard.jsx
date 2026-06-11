import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import "../styles/Dashboard.css";

export default function Dashboard({ session, profile }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
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

      loading && setLoading(false);
    };

    fetchAppointments();
  }, [session, profile]);

  const upcoming = appointments.filter((item) => item.status !== "Cancelled");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div 
      className={`page dashboard-page admin-layout ${
        isCollapsed ? "sidebar-collapsed" : ""
      }`}
    >
      {/* Mobile structural offset element */}
      <div className="mobile-header-spacer"></div>

      {/* Sidebar - Perfectly matched with AppointmentBooking layout */}
      <aside 
        className={`admin-sidebar ${
          isMobileExpanded ? "mobile-expanded" : "mobile-collapsed"
        }`}
      >
        {/* Persistent Layout Interactive Controls Wrapper */}
        <div className="sidebar-toggle-wrapper">
          {/* Desktop Collapse Arrow Trigger */}
          <button 
            className="sidebar-collapse-toggle" 
            onClick={() => setIsCollapsed(!isCollapsed)}
            type="button"
          >
            {isCollapsed ? "➔" : "←"}
          </button>

          {/* Mobile Hamburg Engine Trigger Button */}
          <button 
            className="sidebar-toggle-btn"
            onClick={() => setIsMobileExpanded(!isMobileExpanded)}
            type="button"
          >
            ☰
          </button>
        </div>

        <div className="sidebar-brand">
          <h2>GLEEFUL</h2>
          <p className="sidebar-role">
            {profile?.role === "admin" ? "Administrator" : "Customer"}
          </p>
        </div>

        <nav className="sidebar-menu">
          <Link to="/dashboard" className="sidebar-link active" title="Dashboard">
            <span className="menu-icon">📊</span>
            <span className="menu-full-label">Dashboard</span>
            <span className="menu-short-label">Dash</span>
          </Link>
          <Link to="/book" className="sidebar-link" title="Book Appointment">
            <span className="menu-icon">📅</span>
            <span className="menu-full-label">Book Appointment</span>
            <span className="menu-short-label">Book</span>
          </Link>
          <Link to="/profile" className="sidebar-link" title="My Profile">
            <span className="menu-icon">👤</span>
            <span className="menu-full-label">My Profile</span>
            <span className="menu-short-label">Prof</span>
          </Link>
          {profile?.role === "admin" && (
            <Link to="/admin" className="sidebar-link" title="Admin Panel">
              <span className="menu-icon">⚙️</span>
              <span className="menu-full-label">Admin Panel</span>
              <span className="menu-short-label">Admin</span>
            </Link>
          )}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <span className="logout-full-label">Logout</span>
            <span className="logout-short-label">Exit</span>
          </button>
        </div>
      </aside>
      

       <main className="admin-main dashboard-main">
        <div className="page-header card">
          <h1>Welcome, <span className="highlight">{profile?.full_name || session?.user?.email}</span></h1>
          <p>Track your upcoming beauty sessions and continue your skincare journey with us.</p>
        </div>

      {/* Main Panel Frame */}
     

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
}