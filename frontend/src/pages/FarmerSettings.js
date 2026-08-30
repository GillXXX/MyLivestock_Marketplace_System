import { useState } from "react";

import {
  ArrowLeft,
  Lock,
  User,
  Bell,
  LogOut,
  ShieldCheck,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import "./FarmerSettings.css";

function FarmerSettings() {
  const navigate = useNavigate();

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleChange = (e) => {
    setPasswordForm({
      ...passwordForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const res = await fetch("http://localhost:5000/api/farmer/change-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(passwordForm),
      });

      const data = await res.json();

      if (!res.ok) {
        setFeedback({ type: "error", text: data.message || "Failed to update password" });
        setLoading(false);
        return;
      }

      setFeedback({ type: "success", text: "Password updated successfully." });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      setFeedback({ type: "error", text: "Cannot connect to backend server" });
    }

    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="farmer-settings-page">
      <div className="settings-header">
        <Link to="/farmer-dashboard" className="back-btn">
          <ArrowLeft size={20} />
        </Link>

        <div>
          <span className="page-tag">FARMER PORTAL</span>
          <h1>Account Settings</h1>
          <p>Manage your account security and access your other settings.</p>
        </div>
      </div>

      <div className="settings-layout">
        <div className="settings-card">
          <h3>Change Password</h3>
          <p>Update your password to keep your account secure.</p>

          {feedback && (
            <div className={`settings-feedback ${feedback.type}`}>
              {feedback.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="settings-form-group">
              <label>Current Password</label>
              <div className="settings-input-wrapper">
                <Lock size={18} />
                <input
                  type="password"
                  name="currentPassword"
                  placeholder="Enter current password"
                  value={passwordForm.currentPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="settings-form-group">
              <label>New Password</label>
              <div className="settings-input-wrapper">
                <Lock size={18} />
                <input
                  type="password"
                  name="newPassword"
                  placeholder="At least 6 characters"
                  value={passwordForm.newPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="settings-form-group">
              <label>Confirm New Password</label>
              <div className="settings-input-wrapper">
                <Lock size={18} />
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Re-enter new password"
                  value={passwordForm.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <button className="settings-save-btn" type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>

        <div className="settings-side">
          <div className="settings-card">
            <h3>Quick Links</h3>
            <p>Other places to manage your account.</p>

            <Link to="/profile" className="settings-link-row">
              <div className="settings-link-left">
                <div className="settings-link-icon">
                  <User size={20} />
                </div>
                <div>
                  <strong>Edit Profile</strong>
                  <p>Name, contact info, and farm location</p>
                </div>
              </div>
            </Link>

            <Link to="/farmer-notifications" className="settings-link-row">
              <div className="settings-link-left">
                <div className="settings-link-icon">
                  <Bell size={20} />
                </div>
                <div>
                  <strong>Notifications</strong>
                  <p>Review listing and transaction alerts</p>
                </div>
              </div>
            </Link>

            <div className="settings-link-row">
              <div className="settings-link-left">
                <div className="settings-link-icon">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <strong>Account Status</strong>
                  <p>Verified Farmer • MAO approved</p>
                </div>
              </div>
            </div>
          </div>

          <div className="settings-card">
            <h3>Session</h3>
            <p>Sign out of your account on this device.</p>

            <button className="settings-logout-btn" onClick={handleLogout} type="button">
              <LogOut size={18} />
              Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FarmerSettings;
