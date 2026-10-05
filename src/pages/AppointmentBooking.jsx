import { useEffect, useState } from "react";
import "../styles/AppointmentBooking.css";
import { supabase } from "../lib/supabase.js";
import { showError, showWarning } from "../lib/alerts.js";

const AVAILABLE_TIME_SLOTS = [
  "09:00 AM",
  "10:30 AM",
  "01:00 PM",
  "02:30 PM",
  "04:00 PM",
];

function isSlotInPast(slotStr, selectedDateStr) {
  if (!selectedDateStr) return false;
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const localTodayStr = `${year}-${month}-${day}`;

  if (selectedDateStr !== localTodayStr) {
    return false;
  }

  const match = slotStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return false;
  let [, h, m, meridiem] = match;
  let hours = parseInt(h, 10);
  const minutes = parseInt(m, 10);
  if (meridiem.toUpperCase() === "PM" && hours < 12) hours += 12;
  if (meridiem.toUpperCase() === "AM" && hours === 12) hours = 0;

  const slotDate = new Date();
  slotDate.setHours(hours, minutes, 0, 0);

  return slotDate <= now;
}

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
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

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

  // Fetch booked slots whenever the selected date changes
  useEffect(() => {
    if (!form.date) {
      setBookedSlots([]);
      return;
    }

    let isMounted = true;
    setLoadingSlots(true);

    const fetchBookedSlots = async () => {
      try {
        const { data, error } = await supabase.rpc("get_booked_time_slots", {
          p_date: form.date,
        });

        if (!isMounted) return;

        if (!error && Array.isArray(data)) {
          const slots = data.map((item) =>
            typeof item === "string" ? item : item.appointment_time
          );
          setBookedSlots(slots);
        } else {
          // Fallback direct query if RPC is not yet applied
          const fallback = await supabase
            .from("appointments")
            .select("appointment_time")
            .eq("appointment_date", form.date)
            .in("status", ["Pending", "Approved", "Completed"]);

          if (!isMounted) return;

          if (!fallback.error && fallback.data) {
            setBookedSlots(fallback.data.map((r) => r.appointment_time));
          } else {
            setBookedSlots([]);
          }
        }
      } catch (err) {
        console.error("Failed to check slot availability:", err);
        if (isMounted) setBookedSlots([]);
      } finally {
        if (isMounted) setLoadingSlots(false);
      }
    };

    fetchBookedSlots();

    return () => {
      isMounted = false;
    };
  }, [form.date]);

  // Reset selected time if it becomes booked or past
  useEffect(() => {
    if (!form.time) return;
    const isBooked = bookedSlots.some(
      (b) => b?.trim().toLowerCase() === form.time.trim().toLowerCase()
    );
    const isPast = isSlotInPast(form.time, form.date);
    if (isBooked || isPast) {
      setForm((cur) => ({ ...cur, time: "" }));
    }
  }, [bookedSlots, form.date, form.time]);

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

    if (!form.time) {
      await showWarning("Please select an available preferred time slot.");
      return;
    }

    const isBooked = bookedSlots.some(
      (b) => b?.trim().toLowerCase() === form.time.trim().toLowerCase()
    );
    if (isBooked) {
      await showWarning("This time slot is already booked. Please choose another slot.");
      return;
    }

    if (isSlotInPast(form.time, form.date)) {
      await showWarning("This time slot has already passed for today. Please select a future time slot.");
      return;
    }

    const price = Number(
      String(selectedService.price ?? 0)
        .replace(/[₱,]/g, "")
        .trim()
    );

    setSubmitting(true);

    try {
      const rpcResult = await supabase.rpc("book_customer_appointment", {
        p_full_name: form.fullName.trim(),
        p_email: form.email.trim(),
        p_phone: form.phone.trim(),
        p_treatment: selectedService.name,
        p_price: Number.isFinite(price) ? price : 0,
        p_ors_required: Boolean(selectedService.ors_required),
        p_ors_number: selectedService.ors_number || "",
        p_ors_amount: selectedService.ors_amount ?? null,
        p_appointment_date: form.date,
        p_appointment_time: form.time,
      });

      if (rpcResult.error) {
        const fallback = await supabase.from("appointments").insert([
          {
            user_id: session.user.id,
            full_name: form.fullName.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            treatment: selectedService.name,
            price: Number.isFinite(price) ? price : 0,
            treatment_price: Number.isFinite(price) ? price : 0,
            ors_required: Boolean(selectedService.ors_required),
            ors_number: selectedService.ors_number || null,
            ors_amount: selectedService.ors_amount ?? null,
            appointment_date: form.date,
            appointment_time: form.time,
            status: "Pending",
          },
        ]);

        if (fallback.error) {
          await showError(
            rpcResult.error.message || fallback.error.message,
            "Could not book appointment"
          );
          return;
        }
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
                  Choose a treatment on the left, or pick one below, then confirm your booking.
                </p>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="treatment">Treatment</label>
                  <select
                    id="treatment"
                    name="treatment"
                    value={selectedService?.id || ""}
                    onChange={(e) => {
                      const next = services.find((service) => service.id === e.target.value);
                      setSelectedService(next || null);
                    }}
                    required
                    disabled={servicesLoading || services.length === 0}
                  >
                    <option value="">
                      {servicesLoading
                        ? "Loading treatments..."
                        : services.length === 0
                          ? "No treatments available"
                          : "Select a treatment"}
                    </option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} · {formatPeso(service.price)}
                      </option>
                    ))}
                  </select>
                </div>
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
                  <label htmlFor="time">
                    Preferred time{" "}
                    {loadingSlots && (
                      <span className="slot-loading-hint">(Checking availability...)</span>
                    )}
                  </label>
                  {!form.date ? (
                    <p className="customer-booking__hint" style={{ margin: "0.2rem 0 0.5rem" }}>
                      Please select a preferred date first to view available time slots.
                    </p>
                  ) : (
                    <>
                      <div className="time-slots-grid">
                        {AVAILABLE_TIME_SLOTS.map((slot) => {
                          const isBooked = bookedSlots.some(
                            (b) => b?.trim().toLowerCase() === slot.trim().toLowerCase()
                          );
                          const isPast = isSlotInPast(slot, form.date);
                          const isUnavailable = isBooked || isPast;
                          const isSelected = form.time === slot;

                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={isUnavailable}
                              className={`time-slot-chip ${isSelected ? "selected" : ""} ${
                                isUnavailable ? "unavailable" : ""
                              }`}
                              onClick={() => setForm((cur) => ({ ...cur, time: slot }))}
                            >
                              <span className="time-slot-chip__time">{slot}</span>
                              {isBooked ? (
                                <span className="time-slot-chip__badge booked">Booked</span>
                              ) : isPast ? (
                                <span className="time-slot-chip__badge past">Passed</span>
                              ) : (
                                <span className="time-slot-chip__badge available">Available</span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {AVAILABLE_TIME_SLOTS.every(
                        (slot) =>
                          bookedSlots.some(
                            (b) => b?.trim().toLowerCase() === slot.trim().toLowerCase()
                          ) || isSlotInPast(slot, form.date)
                      ) && (
                        <div className="slots-fully-booked-notice">
                          <span>⚠️ All time slots for this date are unavailable. Please select another date.</span>
                        </div>
                      )}
                    </>
                  )}
                  <input
                    type="hidden"
                    name="time"
                    id="time"
                    value={form.time}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    servicesLoading ||
                    services.length === 0 ||
                    !form.time ||
                    loadingSlots
                  }
                >
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
