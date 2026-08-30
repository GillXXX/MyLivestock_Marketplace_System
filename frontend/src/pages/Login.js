import { useState } from "react";

import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Tractor,
  ArrowRight,
} from "lucide-react";

import { useNavigate, Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleAuthSuccess = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    if (data.user.role === "admin") {
      navigate("/admin-dashboard");
    } else if (data.user.role === "farmer") {
      navigate("/farmer-dashboard");
    } else if (data.user.role === "buyer") {
      navigate("/buyer-dashboard");
    } else {
      setMessage("Unknown user role");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Login failed");
        setLoading(false);
        return;
      }

      handleAuthSuccess(data);
    } catch (error) {
      setMessage("Cannot connect to backend server");
    }

    setLoading(false);
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setMessage("");

    try {
      const res = await fetch("http://localhost:5000/api/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Google sign-in failed");
        return;
      }

      handleAuthSuccess(data);
    } catch (error) {
      setMessage("Cannot connect to backend server");
    }
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
            <span className="mini-title">WEB-BASED LIVESTOCK MARKETPLACE</span>

            <h1>Modern livestock trading for farmers and buyers in Veruela.</h1>

            <p>
              Secure livestock listings, transaction monitoring, map-based
              seller visibility, and structured trading workflows powered by
              digital agriculture technology.
            </p>
          </div>

          <div className="showcase-features">
            <div className="feature-card">
              <div className="feature-icon-badge">
                <ShieldCheck size={20} />
              </div>

              <div>
                <strong>Secure Trading Workflow</strong>
                <p>Verification-based livestock transactions with MAO monitoring.</p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon-badge">
                <Mail size={20} />
              </div>

              <div>
                <strong>Farmer & Buyer Messaging</strong>
                <p>Built-in communication and negotiation tools for trading.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="login-header">
            <span className="login-tag">WELCOME BACK</span>

            <h2>Sign in to your account</h2>

            <p>Access your livestock marketplace dashboard and continue trading.</p>
          </div>

          {message && <p className="form-error">{message}</p>}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email Address</label>

              <div className="input-wrapper">
                <Mail size={20} />

                <input
                  name="email"
                  type="email"
                  placeholder="farmer@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div className="password-label">
                <label>Password</label>

                <Link to="/">Forgot password?</Link>
              </div>

              <div className="input-wrapper">
                <Lock size={20} />

                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
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

            <div className="login-options">
              <label className="remember-box">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
            </div>

            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="divider">
            <span></span>
            <p>OR CONTINUE WITH</p>
            <span></span>
          </div>

          <div className="social-login">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setMessage("Google sign-in failed")}
            />
          </div>

          <div className="register-link">
            <p>
              Don’t have an account?
              <Link to="/register"> Create Account</Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Login;