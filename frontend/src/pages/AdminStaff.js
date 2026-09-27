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
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import AdminStatCard from "../components/AdminStatCard";
import { API_URL } from "../config";
import { isWeakPassword, PASSWORD_HINT } from "../utils/password";
import "./AdminStaff.css";

function AdminStaff() {
  const navigate = useNavigate();

  const [staff, setStaff] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Account Status");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      const confirmDeactivate = window.confirm("Deactivate this staff account?");
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
    const confirmDelete = window.confirm("Delete this staff account?");
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

  const handleFormChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setFormError("");
    setFormData({
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    });
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/admin/staff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.message || "Failed to create staff account");
        setSubmitting(false);
        return;
      }

      closeAddModal();
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
          <Link to="/admin-dashboard" className="back-button">
            <ArrowLeft size={20} />
          </Link>

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

        <button className="add-staff-btn" type="button" onClick={() => setShowAddModal(true)}>
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
                <th>Joined</th>
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
                          <p>STF-{s.id}</p>
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

                    <td>{new Date(s.created_at).toLocaleDateString()}</td>

                    <td>
                      <div className="staff-table-actions">
                        <button
                          className="warning"
                          title={s.is_active ? "Deactivate Account" : "Reactivate Account"}
                          type="button"
                          onClick={() => handleToggleActive(s.id, s.is_active)}
                        >
                          <UserX size={17} />
                        </button>

                        <button
                          className="danger"
                          title="Delete Staff Account"
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

      {showAddModal && (
        <div className="staff-modal-overlay" onClick={closeAddModal}>
          <div className="staff-modal" onClick={(e) => e.stopPropagation()}>
            <button className="staff-modal-close" type="button" onClick={closeAddModal}>
              <X size={20} />
            </button>

            <h3>Add Staff Account</h3>
            <p>Create a login for a new MAO staff member.</p>

            {formError && <div className="staff-form-error">{formError}</div>}

            <form onSubmit={handleCreateStaff}>
              <label>
                Full Name
                <input
                  type="text"
                  name="fullName"
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
                  value={formData.phone}
                  onChange={handleFormChange}
                  required
                />
              </label>

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

              <button className="staff-modal-submit" type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Staff Account"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminStaff;
