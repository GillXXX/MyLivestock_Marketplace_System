import { useState } from "react";
import { Lock, Eye, EyeOff, ShieldCheck, Tractor, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { API_URL } from "../config";
import "./Login.css";

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!token) {
      setMessage("This reset link is missing its token. Please request a new one.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setMessage("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...formData }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Failed to reset password");
        setLoading(false);
        return;
      }

      setDone(true);
    } catch (error) {
      setMessage("Cannot connect to backend server");
    }

    setLoading(false);
  };

  return (
    <div className="modern-login">
      <section className="login-showcase">
        <div className="overlay"></div>

        <div className="showcase-content">
          <div className="brand-badge">
            <div className="brand-icon">
              <Tractor size={28} />
            </div>

            <div>
              <h2>HerdMarket</h2>
              <span>Livestock Marketplace Platform</span>
            </div>
          </div>

          <div className="showcase-text">
            <span className="mini-title">ACCOUNT RECOVERY</span>
            <h1>Choose a new password to get back to trading.</h1>
            <p>Pick something strong you haven't used before on this account.</p>
          </div>

          <div className="showcase-features">
            <div className="feature-card">
              <div className="feature-icon-badge">
                <ShieldCheck size={20} />
              </div>

              <div>
                <strong>One-Time Link</strong>
                <p>This reset link can only be used once and expires in 1 hour.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          {done ? (
            <>
              <div className="login-header">
                <span className="login-tag">ALL SET</span>
                <h2>Password reset successfully</h2>
                <p>You can now sign in with your new password.</p>
              </div>

              <div className="feature-card on-light" style={{ marginBottom: 24 }}>
                <div className="feature-icon-badge">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <strong>You're good to go</strong>
                  <p>Head back to the sign-in page to continue.</p>
                </div>
              </div>

              <button className="login-btn" type="button" onClick={() => navigate("/login")}>
                Go to Sign In
                <ArrowRight size={18} />
              </button>
            </>
          ) : (
            <>
              <div className="login-header">
                <span className="login-tag">RESET PASSWORD</span>
                <h2>Set a new password</h2>
                <p>Enter and confirm your new password below.</p>
              </div>

              {!token && (
                <p className="form-error">
                  This link is missing its reset token. Please request a new
                  one from the Forgot Password page.
                </p>
              )}

              {message && <p className="form-error">{message}</p>}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>New Password</label>

                  <div className="input-wrapper">
                    <Lock size={20} />

                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your new password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />

                    <button
                      type="button"
                      className="eye-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Confirm New Password</label>

                  <div className="input-wrapper">
                    <Lock size={20} />

                    <input
                      name="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Re-enter your new password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <button className="login-btn" type="submit" disabled={loading || !token}>
                  {loading ? "Resetting..." : "Reset Password"}
                  <ArrowRight size={18} />
                </button>
              </form>

              <div className="register-link">
                <p>
                  Remembered your password?
                  <Link to="/login"> Sign In</Link>
                </p>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default ResetPassword;
