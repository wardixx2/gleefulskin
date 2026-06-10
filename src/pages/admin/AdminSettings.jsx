import { useState, useEffect } from "react";

export default function AdminSettings() {
  const [businessName, setBusinessName] = useState("");
  const [hours, setHours] = useState("");

  useEffect(() => {
    setBusinessName(localStorage.getItem("businessName") || "");
    setHours(localStorage.getItem("businessHours") || "");
  }, []);

  const save = () => {
    localStorage.setItem("businessName", businessName);
    localStorage.setItem("businessHours", hours);
    alert("Settings saved locally.");
  };

  return (
    <div className="card">
      <h3>System Settings</h3>
      <div className="welcome-content">
        <p>Business configuration panel</p>
        <input placeholder="Business Name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
        <input placeholder="Business Hours" value={hours} onChange={(e) => setHours(e.target.value)} />
        <button className="action-button" onClick={save}>Save Changes</button>
      </div>
    </div>
  );
}
