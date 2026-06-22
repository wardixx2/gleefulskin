import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase.js";
import "../../styles/Dashboard.css";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    appointments: 0,
    dailyIncome: 0,
    weeklyIncome: 0,
    monthlyIncome: 0,
    totalIncome: 0,
  });

  const [topTreatment, setTopTreatment] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    const [{ data: users }, { data: appointments }] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("appointments").select("*"),
    ]);

    const today = new Date();

    const startOfWeek = new Date();
    startOfWeek.setDate(today.getDate() - today.getDay());

    let dailyIncome = 0;
    let weeklyIncome = 0;
    let monthlyIncome = 0;
    let totalIncome = 0;

    const treatmentCount = {};

    appointments?.forEach((item) => {
      const amount = Number(item.price || 0);
      const date = new Date(item.appointment_date);

      totalIncome += amount;

      if (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      ) {
        dailyIncome += amount;
      }

      if (date >= startOfWeek && date <= today) {
        weeklyIncome += amount;
      }

      if (
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      ) {
        monthlyIncome += amount;
      }

      if (item.treatment) {
        treatmentCount[item.treatment] =
          (treatmentCount[item.treatment] || 0) + 1;
      }
    });

    let mostBooked = null;
    let highestCount = 0;

    Object.entries(treatmentCount).forEach(([name, count]) => {
      if (count > highestCount) {
        highestCount = count;
        mostBooked = name;
      }
    });

    setTopTreatment({
      name: mostBooked,
      bookings: highestCount,
    });

    setStats({
      users: users?.length || 0,
      appointments: appointments?.length || 0,
      dailyIncome,
      weeklyIncome,
      monthlyIncome,
      totalIncome,
    });
  };

  return (
    <div className="admin-dashboard-container">
      <div className="admin-dashboard-header">
        <div>
          <h1>📊 Business Analytics</h1>
          <p>Gleeful Skin Wellness Center Dashboard</p>
        </div>
      </div>

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <span>👥</span>
          <div>
            <h4>Total Users</h4>
            <h2>{stats.users}</h2>
          </div>
        </div>

        <div className="admin-stat-card">
          <span>📅</span>
          <div>
            <h4>Total Appointments</h4>
            <h2>{stats.appointments}</h2>
          </div>
        </div>

        <div className="admin-stat-card">
          <span>💵</span>
          <div>
            <h4>Daily Income</h4>
            <h2>₱{stats.dailyIncome.toLocaleString()}</h2>
          </div>
        </div>

        <div className="admin-stat-card">
          <span>📈</span>
          <div>
            <h4>Weekly Income</h4>
            <h2>₱{stats.weeklyIncome.toLocaleString()}</h2>
          </div>
        </div>

        <div className="admin-stat-card">
          <span>📊</span>
          <div>
            <h4>Monthly Income</h4>
            <h2>₱{stats.monthlyIncome.toLocaleString()}</h2>
          </div>
        </div>

        <div className="admin-stat-card">
          <span>💰</span>
          <div>
            <h4>Total Income</h4>
            <h2>₱{stats.totalIncome.toLocaleString()}</h2>
          </div>
        </div>
      </div>

      <div className="admin-summary-grid">
        <div className="admin-card">
          <h3>🏆 Top Treatment</h3>

          {topTreatment?.name ? (
            <>
              <h2>{topTreatment.name}</h2>
              <p>{topTreatment.bookings} bookings</p>
            </>
          ) : (
            <p>No treatment data yet.</p>
          )}
        </div>

        <div className="admin-card">
          <h3>📌 Business Summary</h3>
          <p>
            Monitor customer appointments, treatment popularity,
            and income performance in real time.
          </p>
        </div>
      </div>
    </div>
  );
}