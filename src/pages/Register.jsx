import { useState } from "react";
import { supabase } from "../../backend/lib/supabase.js";
import "../styles/Register.css";
import { useNavigate } from "react-router-dom";

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

    // 🚫 prevent spam clicks
    if (loading) return;

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.fullName,
          },
        },
      });

      console.log("REGISTER CLICKED");

      if (error) {
        alert(error.message);
        return;
      }

      alert("Account created!");
      navigate("/login");

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <header className="header">
        <h1>Glow & Bloom</h1>
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
                value={form.password}
                type="password"
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                placeholder="Password"
                required
              />
            </div>

            {/* BUTTON */}
            <button disabled={loading}>
              {loading ? "Creating account..." : "Sign Up"}
            </button>
          </form>

          <div className="register-footer">
            Already have an account?{" "}
            <span onClick={() => navigate("/login")} style={{ cursor: "pointer" }}>
              Log In
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}