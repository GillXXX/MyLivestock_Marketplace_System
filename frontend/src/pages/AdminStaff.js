import { useCallback, useEffect, useState } from "react";

import {
  ArrowLeft,
  Search,
  UserPlus,
  UserX,
  Trash2,
  Users,
  UserCheck,
  X,
  Pencil,
  History,
  KeyRound,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import AdminStatCard from "../components/AdminStatCard";
import useGoBack from "../utils/useGoBack";
import { API_URL } from "../config";
import { isWeakPassword, PASSWORD_HINT } from "../utils/password";
import "./AdminStaff.css";

const EMPTY_FORM = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
};

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

// "2h 15m" between sign-in and sign-out.
const formatDuration = (from, to) => {
  const minutes = Math.max(0, Math.round((new Date(to) - new Date(from)) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ${minutes % 60}m` : `${Math.floor(hours / 24)}d ${hours % 24}h`;
};

// A readable device label from the browser's user agent.
const describeDevice = (userAgent) => {
  if (!userAgent) return "Unknown device";
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /Chrome\//.test(userAgent)
    ? "Chrome"
    : /Firefox\//.test(userAgent)
    ? "Firefox"
    : /Safari\//.test(userAgent)
    ? "Safari"
    : "Browser";
  const device = /Android/.test(userAgent)
    ? "Android"
    : /iPhone|iPad/.test(userAgent)
    ? "iPhone/iPad"
    : /Windows/.test(userAgent)
    ? "Windows"
    : /Mac OS/.test(userAgent)
    ? "Mac"
    : "Other";
  return `${browser} on ${device}`;
};

function AdminStaff() {
  const navigate = useNavigate();
  const goBack = useGoBack("/admin-dashboard");

  const [staff, setStaff] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Account Status");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Add and edit share one form; editingStaff is the account being edited.
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Staff never change their own password — the admin resets it here.
  const [resetFor, setResetFor] = useState(null);
  const [resetForm, setResetForm] = useState({ password: "", confirmPassword: "" });
  const [resetError, setResetError] = useState("");
  const [resetting, setResetting] = useState(false);

  // Sign-in history for one staff member.
  const [historyFor, setHistoryFor] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const fetchStaff = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const res = await fetch(`${API_URL}/api/admin/staff`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Failed to load staff accounts");
        setLoading(false);
        return;
      }

      setStaff(data.staff);
      setStats(data.stats);
      setLoading(false);
    } catch (error) {
      setMessage("Cannot connect to backend server");
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleToggleActive = async (id, isActive) => {
    if (isActive) {
      const confirmDeactivate = window.confirm(
        "Deactivate this staff account? They'll be signed out and can't sign in until reactivated."
      );
      if (!confirmDeactivate) return;
    }

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/admin/staff/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to update staff account status");
        return;
      }

      fetchStaff();
    } catch (error) {
      alert("Cannot connect to backend server");
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Delete this staff account? Only accounts that were never used can be deleted — otherwise deactivate it to keep its history."
    );
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/admin/staff/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to delete staff account");
        return;
      }

      fetchStaff();
    } catch (error) {
      alert("Cannot connect to backend server");
    }
  };

  const openHistory = async (member) => {
    setHistoryFor(member);
    setSessions([]);
    setHistoryError("");
    setHistoryLoading(true);

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/admin/staff/${member.id}/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        setHistoryError(data.message || "Failed to load login history");
      } else {
        setSessions(data.sessions);
      }
    } catch (error) {
      setHistoryError("Cannot connect to backend server");
    }

    setHistoryLoading(false);
  };

  const openResetModal = (member) => {
    setResetFor(member);
    setResetForm({ password: "", confirmPassword: "" });
    setResetError("");
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError("");
    setResetting(true);

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/admin/staff/${resetFor.id}/reset-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(resetForm),
      });

      const data = await res.json();

      if (!res.ok) {
        setResetError(data.message || "Failed to reset the password");
        setResetting(false);
        return;
      }

      setResetFor(null);
      alert(data.message);
      fetchStaff();
    } catch (error) {
      setResetError("Cannot connect to backend server");
    }

    setResetting(false);
  };

  const handleFormChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const openAddModal = () => {
    setEditingStaff(null);
    setFormData(EMPTY_FORM);
    setFormError("");
    setShowFormModal(true);
  };

  const openEditModal = (member) => {
    setEditingStaff(member);
    setFormData({ ...EMPTY_FORM, fullName: member.full_name, email: member.email, phone: member.phone });
    setFormError("");
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    setEditingStaff(null);
    setFormError("");
    setFormData(EMPTY_FORM);
  };

  const handleSubmitStaff = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        editingStaff ? `${API_URL}/api/admin/staff/${editingStaff.id}` : `${API_URL}/api/admin/staff`,
        {
          method: editingStaff ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(
            editingStaff
              ? { fullName: formData.fullName, email: formData.email, phone: formData.phone }
              : formData
          ),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setFormError(
          data.message || (editingStaff ? "Failed to update staff account" : "Failed to create staff account")
        );
        setSubmitting(false);
        return;
      }

      closeFormModal();
      fetchStaff();
    } catch (error) {
      setFormError("Cannot connect to backend server");
    }

    setSubmitting(false);
  };

  const filteredStaff = staff.filter((s) => {
    const search = searchText.toLowerCase();

    const matchesSearch =
      s.full_name?.toLowerCase().includes(search) ||
      s.email?.toLowerCase().includes(search) ||
      String(s.id).includes(search);

    const matchesStatus =
      statusFilter === "All Account Status" ||
      (statusFilter === "Active" ? s.is_active : !s.is_active);

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <h2 style={{ padding: "30px" }}>Loading staff accounts...</h2>;
  }

  if (message) {
    return <h2 style={{ padding: "30px", color: "red" }}>{message}</h2>;
  }

  return (
    <div className="enterprise-staff-page">
      <header className="staff-page-header">
        <div className="header-left">
          <button type="button" className="back-button" onClick={goBack} aria-label="Go back">
            <ArrowLeft size={20} />
          </button>

          <div>
            <span className="eyebrow">MAO ADMINISTRATION</span>
            <h1>Staff Management</h1>
            <p>
              Create and manage MAO Staff accounts. Staff can review
              listings, verification, transactions, reports, and map
              monitoring — account and system-settings management stay
              Super Admin only.
            </p>
          </div>
        </div>

        <button className="add-staff-btn" type="button" onClick={openAddModal}>
          <UserPlus size={18} />
          Add Staff
        </button>
      </header>

      <section className="staff-kpi-grid">
        <AdminStatCard
          accent="green"
          icon={<Users size={24} />}
          value={stats.total}
          label="Total Staff"
          note="MAO staff accounts"
        />

        <AdminStatCard
          accent="blue"
          icon={<UserCheck size={24} />}
          value={stats.active}
          label="Active Staff"
          note="Currently able to log in"
        />

        <AdminStatCard
          accent="amber"
          icon={<UserX size={24} />}
          value={stats.inactive}
          label="Inactive Staff"
          note="Deactivated accounts"
        />
      </section>

      <section className="staff-management-card">
        <div className="staff-toolbar">
          <div className="toolbar-title">
            <h3>MAO Staff Accounts</h3>
            <p>Accounts created for MAO staff members.</p>
          </div>

          <div className="toolbar-actions">
            <div className="search-control">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search name, email, or ID..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="staff-filter-row">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option>All Account Status</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>

        <div className="enterprise-staff-table-wrapper">
          <table className="enterprise-staff-table">
            <thead>
              <tr>
                <th>Staff</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Last Activity</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan="5">No staff accounts found.</td>
                </tr>
              ) : (
                filteredStaff.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="staff-cell">
                        <div className="staff-avatar">{s.full_name.charAt(0)}</div>

                        <div>
                          <strong>{s.full_name}</strong>
                          <p>
                            STF-{s.id} · Joined {new Date(s.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="staff-contact-cell">
                        <strong>{s.email}</strong>
                        <p>{s.phone}</p>
                      </div>
                    </td>

                    <td>
                      <span className={`staff-status-pill ${s.is_active ? "active" : "inactive"}`}>
                        {s.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td>
                      {s.last_login_at ? (
                        <div className="staff-activity-cell">
                          <span>Login: {formatDateTime(s.last_login_at)}</span>
                          <span>
                            {s.last_logout_at
                              ? `Logout: ${formatDateTime(s.last_logout_at)}`
                              : "No logout recorded yet"}
                          </span>
                        </div>
                      ) : (
                        <span className="staff-activity-none">Never signed in</span>
                      )}
                    </td>

                    <td>
                      <div className="staff-table-actions">
                        <button
                          className="info"
                          title="Login History"
                          aria-label="Login History"
                          type="button"
                          onClick={() => openHistory(s)}
                        >
                          <History size={17} />
                        </button>

                        <button
                          title="Edit Staff Details"
                          aria-label="Edit Staff Details"
                          type="button"
                          onClick={() => openEditModal(s)}
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          className="info"
                          title="Reset Password"
                          aria-label="Reset Password"
                          type="button"
                          onClick={() => openResetModal(s)}
                        >
                          <KeyRound size={17} />
                        </button>

                        <button
                          className="warning"
                          title={s.is_active ? "Deactivate Account" : "Reactivate Account"}
                          aria-label={s.is_active ? "Deactivate Account" : "Reactivate Account"}
                          type="button"
                          onClick={() => handleToggleActive(s.id, s.is_active)}
                        >
                          <UserX size={17} />
                        </button>

                        <button
                          className="danger"
                          title="Delete Staff Account"
                          aria-label="Delete Staff Account"
                          type="button"
                          onClick={() => handleDelete(s.id)}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showFormModal && (
        <div className="staff-modal-overlay" onClick={closeFormModal}>
          <div className="staff-modal" onClick={(e) => e.stopPropagation()}>
            <button className="staff-modal-close" type="button" onClick={closeFormModal}>
              <X size={20} />
            </button>

            <h3>{editingStaff ? "Edit Staff Details" : "Add Staff Account"}</h3>
            <p>
              {editingStaff
                ? "Update this staff member's name, email or phone."
                : "Create a login for a new MAO staff member and give them the password. Staff can't change it themselves — use Reset Password if it needs changing."}
            </p>

            {formError && <div className="staff-form-error">{formError}</div>}

            <form onSubmit={handleSubmitStaff}>
              <label>
                Full Name
                <input
                  type="text"
                  name="fullName"
                  maxLength={100}
                  value={formData.fullName}
                  onChange={handleFormChange}
                  required
                />
              </label>

              <label>
                Email
                <input
                  type="email"
                  name="email"
                  maxLength={100}
                  value={formData.email}
                  onChange={handleFormChange}
                  required
                />
              </label>

              <label>
                Phone
                <input
                  type="text"
                  name="phone"
                  maxLength={30}
                  value={formData.phone}
                  onChange={handleFormChange}
                  required
                />
              </label>

              {!editingStaff && (
                <>
                  <label>
                    Password
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleFormChange}
                      minLength={8}
                      pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}"
                      title="At least 8 characters, with an uppercase letter, a lowercase letter, and a number"
                      required
                    />
                    {isWeakPassword(formData.password) && (
                      <p className="field-hint">{PASSWORD_HINT}</p>
                    )}
                  </label>

                  <label>
                    Confirm Password
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleFormChange}
                      minLength={8}
                      required
                    />
                  </label>
                </>
              )}

              <button className="staff-modal-submit" type="submit" disabled={submitting}>
                {submitting
                  ? editingStaff
                    ? "Saving..."
                    : "Creating..."
                  : editingStaff
                  ? "Save Changes"
                  : "Create Staff Account"}
              </button>
            </form>
          </div>
        </div>
      )}

      {resetFor && (
        <div className="staff-modal-overlay" onClick={() => setResetFor(null)}>
          <div className="staff-modal" onClick={(e) => e.stopPropagation()}>
            <button className="staff-modal-close" type="button" onClick={() => setResetFor(null)}>
              <X size={20} />
            </button>

            <h3>Reset Password</h3>
            <p>
              Set a new password for {resetFor.full_name}. They'll be signed out on every device.
              Give them the new password yourself — it isn't emailed, and staff can't change it.
            </p>

            {resetError && <div className="staff-form-error">{resetError}</div>}

            <form onSubmit={handleResetPassword}>
              <label>
                New Password
                <input
                  type="password"
                  name="password"
                  value={resetForm.password}
                  onChange={(e) => setResetForm((prev) => ({ ...prev, password: e.target.value }))}
                  minLength={8}
                  pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}"
                  title="At least 8 characters, with an uppercase letter, a lowercase letter, and a number"
                  required
                />
                {isWeakPassword(resetForm.password) && <p className="field-hint">{PASSWORD_HINT}</p>}
              </label>

              <label>
                Confirm Password
                <input
                  type="password"
                  name="confirmPassword"
                  value={resetForm.confirmPassword}
                  onChange={(e) => setResetForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  minLength={8}
                  required
                />
              </label>

              <button className="staff-modal-submit" type="submit" disabled={resetting}>
                {resetting ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          </div>
        </div>
      )}

      {historyFor && (
        <div className="staff-modal-overlay" onClick={() => setHistoryFor(null)}>
          <div className="staff-modal staff-history-modal" onClick={(e) => e.stopPropagation()}>
            <button className="staff-modal-close" type="button" onClick={() => setHistoryFor(null)}>
              <X size={20} />
            </button>

            <h3>Login History</h3>
            <p>
              {historyFor.full_name}'s sign-ins and sign-outs, newest first. A sign-out is only
              recorded when they click Logout — closing the browser leaves it open until the
              session expires.
            </p>

            {historyError && <div className="staff-form-error">{historyError}</div>}

            {historyLoading ? (
              <p className="staff-history-empty">Loading...</p>
            ) : !historyError && sessions.length === 0 ? (
              <p className="staff-history-empty">No sign-ins recorded yet.</p>
            ) : (
              <ul className="staff-history-list">
                {sessions.map((session) => (
                  <li key={session.id}>
                    <div className="staff-history-times">
                      <strong>Login: {formatDateTime(session.logged_in_at)}</strong>
                      <span className={session.logged_out_at ? "" : "open"}>
                        {session.logged_out_at
                          ? `Logout: ${formatDateTime(session.logged_out_at)} · ${formatDuration(
                              session.logged_in_at,
                              session.logged_out_at
                            )}`
                          : "No logout recorded"}
                      </span>
                    </div>
                    <small>
                      {session.login_method === "google" ? "Google" : "Password"} ·{" "}
                      {describeDevice(session.user_agent)}
                      {session.ip_address ? ` · ${session.ip_address}` : ""}
                    </small>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminStaff;
