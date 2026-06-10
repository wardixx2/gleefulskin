import { useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import "../styles/AdminPanel.css";

export default function AdminPanel({ session, profile }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (profile && profile.role !== "admin") {
      navigate("/dashboard");
    }
  }, [profile, navigate]);

  const items = [
    { key: "dashboard", label: "DASHBOARD", path: "dashboard" },
    { key: "appointments", label: "APPOINTMENTS", path: "appointments" },
    { key: "users", label: "USERS", path: "users" },
    { key: "treatments", label: "TREATMENTS", path: "treatments" },
    { key: "settings", label: "SETTINGS", path: "settings" },
  ];

  const active = (p) => location.pathname.endsWith(p) || (p === "dashboard" && location.pathname === "/admin");

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
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
            >
              {it.label}
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <button
            className="logout-btn"
            onClick={async () => {
              // gracefully sign out if supabase client attached to session
              try {
                if (session?.user) await (await import("../lib/supabase.js")).supabase.auth.signOut();
              } catch {
                /* ignore */
              }
              navigate("/login");
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-header">
          <h1>Admin Panel</h1>
          <p>Welcome back, <span className="highlight">{profile?.full_name || "Admin"}</span></p>
        </div>

        <div style={{ padding: 10 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

