import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { confirmAction, showError, showSuccess, showWarning } from "../lib/alerts.js";

function formatPeso(value) {
  if (value === null || value === undefined || value === "") return "₱0";
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return "₱0";
  return `₱${num.toLocaleString("en-PH")}`;
}

export default function TreatmentsPanel({ onRefreshed }) {
  const [loading, setLoading] = useState(true);
  const [treatments, setTreatments] = useState([]);

  const [form, setForm] = useState({
    id: null,
    name: "",
    price: "",
    ors_required: false,
    ors_number: "",
    ors_amount: "",
    active: true,
  });

  const [saving, setSaving] = useState(false);

  const resetForm = () =>
    setForm({
      id: null,
      name: "",
      price: "",
      ors_required: false,
      ors_number: "",
      ors_amount: "",
      active: true,
    });

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

  const selectedLabel = useMemo(() => {
    if (!form.id) return "Add Treatment";
    return "Edit Treatment";
  }, [form.id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((cur) => ({
      ...cur,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleEdit = (t) => {
    setForm({
      id: t.id,
      name: t.name || "",
      price: t.price ?? "",
      ors_required: !!t.ors_required,
      ors_number: t.ors_number || "",
      ors_amount: t.ors_amount ?? "",
      active: !!t.active,
    });
  };

  const handleCancelEdit = () => {
    resetForm();
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

    if (form.ors_required) {
      if (!String(form.ors_number || "").trim()) {
        await showWarning("ORS number is required when ORS required is checked.");
        return;
      }
    }

    setSaving(true);

    try {
      if (form.id) {
        const { error } = await supabase
          .from("treatments")
          .update({
            name: form.name.trim(),
            price: priceNum,
            ors_required: !!form.ors_required,
            ors_number: form.ors_required ? form.ors_number.trim() : null,
            ors_amount: orsAmountNum,
            active: !!form.active,
          })
          .eq("id", form.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("treatments").insert({
          name: form.name.trim(),
          price: priceNum,
          ors_required: !!form.ors_required,
          ors_number: form.ors_required ? form.ors_number.trim() : null,
          ors_amount: orsAmountNum,
          active: !!form.active,
        });

        if (error) throw error;
      }

      resetForm();
      await loadTreatments();
      onRefreshed?.();
      await showSuccess("Treatment saved successfully.");
    } catch (e) {
      await showError(e.message, "Failed to save treatment");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (t) => {
    const { error } = await supabase
      .from("treatments")
      .update({ active: !t.active })
      .eq("id", t.id);

    if (error) {
      await showError(error.message, "Failed to update treatment");
      return;
    }

    await loadTreatments();
    onRefreshed?.();
  };

  const handleDelete = async (t) => {
    const result = await confirmAction({
      title: "Delete treatment?",
      text: `This will remove "${t.name}" from the treatments list.`,
      confirmButtonText: "Delete",
    });

    if (!result.isConfirmed) return;

    const { error } = await supabase.from("treatments").delete().eq("id", t.id);
    if (error) {
      await showError(error.message, "Failed to delete treatment");
      return;
    }

    await loadTreatments();
    onRefreshed?.();
    await showSuccess("Treatment deleted successfully.");
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3>System Treatments (Admin)</h3>
        <button onClick={loadTreatments}>Refresh</button>
      </div>

      <div className="treatments-layout" style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 20 }}>
        <div className="treatments-form" style={{ paddingRight: 10, borderRight: "1px solid #f3d6d6" }}>
          <h4>{selectedLabel}</h4>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
            <label>
              Treatment Name
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Signature Glow Facial"
              />
            </label>

            <label>
              Treatment Price (PHP)
              <input
                name="price"
                value={form.price}
                onChange={handleChange}
                placeholder="e.g. 750"
              />
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="checkbox"
                name="ors_required"
                checked={form.ors_required}
                onChange={handleChange}
              />
              ORS Required
            </label>

            <label>
              ORS Number
              <input
                name="ors_number"
                value={form.ors_number}
                onChange={handleChange}
                placeholder="e.g. 1 / 2 / 3"
                disabled={!form.ors_required}
              />
            </label>

            <label>
              ORS Amount (PHP)
              <input
                name="ors_amount"
                value={form.ors_amount}
                onChange={handleChange}
                placeholder="e.g. 500"
                disabled={!form.ors_required}
              />
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="checkbox"
                name="active"
                checked={form.active}
                onChange={handleChange}
              />
              Active (shown to customers)
            </label>

            <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
              <button className="action-button" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : form.id ? "Update" : "Add"}
              </button>

              {form.id && (
                <button className="action-button secondary" onClick={handleCancelEdit} disabled={saving}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="treatments-list">
          <h4>Existing Treatments</h4>

          {loading ? (
            <p>Loading treatments...</p>
          ) : treatments.length === 0 ? (
            <p>No treatments yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
              {treatments.map((t) => (
                <div
                  key={t.id}
                  className="appointment-item"
                  style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center" }}
                >
                  <div className="appointment-info">
                    <strong>{t.name}</strong>
                    <p>Price: {formatPeso(t.price)}</p>
                    <p>
                      ORS: {t.ors_required ? `Required (No: ${t.ors_number || "-"})` : "Not required"}
                    </p>
                  </div>

                  <div className="appointment-actions" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button className="action-button" onClick={() => handleEdit(t)}>
                      Edit
                    </button>
                    <button className="action-button secondary" onClick={() => handleToggleActive(t)}>
                      {t.active ? "Deactivate" : "Activate"}
                    </button>
                    <button className="action-button secondary" onClick={() => handleDelete(t)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

