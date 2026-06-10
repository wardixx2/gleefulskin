import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase.js";

export default function AdminDashboard() {
  const [counts, setCounts] = useState({ users: 0, appointments: 0 });

  useEffect(() => {
    const load = async () => {
      const [{ data: users }, { data: appointments }] = await Promise.all([
        supabase.from("profiles").select("id"),
        supabase.from("appointments").select("id"),
      ]);

      setCounts({ users: users?.length || 0, appointments: appointments?.length || 0 });
    };

    load();
  }, []);

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <h3>Total Users</h3>
        <p>{counts.users}</p>
      </div>

      <div className="stat-card">
        <h3>Total Appointments</h3>
        <p>{counts.appointments}</p>
      </div>
    </div>
  );
}
