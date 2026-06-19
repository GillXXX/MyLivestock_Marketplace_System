import { useEffect, useState } from "react";

import {
  ArrowLeft,
  ShieldCheck,
  UserCog,
  Bell,
  ClipboardCheck,
  FileCheck2,
  Save,
  Lock,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import "./AdminSettings.css";

function AdminSettings() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [settings, setSettings] = useState({
    system_name: "",
    municipality: "",
    admin_office: "",
    livestock_types: "",
    default_listing_status: "Pending Approval",
    transaction_workflow: "Strict Workflow",
    secure_login: true,
    role_based_access: true,
    account_deactivation: true,
    document_verification: true,
    admin_notifications: true,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const res = await fetch("http://localhost:5000/api/admin/settings", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          setMessage(data.message || "Failed to load settings");
          setLoading(false);
          return;
        }

        setSettings({
          system_name: data.settings.system_name,
          municipality: data.settings.municipality,
          admin_office: data.settings.admin_office,
          livestock_types: data.settings.livestock_types,
          default_listing_status: data.settings.default_listing_status,
          transaction_workflow: data.settings.transaction_workflow,
          secure_login: Boolean(data.settings.secure_login),
          role_based_access: Boolean(data.settings.role_based_access),
          account_deactivation: Boolean(data.settings.account_deactivation),
          document_verification: Boolean(data.settings.document_verification),
          admin_notifications: Boolean(data.settings.admin_notifications),
        });

        setLoading(false);
      } catch (error) {
        setMessage("Cannot connect to backend server");
        setLoading(false);
      }
    };

    fetchSettings();
  }, [navigate]);

  const handleChange = (e) => {
    setSettings({
      ...settings,
      [e.target.name]: e.target.value,
    });
  };

  const handleToggle = (name) => {
    setSettings({
      ...settings,
      [name]: !settings[name],
    });
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:5000/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to save settings");
        return;
      }

      alert("Settings saved successfully");
    } catch (error) {
      alert("Cannot connect to backend server");
    }
  };

  if (loading) {
    return <h2 style={{ padding: "30px" }}>Loading settings...</h2>;
  }

  if (message) {
    return <h2 style={{ padding: "30px", color: "red" }}>{message}</h2>;
  }

  return (
    <div className="admin-settings-page">
      <div className="settings-header">
        <Link to="/admin-dashboard" className="back-btn">
          <ArrowLeft size={20} />
        </Link>

        <div>
          <h1>System Settings</h1>
          <p>
            Configure admin controls, security preferences, approval rules, and
            notification settings.
          </p>
        </div>
      </div>

      <section className="settings-grid">
        <SettingsCard
          icon={<ShieldCheck />}
          title="Role-Based Access Control"
          text="Control system permissions for admin, farmers, and buyers."
          status={settings.role_based_access ? "Enabled" : "Disabled"}
        />

        <SettingsCard
          icon={<ClipboardCheck />}
          title="Listing Approval"
          text="Require MAO review before livestock listings appear publicly."
          status={settings.default_listing_status}
        />

        <SettingsCard
          icon={<FileCheck2 />}
          title="Document Verification"
          text="Require certificates or permits before transaction confirmation."
          status={settings.document_verification ? "Required" : "Optional"}
        />

        <SettingsCard
          icon={<Bell />}
          title="Admin Notifications"
          text="Receive alerts for new listings, documents, and transactions."
          status={settings.admin_notifications ? "Enabled" : "Disabled"}
        />
      </section>

      <div className="settings-panel">
        <div className="settings-panel-title">
          <div>
            <h3>General System Configuration</h3>
            <p>Basic marketplace rules and admin preferences.</p>
          </div>
        </div>

        <div className="settings-form">
          <div className="settings-group">
            <label>System Name</label>
            <input
              name="system_name"
              type="text"
              value={settings.system_name}
              onChange={handleChange}
            />
          </div>

          <div className="settings-group">
            <label>Municipality</label>
            <input
              name="municipality"
              type="text"
              value={settings.municipality}
              onChange={handleChange}
            />
          </div>

          <div className="settings-group">
            <label>Admin Office</label>
            <input
              name="admin_office"
              type="text"
              value={settings.admin_office}
              onChange={handleChange}
            />
          </div>

          <div className="settings-group">
            <label>Allowed Livestock Types</label>
            <input
              name="livestock_types"
              type="text"
              value={settings.livestock_types}
              onChange={handleChange}
            />
          </div>

          <div className="settings-group">
            <label>Default Listing Status</label>
            <select
              name="default_listing_status"
              value={settings.default_listing_status}
              onChange={handleChange}
            >
              <option>Pending Approval</option>
              <option>Auto Approved</option>
              <option>Draft</option>
            </select>
          </div>

          <div className="settings-group">
            <label>Default Transaction Workflow</label>
            <select
              name="transaction_workflow"
              value={settings.transaction_workflow}
              onChange={handleChange}
            >
              <option>Strict Workflow</option>
              <option>Flexible Workflow</option>
            </select>
          </div>
        </div>
      </div>

      <div className="settings-panel">
        <div className="settings-panel-title">
          <div>
            <h3>Security and Access Settings</h3>
            <p>Manage login, role permissions, and account restrictions.</p>
          </div>
        </div>

        <div className="settings-list">
          <SettingToggle
            icon={<Lock />}
            title="Require secure login"
            text="Users must login before accessing marketplace dashboards."
            active={settings.secure_login}
            onChange={() => handleToggle("secure_login")}
          />

          <SettingToggle
            icon={<ShieldCheck />}
            title="Enable role-based access"
            text="Separate access for farmers, buyers, and MAO administrators."
            active={settings.role_based_access}
            onChange={() => handleToggle("role_based_access")}
          />

          <SettingToggle
            icon={<UserCog />}
            title="Allow account deactivation"
            text="Admins can activate or deactivate user accounts."
            active={settings.account_deactivation}
            onChange={() => handleToggle("account_deactivation")}
          />

          <SettingToggle
            icon={<FileCheck2 />}
            title="Require document verification"
            text="Transactions cannot be completed without required documents."
            active={settings.document_verification}
            onChange={() => handleToggle("document_verification")}
          />

          <SettingToggle
            icon={<Bell />}
            title="Enable admin notification alerts"
            text="Notify admin when new actions require review."
            active={settings.admin_notifications}
            onChange={() => handleToggle("admin_notifications")}
          />
        </div>
      </div>

      <div className="settings-actions">
        <button className="save-settings-btn" type="button" onClick={handleSave}>
          <Save size={18} />
          Save Settings
        </button>
      </div>
    </div>
  );
}

function SettingsCard({ icon, title, text, status }) {
  return (
    <div className="settings-card">
      <div className="settings-icon">{icon}</div>

      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>

      <span>{status}</span>
    </div>
  );
}

function SettingToggle({ icon, title, text, active, onChange }) {
  return (
    <div className="setting-toggle">
      <div className="setting-toggle-icon">{icon}</div>

      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>

      <label className="switch">
        <input type="checkbox" checked={active} onChange={onChange} />
        <span className="slider"></span>
      </label>
    </div>
  );
}

export default AdminSettings;