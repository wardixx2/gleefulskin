import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { saveSignupProfile } from "../lib/signupProfile.js";
import { showError, showSuccess } from "../lib/alerts.js";
import "../styles/Register.css";

export default function Register() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const handleRegister = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.fullName,
          },
        },
      });

      if (error) {
        await showError(error.message, "Registration failed");
        return;
      }

      if (data?.user?.id) {
        const profileResult = await saveSignupProfile({
          userId: data.user.id,
          fullName: form.fullName,
          email: form.email,
        });

        if (profileResult.error) {
          console.error("Profile save failed:", profileResult.error);
        }
      }

      await showSuccess(
        "Account created! An admin will review your account before you can access the dashboard."
      );
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-page">
      <header className="header">
        <h1>GLEEFUL</h1>
        <p>Skin Wellness Center • Radiance Awaits You</p>
      </header>

      <div className="register-container">
        <div className="register-card">
          <h2>Create Account</h2>

          <form onSubmit={handleRegister}>
            
            {/* FULL NAME */}
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) =>
                  setForm({ ...form, fullName: e.target.value })
                }
                placeholder="Full name"
                required
              />
            </div>

            {/* EMAIL */}
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
                placeholder="Email"
                required
              />
            </div>

            {/* PASSWORD */}
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                placeholder="Password"
                required
              />
            </div>

            {/* BUTTON */}
            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? "Creating account..." : "Sign Up"}
            </button>
          </form>

          <div className="register-footer">
            Already have an account? <Link to="/login">Log In</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
