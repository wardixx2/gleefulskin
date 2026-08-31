import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
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
    <div className="customer-profile">
      <section className="appointments-panel">
        <div className="appointments-panel__header">
          <div>
            <h2 className="appointments-panel__title">My Profile</h2>
            <p className="appointments-panel__subtitle">
              Manage your Gleeful account details
            </p>
          </div>
        </div>
        <div className="appointments-panel__body">
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
        </div>
      </section>
    </div>
  );
}
