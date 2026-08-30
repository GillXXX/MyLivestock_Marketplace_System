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
import { useGoogleLogin } from "@react-oauth/google";
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

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setMessage("");

      try {
        const res = await fetch("http://localhost:5000/api/auth/google", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ accessToken: tokenResponse.access_token }),
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
    },
    onError: () => setMessage("Google sign-in failed"),
  });

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
            <button type="button" onClick={() => googleLogin()}>
              <svg viewBox="0 0 48 48" width="20" height="20">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.6 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34 5.1 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3.1 0 5.8 1.1 8 3l6-6C34 5.1 29.3 3 24 3 16.3 3 9.7 7.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 36.6 26.7 37.5 24 37.5c-5.4 0-9.9-3.4-11.6-8.2l-6.5 5C9.5 40.6 16.2 45 24 45z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C39.9 37.6 44 32.6 44 24c0-1.4-.1-2.7-.4-3.5z" />
              </svg>
              Continue with Google
            </button>
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