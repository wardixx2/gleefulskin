import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import "../styles/Inbox.css";

export default function Inbox({ session, profile }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const userId = session?.user?.id;

  const fetchNotifications = async () => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("inbox_notifications")
      .select(
        "id, title, message, read_at, created_at, appointment_id, appointment:appointment_id (id, full_name, treatment, appointment_date, appointment_time, status)"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load inbox notifications:", error.message);
      setNotifications([]);
    } else {
      setNotifications(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read_at).length,
    [notifications]
  );

  const markAsRead = async (id) => {
    const { error } = await supabase
      .from("inbox_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Failed to mark as read:", error.message);
      return;
    }

    // optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
  };

  const handleOpenAppointment = async (notification) => {
    await markAsRead(notification.id);

    // No dedicated appointment details page exists; we just go back to dashboard.
    // The notification already includes appointment_date/time/status.
    navigate("/dashboard");
  };

  return (
    <div className="page inbox-page">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">Glow & Bloom</div>
        <div className="sidebar-summary">
          <p className="sidebar-role">{profile?.role === "admin" ? "Administrator" : "Customer"}</p>
          <p className="sidebar-subtle">Inbox: {unreadCount} unread</p>
        </div>
        <nav className="sidebar-nav">
          <Link to="/dashboard" className="sidebar-link">
            Dashboard
          </Link>
          <Link to="/inbox" className="sidebar-link active">
            Inbox
          </Link>
          <Link to="/book" className="sidebar-link">
            Book Appointment
          </Link>
          <Link to="/profile" className="sidebar-link">
            My Profile
          </Link>
        </nav>
      </aside>

      <main className="inbox-main">
        <div className="inbox-header card">
          <h1>Inbox Notifications</h1>
          <p>Appointments will appear here.</p>
        </div>

        <div className="inbox-list card">
          {loading ? (
            <p>Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <div className="empty-state">
              <h3>No notifications yet</h3>
              <p>When you book an appointment, it will show up here ✨</p>
              <Link to="/book" className="action-button">Book Now</Link>
            </div>
          ) : (
            <div className="inbox-items">
              {notifications.map((n) => {
                const appt = n.appointment || null;
                return (
                  <button
                    key={n.id}
                    className={`inbox-item ${n.read_at ? "read" : "unread"}`}
                    onClick={() => handleOpenAppointment(n)}
                  >
                    <div className="inbox-item-top">
                      <div className="inbox-title">
                        {n.title}
                        {!n.read_at && <span className="inbox-unread-dot" />}
                      </div>
                      <div className="inbox-time">
                        {new Date(n.created_at).toLocaleString()}
                      </div>
                    </div>

                    <div className="inbox-message">{n.message}</div>

                    {appt && (
                      <div className="inbox-appointment">
                        <div className="inbox-appointment-row"><strong>Treatment:</strong> {appt.treatment}</div>
                        <div className="inbox-appointment-row"><strong>Date:</strong> {appt.appointment_date}</div>
                        <div className="inbox-appointment-row"><strong>Time:</strong> {appt.appointment_time}</div>
                        <div className="inbox-appointment-row"><strong>Status:</strong> {appt.status}</div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

