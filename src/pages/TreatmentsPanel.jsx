import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { confirmAction, showError, showSuccess, showWarning } from "../lib/alerts.js";
import { filterTreatments } from "../lib/treatmentFilters.js";
import { paginateItems } from "../lib/pagination.js";
import TreatmentsFilterBar from "../components/TreatmentsFilterBar.jsx";
import AppointmentsPagination from "../components/AppointmentsPagination.jsx";
import "../styles/TreatmentsPanel.css";

function formatPeso(value) {
  if (value === null || value === undefined || value === "") return "₱0";
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return "₱0";
  return `₱${num.toLocaleString("en-PH")}`;
}

const EMPTY_FORM = {
  id: null,
  name: "",
  price: "",
  ors_required: false,
  ors_number: "",
  ors_amount: "",
  active: true,
};

function TreatmentForm({ form, saving, onChange, onSave, onCancel }) {
  const isEditing = Boolean(form.id);

  return (
    <div className="treatments-form-card">
      <h3 id="treatment-form-title" className="treatments-form-card__title">
        {isEditing ? "Edit Treatment" : "Add Treatment"}
      </h3>

      <div className="form-group">
        <label htmlFor="treatment-name">Treatment Name</label>
        <input
          id="treatment-name"
          name="name"
          value={form.name}
          onChange={onChange}
          placeholder="e.g. Signature Glow Facial"
        />
      </div>

      <div className="form-group">
        <label htmlFor="treatment-price">Price (PHP)</label>
        <input
          id="treatment-price"
          name="price"
          type="number"
          min="0"
          value={form.price}
          onChange={onChange}
          placeholder="e.g. 750"
        />
      </div>

      <label className="form-check">
        <input
          type="checkbox"
          name="ors_required"
          checked={form.ors_required}
          onChange={onChange}
        />
        ORS Required
      </label>

      {form.ors_required && (
        <>
          <div className="form-group">
            <label htmlFor="ors-number">ORS Number</label>
            <input
              id="ors-number"
              name="ors_number"
              value={form.ors_number}
              onChange={onChange}
              placeholder="e.g. 1 / 2 / 3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="ors-amount">ORS Amount (PHP)</label>
            <input
              id="ors-amount"
              name="ors_amount"
              type="number"
              min="0"
              value={form.ors_amount}
              onChange={onChange}
              placeholder="e.g. 500"
            />
          </div>
        </>
      )}

      <label className="form-check">
        <input
          type="checkbox"
          name="active"
          checked={form.active}
          onChange={onChange}
        />
        Active (visible to customers)
      </label>

      <div className="treatments-form-card__actions">
        <button
          type="button"
          className="appt-btn appt-btn--approve"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "Saving..." : isEditing ? "Update" : "Add Treatment"}
        </button>
        <button
          type="button"
          className="appt-btn appt-btn--ghost"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function TreatmentsPanel({ onRefreshed }) {
  const [loading, setLoading] = useState(true);
  const [treatments, setTreatments] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const loadTreatments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("treatments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load treatments:", error.message);
      setTreatments([]);
    } else {
      setTreatments(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTreatments();
  }, []);

  const filteredTreatments = useMemo(
    () => filterTreatments(treatments, { status: statusFilter, search }),
    [treatments, statusFilter, search]
  );

  const pagination = useMemo(
    () => paginateItems(filteredTreatments, currentPage),
    [filteredTreatments, currentPage]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, search]);

  const closeForm = () => {
    setIsFormOpen(false);
    setForm(EMPTY_FORM);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((cur) => ({
      ...cur,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAddNew = () => {
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const handleEdit = (treatment) => {
    setForm({
      id: treatment.id,
      name: treatment.name || "",
      price: treatment.price ?? "",
      ors_required: !!treatment.ors_required,
      ors_number: treatment.ors_number || "",
      ors_amount: treatment.ors_amount ?? "",
      active: !!treatment.active,
    });
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      await showWarning("Treatment name is required.");
      return;
    }

    const priceNum = Number(form.price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      await showWarning("Treatment price must be a valid non-negative number.");
      return;
    }

    const orsAmountNum = form.ors_amount === "" ? null : Number(form.ors_amount);
    if (orsAmountNum !== null && (Number.isNaN(orsAmountNum) || orsAmountNum < 0)) {
      await showWarning("ORS amount must be a valid non-negative number.");
      return;
    }

    if (form.ors_required && !String(form.ors_number || "").trim()) {
      await showWarning("ORS number is required when ORS required is checked.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        price: priceNum,
        ors_required: !!form.ors_required,
        ors_number: form.ors_required ? form.ors_number.trim() : null,
        ors_amount: orsAmountNum,
        active: !!form.active,
      };

      const { error } = form.id
        ? await supabase.from("treatments").update(payload).eq("id", form.id)
        : await supabase.from("treatments").insert(payload);

      if (error) throw error;

      closeForm();
      await loadTreatments();
      onRefreshed?.();
      await showSuccess("Treatment saved successfully.");
    } catch (e) {
      await showError(e.message, "Failed to save treatment");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (treatment) => {
    const { error } = await supabase
      .from("treatments")
      .update({ active: !treatment.active })
      .eq("id", treatment.id);

    if (error) {
      await showError(error.message, "Failed to update treatment");
      return;
    }

    await loadTreatments();
    onRefreshed?.();
  };

  const handleDelete = async (treatment) => {
    const result = await confirmAction({
      title: "Delete treatment?",
      text: `This will remove "${treatment.name}" from the treatments list.`,
      confirmButtonText: "Delete",
    });

    if (!result.isConfirmed) return;

    const { error } = await supabase.from("treatments").delete().eq("id", treatment.id);
    if (error) {
      await showError(error.message, "Failed to delete treatment");
      return;
    }

    if (form.id === treatment.id) {
      closeForm();
    }

    await loadTreatments();
    onRefreshed?.();
    await showSuccess("Treatment deleted successfully.");
  };

  return (
    <div className="treatments-panel">
      <div className="appointments-panel">
        <div className="appointments-panel__header">
          <div>
            <h2 className="appointments-panel__title">Treatments</h2>
            <p className="appointments-panel__subtitle">
              Manage services shown to customers during booking
            </p>
          </div>
          <div className="treatments-panel__header-actions">
            <button type="button" className="appt-btn appt-btn--approve" onClick={handleAddNew}>
              + Add Treatment
            </button>
            <button type="button" className="appt-btn appt-btn--ghost" onClick={loadTreatments}>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <section className="treatments-list-card">
        <div className="treatments-list-card__header">
          <h3 className="treatments-list-card__title">Existing Treatments</h3>
        </div>

        {!loading && treatments.length > 0 && (
          <TreatmentsFilterBar
            treatments={treatments}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            search={search}
            onSearchChange={setSearch}
            filteredCount={filteredTreatments.length}
          />
        )}

        {loading ? (
          <div className="appointments-panel__empty">Loading treatments...</div>
        ) : treatments.length === 0 ? (
          <div className="appointments-panel__empty">
            No treatments yet.{" "}
            <button type="button" className="treatments-inline-link" onClick={handleAddNew}>
              Add your first treatment
            </button>
          </div>
        ) : filteredTreatments.length === 0 ? (
          <div className="appointments-panel__empty">No treatments match your filters.</div>
        ) : (
          <div className="appt-table-wrap">
            <table className="appt-table">
              <thead>
                <tr>
                  <th>Treatment</th>
                  <th>Price</th>
                  <th>ORS</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagination.items.map((treatment) => (
                  <tr key={treatment.id}>
                    <td>
                      <div className="appt-table__client">{treatment.name}</div>
                    </td>
                    <td>{formatPeso(treatment.price)}</td>
                    <td>
                      {treatment.ors_required ? (
                        <span className="treatment-ors-tag treatment-ors-tag--required">
                          Required · {treatment.ors_number || "—"}
                          {treatment.ors_amount != null && treatment.ors_amount !== ""
                            ? ` · ${formatPeso(treatment.ors_amount)}`
                            : ""}
                        </span>
                      ) : (
                        <span className="treatment-ors-tag">Not required</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`treatment-status-pill treatment-status-pill--${
                          treatment.active ? "active" : "inactive"
                        }`}
                      >
                        {treatment.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="treatments-table__actions">
                        <button
                          type="button"
                          className="appt-btn appt-btn--ghost"
                          onClick={() => handleEdit(treatment)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="appt-btn appt-btn--approve"
                          onClick={() => handleToggleActive(treatment)}
                        >
                          {treatment.active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          className="appt-btn appt-btn--danger"
                          onClick={() => handleDelete(treatment)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <AppointmentsPagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              startIndex={pagination.startIndex}
              endIndex={pagination.endIndex}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </section>

      {isFormOpen && (
        <div
          className="treatments-modal"
          onClick={closeForm}
          role="presentation"
        >
          <div
            className="treatments-modal__dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="treatment-form-title"
          >
            <button
              type="button"
              className="treatments-modal__close"
              onClick={closeForm}
              aria-label="Close"
            >
              ×
            </button>
            <TreatmentForm
              form={form}
              saving={saving}
              onChange={handleChange}
              onSave={handleSave}
              onCancel={closeForm}
            />
          </div>
        </div>
      )}
    </div>
  );
}
