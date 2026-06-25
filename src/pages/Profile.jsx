import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import "../styles/Dashboard.css";
import "../styles/Profile.css";

export default function Profile({ session, profile }) {
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [role, setRole] = useState(profile?.role || "customer");
  const [email, setEmail] = useState(session?.user?.email || "");
  const [joinedAt, setJoinedAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setFullName(profile?.full_name || "");
    setRole(profile?.role || "customer");
    setEmail(session?.user?.email || "");

    const fetchCreatedAt = async () => {
      if (!session?.user?.id) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("created_at")
        .eq("id", session.user.id)
        .single();

      if (!error && data?.created_at) {
        setJoinedAt(new Date(data.created_at).toLocaleDateString());
      }
    };

    fetchCreatedAt();
  }, [profile, session]);

  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!session?.user?.id) return;

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", session.user.id);

    if (error) {
      setMessage("Unable to save profile: " + error.message);
    } else {
      setMessage("Profile updated successfully.");
    }

    setSaving(false);
  };

  return (
    <div className="page dashboard-page">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">GLEEFUL</div>
        <div className="sidebar-summary">
          <p className="sidebar-role">{profile?.role === "admin" ? "Administrator" : "Customer"}</p>
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
          <button className="sidebar-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <div className="page-header card">
          <h1>My Profile</h1>
          <p>Manage your Glow & Bloom account details and keep your profile radiant.</p>
        </div>

        <div className="profile-container">
          <div className="card profile-card">
            <h2>Account Information</h2>

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input type="email" value={email} disabled />
              </div>

              <div className="form-group">
                <label>Account Role</label>
                <input type="text" value={role} disabled />
              </div>

              <div className="form-group">
                <label>Member Since</label>
                <input type="text" value={joinedAt || "Loading..."} disabled />
              </div>

              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </form>

            {message && <p className="form-message">{message}</p>}
          </div>
        </div>
      </main>
    </div>
  );
}
