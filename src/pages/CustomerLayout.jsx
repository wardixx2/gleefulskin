import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import Swal from "sweetalert2";
import "../styles/AdminPanel.css";
import "../styles/AdminDashboard.css";
import "../styles/Customer.css";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", shortLabel: "DB", path: "/dashboard" },
  { key: "book", label: "Book Appointment", shortLabel: "BK", path: "/book" },
  { key: "inbox", label: "Inbox", shortLabel: "IN", path: "/inbox" },
  { key: "profile", label: "My Profile", shortLabel: "PR", path: "/profile" },
];

export default function CustomerLayout({ session, profile }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const active = (path) =>
    path === "/dashboard"
      ? location.pathname === "/dashboard"
      : location.pathname.startsWith(path);

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You will be signed out of your Gleeful account.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, logout!",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

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
  };

  return (
    <div className="admin-layout">
      <aside className={`admin-sidebar ${isMobileOpen ? "mobile-expanded" : "mobile-collapsed"}`}>
        <div className="sidebar-toggle-wrapper">
          <button
            className="sidebar-toggle-btn"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            aria-label="Toggle menu"
            type="button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {isMobileOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </>
              )}
            </svg>
          </button>
        </div>

        <div className="sidebar-brand">
          <h2>GLEEFUL</h2>
          <p>Customer</p>
        </div>

        <div className="sidebar-menu">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={active(item.path) ? "active" : ""}
              onClick={() => navigate(item.path)}
              title={item.label}
              aria-current={active(item.path) ? "page" : undefined}
            >
              <span className="menu-short-label">{item.shortLabel}</span>
              <span className="menu-full-label">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout} title="Logout" type="button">
            <span className="logout-short-label">❌</span>
            <span className="logout-full-label">Logout</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
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
          <div className="mobile-header-spacer"></div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              flex: 1,
            }}
          >
            <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "600", color: "#111827" }}>
              Customer Portal
            </h1>
            <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#6b7280" }}>
              Welcome back,{" "}
              <span style={{ fontWeight: "600", color: "#111827" }}>
                {profile?.full_name || session?.user?.email || "Guest"}
              </span>
            </p>
          </div>

          <button
            type="button"
            className={`notification-badge customer-header-action${
              location.pathname.startsWith("/book") ? " is-hidden" : ""
            }`}
            onClick={() => navigate("/book")}
          >
            <span>Book a session</span>
          </button>
        </div>

        <Outlet />
      </main>
    </div>
  );
}
