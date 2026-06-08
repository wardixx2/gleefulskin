import { useEffect, useState } from "react";
import "../styles/AdminPanel.css";

export default function AdminPanel() {
  const [section, setSection] = useState("dashboard");
  const [appointments, setAppointments] = useState([]);
  const [users, setUsers] = useState([]);

  // 🔥 Auth guard
  useEffect(() => {
    if (
      sessionStorage.getItem("isLoggedIn") !== "true" ||
      sessionStorage.getItem("userRole") !== "admin"
    ) {
      alert("🛑 Access Denied! Admin login required.");
      window.location.href = "login.html";
    }
  }, []);

  // 🔥 Firestore realtime appointments
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "appointments"), (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setAppointments(data);
    });

    return () => unsub();
  }, []);

  // 🔥 Load localStorage users
  useEffect(() => {
    const loadUsers = () => {
      const stored = JSON.parse(localStorage.getItem("usersList")) || [];
      setUsers(stored);
    };

    loadUsers();
    window.addEventListener("storage", loadUsers);
    return () => window.removeEventListener("storage", loadUsers);
  }, []);

  // 📌 Appointment actions
  const updateStatus = async (id, status) => {
    await updateDoc(doc(db, "appointments", id), { status });
  };

  const deleteAppointment = async (id) => {
    if (confirm("Delete this appointment?")) {
      await deleteDoc(doc(db, "appointments", id));
    }
  };

  // 📌 User delete
  const deleteUser = (index) => {
    if (!confirm("Delete this user?")) return;

    const updated = [...users];
    updated.splice(index, 1);
    setUsers(updated);
    localStorage.setItem("usersList", JSON.stringify(updated));
  };

  const logout = () => {
    sessionStorage.clear();
    window.location.href = "login.html";
  };

  return (
    <div className="admin-wrapper">

      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="sidebar-brand">
          <h2>Glow & Bloom</h2>
          <p>Admin Panel 👑</p>
        </div>

        <ul className="sidebar-menu">
          {["dashboard", "appointments", "users", "settings"].map((s) => (
            <li
              key={s}
              className={section === s ? "active" : ""}
              onClick={() => setSection(s)}
            >
              {s.toUpperCase()}
            </li>
          ))}
        </ul>

        <div className="logout-section">
          <button className="logout-btn" onClick={logout}>
            Log Out
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="main-content">

        {/* HEADER */}
        <div className="content-header">
          <h1>
            {{
              dashboard: "Dashboard Overview",
              appointments: "Appointments Tracker",
              users: "Registered Users",
              settings: "Shop Settings",
            }[section]}
          </h1>

          <span>Hello, Admin ✨</span>
        </div>

        {/* DASHBOARD */}
        {section === "dashboard" && (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Customers</h3>
                <p>{users.length}</p>
              </div>

              <div className="stat-card">
                <h3>Appointments</h3>
                <p>{appointments.length}</p>
              </div>
            </div>

            <div className="card">
              Welcome to your Admin Dashboard 💅
            </div>
          </>
        )}

        {/* APPOINTMENTS */}
        {section === "appointments" && (
          <div className="card">
            <h3>Appointments</h3>

            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Service</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan="6">No appointments yet</td>
                  </tr>
                ) : (
                  appointments.map((a) => (
                    <tr key={a.id}>
                      <td>{a.fullName}</td>
                      <td>{a.email}</td>
                      <td>{a.treatment}</td>
                      <td>
                        {a.appointmentDate} <br />
                        <small>{a.appointmentTime}</small>
                      </td>
                      <td>{a.status}</td>
                      <td>
                        {a.status === "Pending" && (
                          <button
                            className="approve-btn"
                            onClick={() =>
                              updateStatus(a.id, "Approved")
                            }
                          >
                            Approve
                          </button>
                        )}

                        <button
                          className="delete-btn"
                          onClick={() => deleteAppointment(a.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* USERS */}
        {section === "users" && (
          <div className="card">
            <h3>Registered Users</h3>

            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Password</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="4">No users found</td>
                  </tr>
                ) : (
                  users.map((u, i) => (
                    <tr key={i}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td><code>{u.password}</code></td>
                      <td>
                        <button
                          className="delete-btn"
                          onClick={() => deleteUser(i)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* SETTINGS */}
        {section === "settings" && (
          <div className="card">
            <h3>Settings</h3>

            <label>Business Name</label>
            <input defaultValue="Glow & Bloom Skin Wellness Center" />

            <label>Business Hours</label>
            <input defaultValue="9:00 AM - 7:00 PM" />

            <button onClick={() => alert("Saved!")}>
              Save Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}