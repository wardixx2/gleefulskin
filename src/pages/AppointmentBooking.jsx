import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/AppointmentBooking.css";
import "../styles/Dashboard.css";
import { supabase } from "../lib/supabase.js";
import { showError, showWarning } from "../lib/alerts.js";

export default function AppointmentBooking({ session, profile }) {
  const [selectedService, setSelectedService] = useState(null);
  const navigate = useNavigate();

  // Desktop & Mobile Sidebar State Controls
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

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

  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);

  const formatPeso = (value) => {
    if (value === null || value === undefined || value === "") return "₱0";
    const num = typeof value === "number" ? value : Number(value);
    if (Number.isNaN(num)) return "₱0";
    return `₱${num.toLocaleString("en-PH")}`;
  };

  useEffect(() => {
    const loadTreatments = async () => {
      setServicesLoading(true);

      const { data, error } = await supabase
        .from("treatments")
        .select("id, name, price, ors_required, ors_number, ors_amount")
        .eq("active", true)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Failed to load treatments:", error.message);
        setServices([]);
      } else {
        setServices(data || []);
      }
      setServicesLoading(false);
    };

    loadTreatments();
  }, []);

  const handleSelectService = (service) => {
    setSelectedService(service);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedService) {
      await showWarning("Please select a skincare treatment first.");
      return;
    }

    if (!session?.user?.id) {
      await showWarning("Please log in to book an appointment.");
      return;
    }

    try {
      const { error } = await supabase.from("appointments").insert([
        {
          user_id: session.user.id,
          full_name: form.fullName,
          email: form.email,
          phone: form.phone,
          treatment: selectedService.name,
          price: selectedService.price,
          ors_required: selectedService.ors_required,
          ors_number: selectedService.ors_number,
          ors_amount: selectedService.ors_amount,
          appointment_date: form.date,
          appointment_time: form.time,
          status: "Pending",
        },
      ]);

      if (error) {
        await showError(error.message, "Supabase error");
        return;
      }

      setModalOpen(true);
    } catch (err) {
      await showError(err.message, "Unexpected error");
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedService(null);
    setForm({
      fullName: profile?.full_name || "",
      email: session?.user?.email || "",
      phone: "",
      date: "",
      time: "",
    });
  };

  return (
    <div 
      className={`page dashboard-page admin-layout ${
        isCollapsed ? "sidebar-collapsed" : ""
      }`}
    >
      {/* Mobile structural offset element */}
      <div className="mobile-header-spacer"></div>

      <aside 
        className={`admin-sidebar ${
          isMobileExpanded ? "mobile-expanded" : "mobile-collapsed"
        }`}
      >
        {/* Persistent Layout Interactive Controls Wrapper */}
        <div className="sidebar-toggle-wrapper">
          {/* Desktop Collapse Arrow Trigger */}
          <button 
            className="sidebar-collapse-toggle" 
            onClick={() => setIsCollapsed(!isCollapsed)}
            type="button"
          >
            {isCollapsed ? "➔" : "←"}
          </button>

          {/* Mobile Hamburg Engine Trigger Button */}
          <button 
            className="sidebar-toggle-btn"
            onClick={() => setIsMobileExpanded(!isMobileExpanded)}
            type="button"
          >
            ☰
          </button>
        </div>

        <div className="sidebar-brand">
          <h2>GLEEFUL</h2>
          <p className="sidebar-role">
            {profile?.role === "admin" ? "Administrator" : "Customer"}
          </p>
        </div>

        <nav className="sidebar-menu">
          <Link to="/dashboard" className="sidebar-link" title="Dashboard">
            <span className="menu-icon">📊</span>
            <span className="menu-full-label">Dashboard</span>
            <span className="menu-short-label">Dash</span>
          </Link>
          <Link to="/book" className="sidebar-link active" title="Book Appointment">
            <span className="menu-icon">📅</span>
            <span className="menu-full-label">Book Appointment</span>
            <span className="menu-short-label">Book</span>
          </Link>
          <Link to="/profile" className="sidebar-link" title="My Profile">
            <span className="menu-icon">👤</span>
            <span className="menu-full-label">My Profile</span>
            <span className="menu-short-label">Prof</span>
          </Link>
          {profile?.role === "admin" && (
            <Link to="/admin" className="sidebar-link" title="Admin Panel">
              <span className="menu-icon">⚙️</span>
              <span className="menu-full-label">Admin Panel</span>
              <span className="menu-short-label">Admin</span>
            </Link>
          )}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <span className="logout-full-label">Logout</span>
            <span className="logout-short-label">Exit</span>
          </button>
        </div>
      </aside>

      <main className="admin-main dashboard-main">
        <div className="page-header card">
          <h1>Book Your Glow Session</h1>
          <p>Choose the perfect treatment and lock in your next radiant appointment.</p>
        </div>

        <div className="container">
          <div className="grid">
            <div className="card">
              <h2>1. Select a Treatment</h2>
              {servicesLoading ? (
                <p>Loading treatments...</p>
              ) : services.length === 0 ? (
                <p>No treatments available.</p>
              ) : (
                services.map((s) => (
                  <div
                    key={s.id}
                    className={`service-option ${
                      selectedService?.id === s.id ? "selected" : ""
                    }`}
                    onClick={() => handleSelectService(s)}
                  >
                    <div className="service-info">
                      <h4>{s.name}</h4>
                      <p>
                        {s.ors_required ? (
                          <>ORS Required • ORS No: {s.ors_number || "-"}</>
                        ) : (
                          "ORS not required"
                        )}
                      </p>
                    </div>
                    <span className="price">{formatPeso(s.price)}</span>
                  </div>
                ))
              )}
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
            <p>Thank you, <strong>{form.fullName}</strong>!</p>
            <p>
              Service:{" "}
              <span style={{ color: "#B76E79", fontWeight: "bold" }}>
                {selectedService?.name}
              </span>
            </p>
            <p>🗓️ Date: {form.date}</p>
            <p>⏰ Time: {form.time}</p>

            {selectedService?.ors_required ? (
              <p>
                💊 ORS Required • No: {selectedService?.ors_number || "-"} • Amount: {formatPeso(selectedService?.ors_amount)}
              </p>
            ) : (
              <p>💧 ORS not required for this treatment</p>
            )}

            <button className="close-btn" onClick={closeModal}>
              Wonderful!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}