import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase.js";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);

  const load = async () => {
    const { data, error } = await supabase.from("profiles").select("id, full_name, role, created_at, email");
    if (error) {
      console.error(error.message);
      setUsers([]);
      return;
    }
    setUsers(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleRole = async (u) => {
    const newRole = u.role === "admin" ? "customer" : "admin";
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", u.id);
    if (error) return alert("Failed to update role: " + error.message);
    load();
  };

  return (
    <div className="card">
      <h3>Registered Users</h3>

      {users.length === 0 ? (
        <div className="empty-state"><h3>No users found</h3></div>
      ) : (
        <div className="appointments-list">
          {users.map((u) => (
            <div key={u.id} className="appointment-item">
              <div className="appointment-info">
                <strong>{u.full_name || u.email}</strong>
                <p>Role: {u.role}</p>
                <p>Joined: {new Date(u.created_at).toLocaleDateString()}</p>
              </div>
              <div className="appointment-actions">
                <button className="action-button" onClick={() => toggleRole(u)}>
                  {u.role === "admin" ? "Demote" : "Promote"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
