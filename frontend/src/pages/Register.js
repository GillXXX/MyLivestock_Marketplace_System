import { useState } from "react";
import {
  User, Mail, Lock, Eye, EyeOff, Phone, MapPin,
  Tractor, ShoppingBag, ShieldCheck, ArrowRight,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import "./Register.css";

function Register() {
  const navigate = useNavigate();

  const [role, setRole] = useState("farmer");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    farmLocation: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Registration failed");
        setLoading(false);
        return;
      }

      alert("Account created successfully!");
      navigate("/login");
    } catch (error) {
      setMessage("Cannot connect to backend server");
    }

    setLoading(false);
  };

  return (
    <div className="modern-register">
      <section className="register-showcase">
        <div className="showcase-overlay"></div>

        <div className="register-showcase-content">
          <div className="register-brand">
            <div className="register-brand-icon">
              <Tractor size={28} />
            </div>

            <div>
              <h2>HerdMarket</h2>
              <span>Livestock Marketplace Platform</span>
            </div>
          </div>

          <div className="register-showcase-text">
            <span>SECURE LIVESTOCK TRADING</span>
            <h1>Create your marketplace account.</h1>
            <p>
              Join the Web-Based Livestock Marketplace System for farmers and
              buyers in Veruela, Agusan del Sur.
            </p>
          </div>

          <div className="register-feature">
            <ShieldCheck size={24} />
            <div>
              <strong>Role-Based Access</strong>
              <p>
                Farmers can post livestock listings while buyers can browse,
                inquire, and negotiate.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="register-panel">
        <div className="register-card">
          <div className="register-header">
            <span>CREATE ACCOUNT</span>
            <h2>Register to HerdMarket</h2>
            <p>Select your account role and complete your registration details.</p>
          </div>

          {message && <p style={{ color: "red", marginBottom: "15px" }}>{message}</p>}

          <form onSubmit={handleRegister}>
            <label className="field-label">Select Account Role</label>

            <div className="role-select-grid">
              <button
                type="button"
                className={role === "farmer" ? "role-option active" : "role-option"}
                onClick={() => setRole("farmer")}
              >
                <Tractor size={24} />
                <div>
                  <strong>Farmer</strong>
                  <p>Post and manage livestock listings</p>
                </div>
              </button>

              <button
                type="button"
                className={role === "buyer" ? "role-option active" : "role-option"}
                onClick={() => setRole("buyer")}
              >
                <ShoppingBag size={24} />
                <div>
                  <strong>Buyer</strong>
                  <p>Browse livestock and send inquiries</p>
                </div>
              </button>
            </div>

            <div className="register-form-grid">
              <div className="form-group">
                <label>Full Name</label>
                <div className="input-wrapper">
                  <User size={20} />
                  <input
                    name="fullName"
                    type="text"
                    placeholder="Enter full name"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <div className="input-wrapper">
                  <Mail size={20} />
                  <input
                    name="email"
                    type="email"
                    placeholder="example@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <div className="input-wrapper">
                  <Phone size={20} />
                  <input
                    name="phone"
                    type="text"
                    placeholder="+63 912 345 6789"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Location</label>
                <div className="input-wrapper">
                  <MapPin size={20} />
                  <input
                    name="location"
                    type="text"
                    placeholder="Veruela, Agusan del Sur"
                    value={formData.location}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {role === "farmer" && (
                <div className="form-group full">
                  <label>Farm / Barangay Location</label>
                  <div className="input-wrapper">
                    <MapPin size={20} />
                    <input
                      name="farmLocation"
                      type="text"
                      placeholder="Example: Poblacion, Veruela"
                      value={formData.farmLocation}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Password</label>
                <div className="input-wrapper">
                  <Lock size={20} />
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create password"
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
                <label>Confirm Password</label>
                <div className="input-wrapper">
                  <Lock size={20} />
                  <input
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>

            <label className="terms">
              <input type="checkbox" required />
              <span>
                I agree to the system terms and allow my information to be used
                for livestock marketplace transactions.
              </span>
            </label>

            <button className="register-btn" type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Account"}
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="signin-link">
            <p>
              Already have an account?
              <Link to="/login"> Sign in</Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Register;