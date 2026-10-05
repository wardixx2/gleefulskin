import { supabase } from "../lib/supabase.js";
import "../styles/Login.css";

export default function PendingApproval({ profile }) {
  const isRejected = profile?.approval_status === "rejected";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = `${import.meta.env.BASE_URL}login`;
  };

  return (
    <div className="page auth-page">
      <header className="header">
        <h1>GLEEFUL</h1>
        <p>Skin Wellness Center</p>
      </header>

      <div className="login-container">
        <div className="login-card">
          <h2>{isRejected ? "Account Not Approved" : "Awaiting Approval"}</h2>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
            {isRejected
              ? "Your account request was not approved. Please contact the clinic administrator if you believe this is a mistake."
              : "Thank you for creating an account in Gleeful. Please wait a moment while an administrator approves your account."}
          </p>
          {!isRejected && (
            <p style={{ color: "var(--text-subtle)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              You can log out and check back later.
            </p>
          )}
          <button type="button" className="auth-submit-btn" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
