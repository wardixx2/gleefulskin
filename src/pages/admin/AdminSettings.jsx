import { useState, useEffect } from "react";
import { showSuccess } from "../../lib/alerts.js";

export default function AdminSettings() {
  const [businessName, setBusinessName] = useState("");
  const [hours, setHours] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBusinessName(localStorage.getItem("businessName") || "");
    setHours(localStorage.getItem("businessHours") || "");
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    localStorage.setItem("businessName", businessName.trim());
    localStorage.setItem("businessHours", hours.trim());
    await showSuccess("Business settings were saved on this device.", "Settings saved");
    setSaving(false);
  };

  return (
    <section className="appointments-panel">
      <div className="appointments-panel__header">
        <div>
          <h2 className="appointments-panel__title">System Settings</h2>
          <p className="appointments-panel__subtitle">
            Business configuration for Gleeful Skin Wellness Center
          </p>
        </div>
      </div>

      <div className="appointments-panel__body">
        <form onSubmit={save} className="admin-settings-form">
          <div className="form-group">
            <label htmlFor="businessName">Business name</label>
            <input
              id="businessName"
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Gleeful Skin Wellness Center"
            />
          </div>

          <div className="form-group">
            <label htmlFor="businessHours">Business hours</label>
            <input
              id="businessHours"
              type="text"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="Mon–Sat, 9:00 AM – 6:00 PM"
            />
          </div>

          <button type="submit" className="btn-primary admin-settings-form__save" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </section>
  );
}
