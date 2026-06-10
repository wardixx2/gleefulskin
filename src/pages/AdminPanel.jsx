import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import Swal from "sweetalert2";
import "../styles/AdminPanel.css";

export default function AdminPanel({ session, profile }) {
  const [pendingItems, setPendingItems] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);

  // Inbox notification count (for customers)
  const [inboxNotificationsCount, setInboxNotificationsCount] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();

  const pendingBookingsCount = pendingItems.length;

  useEffect(() => {
    if (profile && profile.role !== "admin") {
      navigate("/dashboard");
    }
  }, [profile, navigate]);

  // Load pending records and subscribe to live status updates
  useEffect(() => {
    const loadPendingData = async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(
          "id, client_name, treatment_name, appointment_date, appointment_time, status",
        )
        .eq("status", "Pending")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setPendingItems(data);
      }
    };

    loadPendingData();

    const appointmentsSubscription = supabase
      .channel("admin-appointments-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        (payload) => {
          loadPendingData();

          if (
            payload.eventType === "INSERT" &&
            payload.new.status === "Pending"
          ) {
            const Toast = Swal.mixin({
              toast: true,
              position: "top-end",
              showConfirmButton: false,
              timer: 3000,
              timerProgressBar: true,
              didOpen: (toast) => {
                toast.onmouseenter = Swal.stopTimer;
                toast.onmouseleave = Swal.resumeTimer;
              },
            });
            Toast.fire({
              icon: "info",
              title: `New booking request from ${payload.new.client_name || "a client"}!`,
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(appointmentsSubscription);
    };
  }, []);

  const items = [
    {
      key: "dashboard",
      label: "Dashboard",
      shortLabel: "DB",
      path: "dashboard",
    },
    {
      key: "appointments",
      label: "Appointments",
      shortLabel: "AP",
      path: "appointments",
    },
    { key: "users", label: "Users", shortLabel: "US", path: "users" },
    {
      key: "treatments",
      label: "Treatments",
      shortLabel: "TR",
      path: "treatments",
    },
    { key: "settings", label: "Settings", shortLabel: "ST", path: "settings" },
  ];

  const active = (p) =>
    location.pathname.endsWith(p) ||
    (p === "dashboard" && location.pathname === "/admin");

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You will be signed out of the Admin Panel.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, logout!",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        if (session?.user) {
          await supabase.auth.signOut();
        }
      } catch (error) {
        console.error("Logout error", error);
      }

      await Swal.fire({
        title: "Logged Out",
        text: "You have been successfully signed out.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });

      navigate("/login");
    }
  };

  const handleApproveFromInbox = async (id, e) => {
    e.stopPropagation(); // Prevents triggers from firing regular select actions

    const { error } = await supabase
      .from("appointments")
      .update({ status: "Approved" })
      .eq("id", id);

    if (error) {
      Swal.fire("Error", "Could not update appointment.", "error");
    } else {
      Swal.fire({
        title: "Approved!",
        text: "Appointment moved to approved records.",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      });
    }
  };

  // NEW: Handles picking an appointment, closing the inbox, and forwarding its ID to the view page
  const handleSelectAppointment = (id) => {
    setIsInboxOpen(false);
    // Navigate to appointments route with a clean query string parameter (?selectedId=...)
    navigate(`appointments?selectedId=${id}`);
  };

  return (
    <div
      className={`admin-layout ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
      style={{ position: "relative" }}
    >
      <aside className="admin-sidebar">
        <button
          className="sidebar-collapse-toggle"
          onClick={() => setSidebarCollapsed((current) => !current)}
          type="button"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? ">" : "<"}
        </button>

        <div className="sidebar-brand">
          <h2>GLEEFUL</h2>
          <p>Admin</p>
        </div>

        <div className="sidebar-menu">
          {items.map((it) => (
            <button
              key={it.key}
              className={active(it.path) ? "active" : ""}
              onClick={() => navigate(it.path)}
              title={it.label}
            >
              <span className="menu-short-label">{it.shortLabel}</span>
              <span className="menu-full-label">{it.label}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <span className="logout-short-label">LO</span>
            <span className="logout-full-label">Logout</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        {/* Balanced Header Container */}
        <div
          className="admin-header admin-header-row"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            padding: "16px 24px",
            background: "#ffffff",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <div style={{ width: "48px" }} aria-hidden="true"></div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              flex: 1,
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: "24px",
                fontWeight: "600",
                color: "#111827",
              }}
            >
              Admin Panel
            </h1>
            <p
              style={{
                margin: "4px 0 0 0",
                fontSize: "14px",
                color: "#6b7280",
              }}
            >
              Welcome back,{" "}
              <span
                className="highlight"
                style={{ fontWeight: "600", color: "#111827" }}
              >
                {profile?.full_name || "Admin"}
              </span>
            </p>
          </div>

          <div
            className="notification-bell-container"
            onClick={() => setIsInboxOpen(!isInboxOpen)}
            style={{
              position: "relative",
              cursor: "pointer",
              padding: "8px",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: isInboxOpen ? "#f3f4f6" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background-color 0.2s",
            }}
            title={`${inboxNotificationsCount} New Inbox Notifications`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              stroke={isInboxOpen ? "#111827" : "#4b5563"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>

            {pendingBookingsCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "4px",
                  right: "4px",
                  background: "#ef4444",
                  color: "white",
                  borderRadius: "50%",
                  padding: "2px 5px",
                  fontSize: "10px",
                  fontWeight: "700",
                  minWidth: "16px",
                  height: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 0 2px #ffffff",
                }}
              >
                {pendingBookingsCount}
              </span>
            )}
          </div>
        </div>

        {/* --- PREMIUM SASS PRO INBOX PANEL --- */}
        {isInboxOpen && (
          <div
            style={{
              position: "absolute",
              top: "75px",
              right: "24px",
              width: "380px",
              maxHeight: "520px",
              backgroundColor: "#ffffff",
              boxShadow:
                "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              borderRadius: "16px",
              zIndex: 1000,
              overflow: "hidden",
              border: "1px solid #e5e7eb",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                padding: "16px 20px",
                borderBottom: "1px solid #f3f4f6",
              }}
            >
              <div style={{ textAlign: "left" }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "16px",
                    fontWeight: "600",
                    color: "#111827",
                    textAlign: "left",
                  }}
                >
                  Notifications
                </h3>
                <p
                  style={{
                    margin: "2px 0 0 0",
                    fontSize: "12px",
                    color: "#6b7280",
                    textAlign: "left",
                  }}
                >
                  You have {pendingBookingsCount} new booking requests
                </p>
              </div>
              <button
                onClick={() => setIsInboxOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  lineHeight: "1",
                  cursor: "pointer",
                  color: "#9ca3af",
                  padding: "0 4px",
                  marginTop: "-4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                &times;
              </button>
            </div>

            <div
              style={{
                overflowY: "auto",
                padding: "8px",
                maxHeight: "400px",
                backgroundColor: "#f9fafb",
              }}
            >
              {pendingItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px" }}>
                  <div style={{ fontSize: "32px", marginBottom: "8px" }}>
                    🎉
                  </div>
                  <h4
                    style={{
                      margin: "0 0 4px 0",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                    }}
                  >
                    All caught up!
                  </h4>
                  <p style={{ margin: 0, fontSize: "12px", color: "#9ca3af" }}>
                    No pending requests requiring review.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {pendingItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectAppointment(item.id)} // Selecting item sends parameter to layout child
                      style={{
                        borderRadius: "12px",
                        padding: "16px",
                        backgroundColor: "#ffffff",
                        border: "1px solid #e5e7eb",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#cbd5e1";
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow =
                          "0 4px 6px -1px rgba(0, 0, 0, 0.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#e5e7eb";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow =
                          "0 1px 2px 0 rgba(0, 0, 0, 0.05)";
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "8px",
                        }}
                      >
                        <span
                          style={{
                            backgroundColor: "#fef3c7",
                            color: "#d97706",
                            padding: "2px 8px",
                            borderRadius: "9999px",
                            fontSize: "11px",
                            fontWeight: "600",
                            letterSpacing: "0.05em",
                          }}
                        >
                          PENDING
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            color: "#9ca3af",
                            fontWeight: "500",
                          }}
                        >
                          {item.appointment_time}
                        </span>
                      </div>

                      <h4
                        style={{
                          margin: "0 0 4px 0",
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#111827",
                          textAlign: "left",
                        }}
                      >
                        {item.client_name || "Guest User"}
                      </h4>
                      <p
                        style={{
                          margin: "0 0 12px 0",
                          fontSize: "13px",
                          color: "#4b5563",
                          lineHeight: "1.4",
                          textAlign: "left",
                        }}
                      >
                        Requested{" "}
                        <strong style={{ color: "#1f2937", fontWeight: "500" }}>
                          {item.treatment_name}
                        </strong>{" "}
                        on {item.appointment_date}.
                      </p>

                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={(e) => handleApproveFromInbox(item.id, e)} // Approving removes card instantly
                          style={{
                            flex: 1,
                            backgroundColor: "#10b981",
                            color: "white",
                            border: "none",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: "pointer",
                            transition: "background-color 0.15s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor = "#059669")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor = "#10b981")
                          }
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleSelectAppointment(item.id)}
                          style={{
                            backgroundColor: "#f3f4f6",
                            color: "#374151",
                            border: "none",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: "500",
                            cursor: "pointer",
                            transition: "background-color 0.15s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor = "#e5e7eb")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor = "#f3f4f6")
                          }
                        >
                          Review Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              onClick={() => {
                setIsInboxOpen(false);
                navigate("appointments");
              }}
              style={{
                textAlign: "center",
                padding: "12px",
                fontSize: "13px",
                fontWeight: "500",
                color: "#2563eb",
                backgroundColor: "#ffffff",
                borderTop: "1px solid #f3f4f6",
                cursor: "pointer",
                transition: "background-color 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#f8fafc")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#ffffff")
              }
            >
              See all appointments
            </div>
          </div>
        )}

        <div style={{ padding: 10 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
