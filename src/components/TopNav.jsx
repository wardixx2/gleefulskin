import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import "../styles/TopNav.css";

export default function TopNav({ profile }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <nav className="topnav">
      <div className="topnav-brand">
        <Link to="/dashboard">Glow & Bloom</Link>
      </div>

      <div className="topnav-links">
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/book">Book</Link>
        <Link to="/inbox">Inbox</Link>
        <Link to="/profile">Profile</Link>
        {profile?.role === "admin" && <Link to="/admin">Admin Panel</Link>}
      </div>

      <button className="topnav-logout" onClick={handleLogout}>
        Log Out
      </button>
    </nav>
  );
}
