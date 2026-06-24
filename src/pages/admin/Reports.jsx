import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Reports() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReports = async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .order("appointment_date", { ascending: false });

      if (!error) {
        setAppointments(data || []);
      }

      setLoading(false);
    };

    loadReports();
  }, []);

  const today = new Date();

  // Daily Income
  const dailyIncome = appointments
    .filter((item) => {
      if (item.status !== "Approved") return false;

      const date = new Date(item.appointment_date);

      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    })
    .reduce((sum, item) => sum + Number(item.price || 0), 0);

  // Weekly Income
  const weeklyIncome = appointments
    .filter((item) => {
      if (item.status !== "Approved") return false;

      const date = new Date(item.appointment_date);
      const diffDays =
        (today - date) / (1000 * 60 * 60 * 24);

      return diffDays <= 7;
    })
    .reduce((sum, item) => sum + Number(item.price || 0), 0);

  // Monthly Income
  const monthlyIncome = appointments
    .filter((item) => {
      if (item.status !== "Approved") return false;

      const date = new Date(item.appointment_date);

      return (
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    })
    .reduce((sum, item) => sum + Number(item.price || 0), 0);

  // Total Income
  const totalIncome = appointments
    .filter((item) => item.status === "Approved")
    .reduce((sum, item) => sum + Number(item.price || 0), 0);

  const completedAppointments = appointments.filter(
    (item) => item.status === "Approved"
  );

  return (
    <div className="reports-page">
      <h1>📊 Income Reports</h1>

      <div className="reports-grid">
        <div className="report-card">
          <h3>📅 Daily Income</h3>
          <h2>₱{dailyIncome.toLocaleString()}</h2>
        </div>

        <div className="report-card">
          <h3>📆 Weekly Income</h3>
          <h2>₱{weeklyIncome.toLocaleString()}</h2>
        </div>

        <div className="report-card">
          <h3>🗓️ Monthly Income</h3>
          <h2>₱{monthlyIncome.toLocaleString()}</h2>
        </div>

        <div className="report-card">
          <h3>💰 Total Income</h3>
          <h2>₱{totalIncome.toLocaleString()}</h2>
        </div>

        <div className="report-card">
          <h3>✅ Completed Appointments</h3>
          <h2>{completedAppointments.length}</h2>
        </div>
      </div>

      <div className="reports-table-container">
        <h2>Completed Treatments</h2>

        {loading ? (
          <p>Loading reports...</p>
        ) : completedAppointments.length === 0 ? (
          <p>No completed appointments found.</p>
        ) : (
          <table className="reports-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Treatment</th>
                <th>Price</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
  {completedAppointments.map((item) => (
    <tr key={item.id}>
      <td>{item.appointment_date}</td>
      <td>{item.full_name}</td>
      <td>{item.treatment}</td>

      <td>
        ₱{Number(item.price || 0).toLocaleString()}
      </td>

      <td>
        <span
          className={
            item.status === "Completed"
              ? "status-completed"
              : item.status === "Approved"
              ? "status-approved"
              : "status-pending"
          }
        >
          {item.status}
        </span>
      </td>
    </tr>
  ))}
</tbody>
          </table>
        )}
      </div>
    </div>
  );
}