import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import "../styles/Inbox.css";

export default function Inbox({ session }) {
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
        "id, title, message, read_at, created_at, appointment_id, appointment:appointment_id (id, full_name, treatment, appointment_date, appointment_time, status)",
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
    [notifications],
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

    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n,
      ),
    );
  };

  const handleOpenAppointment = async (notification) => {
    await markAsRead(notification.id);
    navigate("/dashboard");
  };

  return (
    <section className="appointments-panel">
      <div className="appointments-panel__header">
        <div>
          <h2 className="appointments-panel__title">Inbox</h2>
          <p className="appointments-panel__subtitle">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
              : "Appointment updates and notifications"}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="appointments-panel__empty">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="appointments-panel__empty">
          <p>No notifications yet. When you book an appointment, it will show up here.</p>
          <div className="customer-empty-action">
            <Link to="/book" className="appt-btn appt-btn--ghost">
              Book Now
            </Link>
          </div>
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
                type="button"
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
                    <div className="inbox-appointment-row">
                      <strong>Treatment:</strong> {appt.treatment}
                    </div>
                    <div className="inbox-appointment-row">
                      <strong>Date:</strong> {appt.appointment_date}
                    </div>
                    <div className="inbox-appointment-row">
                      <strong>Time:</strong> {appt.appointment_time}
                    </div>
                    <div className="inbox-appointment-row">
                      <strong>Status:</strong> {appt.status}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
