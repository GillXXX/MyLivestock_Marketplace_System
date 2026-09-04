import { useState } from "react";
import { Mail, ShieldCheck, Tractor, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { API_URL } from "../config";
import "./Login.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Something went wrong");
        setLoading(false);
        return;
      }

      setSent(true);
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

            <h1>Forgot your password? Let's get you back in.</h1>

            <p>
              Enter the email address on your account and we'll send you a
              secure link to choose a new password.
            </p>
          </div>

          <div className="showcase-features">
            <div className="feature-card">
              <div className="feature-icon-badge">
                <ShieldCheck size={20} />
              </div>

              <div>
                <strong>Secure Reset Links</strong>
                <p>One-time links that expire after an hour for your safety.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          {sent ? (
            <>
              <div className="login-header">
                <span className="login-tag">CHECK YOUR EMAIL</span>
                <h2>Reset link sent</h2>
                <p>
                  If an account exists for <strong>{email}</strong>, a
                  password reset link is on its way. It expires in 1 hour.
                </p>
              </div>

              <div className="feature-card on-light" style={{ marginBottom: 24 }}>
                <div className="feature-icon-badge">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <strong>Didn't get it?</strong>
                  <p>Check your spam folder, or try again in a few minutes.</p>
                </div>
              </div>

              <div className="register-link">
                <p>
                  <Link to="/login">Back to Sign In</Link>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="login-header">
                <span className="login-tag">RESET PASSWORD</span>
                <h2>Forgot your password?</h2>
                <p>Enter your email and we'll send you a reset link.</p>
              </div>

              {message && <p className="form-error">{message}</p>}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Email Address</label>

                  <div className="input-wrapper">
                    <Mail size={20} />

                    <input
                      type="email"
                      placeholder="farmer@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button className="login-btn" type="submit" disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Link"}
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

export default ForgotPassword;
