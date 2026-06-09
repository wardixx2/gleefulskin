import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/AppointmentBooking.css";
import "../styles/Dashboard.css";
import { supabase } from "../lib/supabase.js";

export default function AppointmentBooking({ session, profile }) {
  const [selectedService, setSelectedService] = useState(null);
  const [selectedPrice, setSelectedPrice] = useState("");
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    date: "",
    time: "",
  });
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("date")?.setAttribute("min", today);
  }, []);

  useEffect(() => {
    if (!session) return;

    setForm((current) => ({
      ...current,
      fullName: profile?.full_name || current.fullName,
      email: session.user.email || current.email,
    }));
  }, [session, profile]);

  const services = [
    {
      name: "Signature Glow Facial",
      desc: "60 mins • Deep cleansing & hydration",
      price: "$75",
    },
    {
      name: "Acne Clarifying Therapy",
      desc: "45 mins • Target blemishes & redness",
      price: "$90",
    },
    {
      name: "Laser Skin Rejuvenation",
      desc: "75 mins • Anti-aging & collagen boost",
      price: "$150",
    },
    {
      name: "Radiant Chemical Peel",
      desc: "30 mins • Exfoliation & skin brightening",
      price: "$110",
    },
  ];

  const handleSelectService = (service) => {
    setSelectedService(service.name);
    setSelectedPrice(service.price);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedService) {
      alert("Please select a skincare treatment first ✨");
      return;
    }

    if (!session?.user?.id) {
      alert("Please log in to book an appointment.");
      return;
    }

    try {
      const { error } = await supabase.from("appointments").insert([
        {
          user_id: session.user.id,
          full_name: form.fullName,
          email: form.email,
          phone: form.phone,
          treatment: selectedService,
          price: selectedPrice,
          appointment_date: form.date,
          appointment_time: form.time,
          status: "Pending",
        },
      ]);

      if (error) {
        alert("Supabase Error: " + error.message);
        return;
      }

      setModalOpen(true);
    } catch (err) {
      alert("Unexpected Error: " + err.message);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedService(null);
    setSelectedPrice("");
    setForm({
      fullName: profile?.full_name || "",
      email: session?.user?.email || "",
      phone: "",
      date: "",
      time: "",
    });
  };

  return (
    <div className="page dashboard-page">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">Glow & Bloom</div>
        <div className="sidebar-summary">
          <p className="sidebar-role">{profile?.role === "admin" ? "Administrator" : "Customer"}</p>
        </div>
        <nav className="sidebar-nav">
          <Link to="/dashboard" className="sidebar-link">
            Dashboard
          </Link>
          <Link to="/book" className="sidebar-link active">
            Book Appointment
          </Link>
          <Link to="/profile" className="sidebar-link">
            My Profile
          </Link>
          {profile?.role === "admin" && (
            <Link to="/admin" className="sidebar-link">
              Admin Panel
            </Link>
          )}
        </nav>
        <div className="sidebar-footer">
          <button className="sidebar-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
          <div className="page-header card">
            <h1>Book Your Glow Session</h1>
            <p>Choose the perfect treatment and lock in your next radiant appointment.</p>
          </div>

          <div className="container">
            <div className="grid">
              <div className="card">
                <h2>1. Select a Treatment</h2>
                {services.map((s, i) => (
                  <div
                    key={i}
                    className={`service-option ${
                      selectedService === s.name ? "selected" : ""
                    }`}
                    onClick={() => handleSelectService(s)}
                  >
                    <div className="service-info">
                      <h4>{s.name}</h4>
                      <p>{s.desc}</p>
                    </div>
                    <span className="price">{s.price}</span>
                  </div>
                ))}
              </div>

              <div className="card">
                <h2>2. Your Details</h2>

                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      name="fullName"
                      value={form.fullName}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Preferred Date</label>
                    <input
                      id="date"
                      type="date"
                      name="date"
                      value={form.date}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Preferred Time</label>
                    <select
                      name="time"
                      value={form.time}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select a time slot</option>
                      <option>09:00 AM</option>
                      <option>10:30 AM</option>
                      <option>01:00 PM</option>
                      <option>02:30 PM</option>
                      <option>04:00 PM</option>
                    </select>
                  </div>

                  <button type="submit">Book My Glow Session</button>
                </form>
              </div>
            </div>
          </div>
      </main>

      {modalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h3>✨ Appointment Requested! ✨</h3>
            <p>
              Thank you, <strong>{form.fullName}</strong>!
            </p>
            <p>
              Service: <span style={{ color: "#B76E79", fontWeight: "bold" }}>
                {selectedService}
              </span>
            </p>
            <p>🗓️ Date: {form.date}</p>
            <p>⏰ Time: {form.time}</p>
            <button className="close-btn" onClick={closeModal}>
              Wonderful!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
