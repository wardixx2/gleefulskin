import { useEffect, useState } from "react";
import "../styles/AppointmentBooking.css";
import { supabase } from "../lib/supabase.js";
import { showError, showWarning } from "../lib/alerts.js";

export default function AppointmentBooking({ session, profile }) {
  const [selectedService, setSelectedService] = useState(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    date: "",
    time: "",
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("booking-date")?.setAttribute("min", today);
  }, [servicesLoading]);

  useEffect(() => {
    if (!session) return;

    setForm((current) => ({
      ...current,
      fullName: profile?.full_name || current.fullName,
      email: session.user.email || current.email,
    }));
  }, [session, profile]);

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

    setSubmitting(true);

    try {
      const { error } = await supabase.from("appointments").insert([
        {
          user_id: session.user.id,
          full_name: form.fullName,
          email: form.email,
          phone: form.phone,
          treatment: selectedService.name,
          price: Number(
            String(selectedService.price)
              .replace(/[₱,]/g, "")
              .trim()
          ),
          ors_required: selectedService.ors_required,
          ors_number: selectedService.ors_number,
          ors_amount: selectedService.ors_amount,
          appointment_date: form.date,
          appointment_time: form.time,
          status: "Pending",
        },
      ]);

      if (error) {
        await showError(error.message, "Could not book appointment");
        return;
      }

      setModalOpen(true);
    } catch (err) {
      await showError(err.message, "Unexpected error");
    } finally {
      setSubmitting(false);
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
    <div className="customer-booking-page">
      <section className="appointments-panel">
        <div className="appointments-panel__header">
          <div>
            <h2 className="appointments-panel__title">Book Appointment</h2>
            <p className="appointments-panel__subtitle">
              Select a treatment, then confirm your details
            </p>
          </div>
        </div>

        <div className="appointments-panel__body">
          <div className="customer-booking">
            <div>
              <h3 className="admin-dashboard__card-title">Treatments</h3>
              {servicesLoading ? (
                <p className="admin-dashboard__meta">Loading treatments...</p>
              ) : services.length === 0 ? (
                <p className="admin-dashboard__meta">No treatments are available right now.</p>
              ) : (
                <div className="customer-booking__list">
                  {services.map((service) => (
                    <button
                      key={service.id}
                      type="button"
                      className={`service-option ${
                        selectedService?.id === service.id ? "selected" : ""
                      }`}
                      onClick={() => setSelectedService(service)}
                    >
                      <div className="service-info">
                        <h4>{service.name}</h4>
                        <p>
                          {service.ors_required
                            ? `ORS required · No. ${service.ors_number || "—"}`
                            : "ORS not required"}
                        </p>
                      </div>
                      <span className="price">{formatPeso(service.price)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="admin-dashboard__card-title">Your details</h3>

              {selectedService ? (
                <div className="customer-booking__picked">
                  <span className="customer-booking__picked-label">Selected treatment</span>
                  <p className="customer-booking__picked-value">
                    {selectedService.name} · {formatPeso(selectedService.price)}
                  </p>
                </div>
              ) : (
                <p className="customer-booking__hint">
                  Choose a treatment on the left to continue.
                </p>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="fullName">Full name</label>
                  <input
                    id="fullName"
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    autoComplete="name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Phone number</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="09XX XXX XXXX"
                    autoComplete="tel"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="booking-date">Preferred date</label>
                  <input
                    id="booking-date"
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="time">Preferred time</label>
                  <select
                    id="time"
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

                <button type="submit" disabled={submitting || !selectedService}>
                  {submitting ? "Booking..." : "Confirm booking"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {modalOpen && (
        <div className="booking-modal" role="dialog" aria-modal="true">
          <div className="booking-modal__card">
            <h3>Appointment requested</h3>
            <p>
              Thank you, <strong>{form.fullName}</strong>. We’ll review your booking shortly.
            </p>
            <p>
              <strong>{selectedService?.name}</strong>
            </p>
            <p>
              {form.date} · {form.time}
            </p>
            {selectedService?.ors_required ? (
              <p>
                ORS required · No. {selectedService?.ors_number || "—"} ·{" "}
                {formatPeso(selectedService?.ors_amount)}
              </p>
            ) : (
              <p>ORS is not required for this treatment.</p>
            )}
            <button type="button" className="booking-modal__close" onClick={closeModal}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
