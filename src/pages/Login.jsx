import { useState } from "react";
import { supabase } from "../../backend/lib/supabase.js";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css"; // optional if you move styles out

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

 const handleLogin = async (e) => {
    e.preventDefault();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    const user = data.user;

    alert("Login successful!");

    // simple role check (we'll improve later)
    if (user.email === "admin@glow.com") {
      navigate("/admin");
    } else {
      navigate("/book");
    }
  };

  return (
    <div className="page">
      <header className="header">
        <h1>Glow & Bloom</h1>
        <p>Skin Wellness Center • Radiance Awaits You</p>
      </header>

      <div className="login-container">
        <div className="login-card">
          <h2>Welcome Back</h2>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email Address</label>
             <input
        placeholder="email"
        onChange={(e) => setEmail(e.target.value)}
      />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="password-wrapper">
                 <input
        type="password"
        placeholder="password"
        onChange={(e) => setPassword(e.target.value)}
      />
                <span
                  className="toggle-password"
                  // onClick={togglePasswordVisibility}
                >
                  {showPassword ? "Hide" : "Show"}
                </span>
              </div>
            </div>

            <div className="form-options">
              <label className="remember-me">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember me
              </label>

              <span className="forgot-pass" 
              // onClick={handleForgotPassword}
              >
                Forgot Password?
              </span>
            </div>

            <button>Sign In to My Account</button>
          </form>

          <div className="login-footer">
            Don't have an account yet?{" "}
            <span className="link" 
            // onClick={handleCreateAccount}
            >
              Create Account
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
