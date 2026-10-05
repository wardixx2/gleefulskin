import { useState, useEffect } from "react";
import { showError, showSuccess, showWarning } from "../../lib/alerts.js";
import {
  loadMailSettings,
  saveMailSettings,
  sendTestEmail,
} from "../../lib/notifyAccountApproved.js";

export default function AdminSettings() {
  const [businessName, setBusinessName] = useState("");
  const [hours, setHours] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingMail, setSavingMail] = useState(false);
  const [testingMail, setTestingMail] = useState(false);
  const [mailForm, setMailForm] = useState({
    smtpUser: "gleefulskinwellnesscentercaste@gmail.com",
    smtpPass: "",
    smtpHost: "smtp.gmail.com",
    smtpPort: "465",
    fromName: "Gleeful Skin Wellness Center",
    hasPassword: false,
  });

  useEffect(() => {
    setBusinessName(localStorage.getItem("businessName") || "");
    setHours(localStorage.getItem("businessHours") || "");

    loadMailSettings().then(({ settings, error }) => {
      if (error || !settings) return;
      setMailForm((current) => ({
        ...current,
        smtpUser: settings.smtp_user || current.smtpUser,
        smtpHost: settings.smtp_host || current.smtpHost,
        smtpPort: String(settings.smtp_port || current.smtpPort),
        fromName: settings.from_name || current.fromName,
        hasPassword: Boolean(settings.hasPassword),
      }));
    });
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    localStorage.setItem("businessName", businessName.trim());
    localStorage.setItem("businessHours", hours.trim());
    await showSuccess("Business settings were saved on this device.", "Settings saved");
    setSaving(false);
  };

  const persistMailSettings = async () => {
    const { error } = await saveMailSettings({
      smtpUser: mailForm.smtpUser,
      smtpPass: mailForm.smtpPass,
      smtpHost: mailForm.smtpHost,
      smtpPort: mailForm.smtpPort,
      fromName: mailForm.fromName,
    });
    return error;
  };

  const saveMail = async (e) => {
    e.preventDefault();
    if (!mailForm.smtpPass.trim() && !mailForm.hasPassword) {
      await showWarning(
        "Paste a 16-character Google App Password first. A normal Gmail password will not work.",
        "App password required"
      );
      return;
    }

    setSavingMail(true);
    const error = await persistMailSettings();

    if (error) {
      await showError(
        `${error} If the mail_settings table is missing, run supabase/APPLY_MAIL_SETTINGS.sql in the Supabase SQL editor.`,
        "Could not save mail settings"
      );
    } else {
      setMailForm((current) => ({
        ...current,
        smtpPass: "",
        hasPassword: current.hasPassword || Boolean(current.smtpPass.trim()),
      }));
      await showSuccess(
        "Gmail settings were saved. Use Send test email to confirm they work.",
        "Mail settings saved"
      );
    }

    setSavingMail(false);
  };

  const testMail = async () => {
    const to = mailForm.smtpUser.trim();
    if (!to) {
      await showWarning("Enter the Gmail address first.", "Missing sender");
      return;
    }

    if (!mailForm.smtpPass.trim() && !mailForm.hasPassword) {
      await showWarning(
        "Paste a 16-character Google App Password, click Save mail settings, then send the test.",
        "App password required"
      );
      return;
    }

    setTestingMail(true);

    const saveError = await persistMailSettings();
    if (saveError) {
      await showError(saveError, "Could not save mail settings");
      setTestingMail(false);
      return;
    }

    const { error } = await sendTestEmail({
      email: to,
      smtpUser: mailForm.smtpUser,
      smtpPass: mailForm.smtpPass,
    });

    if (error) {
      await showError(error, "Test email failed");
    } else {
      setMailForm((current) => ({
        ...current,
        smtpPass: "",
        hasPassword: true,
      }));
      await showSuccess(
        `A test message was sent to ${to}. Check the inbox and spam folder.`,
        "Test email sent"
      );
    }
    setTestingMail(false);
  };

  return (
    <section className="appointments-panel">
      <div className="appointments-panel__header">
        <div>
          <h2 className="appointments-panel__title">System Settings</h2>
          <p className="appointments-panel__subtitle">
            Business configuration for Gleeful Skin Wellness Center
          </p>
        </div>
      </div>

      <div className="appointments-panel__body">
        <form onSubmit={save} className="admin-settings-form">
          <div className="form-group">
            <label htmlFor="businessName">Business name</label>
            <input
              id="businessName"
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Gleeful Skin Wellness Center"
            />
          </div>

          <div className="form-group">
            <label htmlFor="businessHours">Business hours</label>
            <input
              id="businessHours"
              type="text"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="Mon–Sat, 9:00 AM – 6:00 PM"
            />
          </div>

          <button type="submit" className="btn-primary admin-settings-form__save" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>

        <form onSubmit={saveMail} className="admin-settings-form admin-settings-form--mail">
          <h3 className="admin-settings-form__heading">Account emails</h3>
          <p className="admin-settings-form__hint">
            Signup and approval emails are sent from Gmail. Create a Google App Password for
            gleefulskinwellnesscentercaste@gmail.com (Google Account → Security → 2-Step Verification → App passwords),
            paste it below, then click Save mail settings before sending a test. Do not use the normal Gmail password.
          </p>

          <div className="form-group">
            <label htmlFor="smtpUser">Gmail address</label>
            <input
              id="smtpUser"
              type="email"
              value={mailForm.smtpUser}
              onChange={(e) => setMailForm({ ...mailForm, smtpUser: e.target.value })}
              placeholder="gleefulskinwellnesscentercaste@gmail.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="smtpPass">
              Gmail app password {mailForm.hasPassword ? "(saved — leave blank to keep it)" : ""}
            </label>
            <input
              id="smtpPass"
              type="password"
              value={mailForm.smtpPass}
              onChange={(e) => setMailForm({ ...mailForm, smtpPass: e.target.value })}
              placeholder="16-character app password"
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="fromName">From name</label>
            <input
              id="fromName"
              type="text"
              value={mailForm.fromName}
              onChange={(e) => setMailForm({ ...mailForm, fromName: e.target.value })}
              placeholder="Gleeful Skin Wellness Center"
            />
          </div>

          <div className="admin-settings-form__actions">
            <button type="submit" className="btn-primary admin-settings-form__save" disabled={savingMail}>
              {savingMail ? "Saving..." : "Save mail settings"}
            </button>
            <button
              type="button"
              className="btn-primary admin-settings-form__save"
              onClick={testMail}
              disabled={testingMail}
            >
              {testingMail ? "Sending..." : "Send test email"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
