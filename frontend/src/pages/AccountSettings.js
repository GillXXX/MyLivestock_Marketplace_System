import { useMemo, useState } from "react";

import {
  ArrowLeft,
  Lock,
  User,
  Bell,
  LogOut,
  ShieldCheck,
  Eye,
  EyeOff,
  ChevronRight,
  KeyRound,
  Sparkles,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import { isWeakPassword, PASSWORD_HINT } from "../utils/password";
import useGoBack from "../utils/useGoBack";
import "./AccountSettings.css";

const ROLE_CONFIG = {
  buyer: {
    portalTag: "BUYER PORTAL",
    dashboardPath: "/buyer-dashboard",
    changePasswordEndpoint: "/api/buyer/change-password",
    profilePath: "/buyer-profile",
    profileText: "Name, contact info, and preferences",
    profileAccent: "blue",
    notificationsPath: "/buyer-notifications",
    notificationsText: "Review inquiry and transaction alerts",
    notificationsAccent: "purple",
    statusText: "Verified Buyer",
  },
  farmer: {
    portalTag: "FARMER PORTAL",
    dashboardPath: "/farmer-dashboard",
    changePasswordEndpoint: "/api/farmer/change-password",
    profilePath: "/profile",
    profileText: "Name, contact info, and farm location",
    profileAccent: "blue",
    notificationsPath: "/farmer-notifications",
    notificationsText: "Review listing and transaction alerts",
    notificationsAccent: "purple",
    statusText: "Verified Farmer • MAO approved",
  },
};

const STRENGTH_LEVELS = [
  { label: "Very weak", tone: "weak" },
  { label: "Weak", tone: "weak" },
  { label: "Fair", tone: "fair" },
  { label: "Strong", tone: "strong" },
  { label: "Very strong", tone: "strong" },
];

function getPasswordStrength(password) {
  if (!password) return null;

  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const level = STRENGTH_LEVELS[Math.min(score, STRENGTH_LEVELS.length - 1)];
  return { score: Math.min(score, STRENGTH_LEVELS.length - 1), ...level };
}

function AccountSettings({ role }) {
  const navigate = useNavigate();
  const config = ROLE_CONFIG[role];
  const goBack = useGoBack(config.dashboardPath);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [visibility, setVisibility] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const strength = useMemo(
    () => getPasswordStrength(passwordForm.newPassword),
    [passwordForm.newPassword]
  );

  const toggleVisibility = (field) => {
    setVisibility((prev) => ({ ...prev, [field]: !prev[field] }));
  };

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

      const res = await fetch(`${API_URL}${config.changePasswordEndpoint}`, {
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
    <div className={`account-settings-page role-${role}`}>
      <div className="settings-header">
        <button type="button" className="back-btn" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>

        <div>
          <span className="page-tag">{config.portalTag}</span>
          <h1>Account Settings</h1>
          <p>Manage your account security and access your other settings.</p>
        </div>
      </div>

      <div className="settings-hero">
        <div className="settings-hero-icon">
          <ShieldCheck size={26} />
        </div>

        <div className="settings-hero-copy">
          <h2>{config.statusText}</h2>
          <p>Your credentials and account access are protected end-to-end.</p>
        </div>

        <div className="settings-hero-badge">
          <Sparkles size={14} />
          Secure Account
        </div>
      </div>

      <div className="settings-layout">
        <div className="settings-card">
          <div className="settings-card-heading">
            <span className="card-icon-badge">
              <KeyRound size={19} />
            </span>
            <div>
              <h3>Change Password</h3>
              <p>Update your password to keep your account secure.</p>
            </div>
          </div>

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
                  type={visibility.currentPassword ? "text" : "password"}
                  name="currentPassword"
                  placeholder="Enter current password"
                  value={passwordForm.currentPassword}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="visibility-toggle"
                  onClick={() => toggleVisibility("currentPassword")}
                  tabIndex={-1}
                  aria-label={visibility.currentPassword ? "Hide password" : "Show password"}
                >
                  {visibility.currentPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div className="settings-form-group">
              <label>New Password</label>
              <div className="settings-input-wrapper">
                <Lock size={18} />
                <input
                  type={visibility.newPassword ? "text" : "password"}
                  name="newPassword"
                  placeholder="New password"
                  value={passwordForm.newPassword}
                  onChange={handleChange}
                  minLength={8}
                  pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}"
                  title="At least 8 characters, with an uppercase letter, a lowercase letter, and a number"
                  required
                />
                <button
                  type="button"
                  className="visibility-toggle"
                  onClick={() => toggleVisibility("newPassword")}
                  tabIndex={-1}
                  aria-label={visibility.newPassword ? "Hide password" : "Show password"}
                >
                  {visibility.newPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>

              {strength && (
                <div className={`password-strength tone-${strength.tone}`}>
                  <div className="password-strength-track">
                    {STRENGTH_LEVELS.map((_, index) => (
                      <span
                        key={index}
                        className={index <= strength.score ? "is-filled" : ""}
                      />
                    ))}
                  </div>
                  <span className="password-strength-label">{strength.label}</span>
                </div>
              )}

              {isWeakPassword(passwordForm.newPassword) && (
                <p className="field-hint">{PASSWORD_HINT}</p>
              )}
            </div>

            <div className="settings-form-group">
              <label>Confirm New Password</label>
              <div className="settings-input-wrapper">
                <Lock size={18} />
                <input
                  type={visibility.confirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Re-enter new password"
                  value={passwordForm.confirmPassword}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="visibility-toggle"
                  onClick={() => toggleVisibility("confirmPassword")}
                  tabIndex={-1}
                  aria-label={visibility.confirmPassword ? "Hide password" : "Show password"}
                >
                  {visibility.confirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
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

            <Link to={config.profilePath} className={`settings-link-row accent-${config.profileAccent}`}>
              <div className="settings-link-left">
                <div className="settings-link-icon">
                  <User size={20} />
                </div>
                <div>
                  <strong>Edit Profile</strong>
                  <p>{config.profileText}</p>
                </div>
              </div>
              <ChevronRight size={18} className="settings-link-arrow" />
            </Link>

            <Link to={config.notificationsPath} className={`settings-link-row accent-${config.notificationsAccent}`}>
              <div className="settings-link-left">
                <div className="settings-link-icon">
                  <Bell size={20} />
                </div>
                <div>
                  <strong>Notifications</strong>
                  <p>{config.notificationsText}</p>
                </div>
              </div>
              <ChevronRight size={18} className="settings-link-arrow" />
            </Link>

            <div className="settings-link-row accent-green">
              <div className="settings-link-left">
                <div className="settings-link-icon">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <strong>Account Status</strong>
                  <p>{config.statusText}</p>
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

export default AccountSettings;
