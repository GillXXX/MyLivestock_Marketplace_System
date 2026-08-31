import { useCallback, useEffect, useState } from "react";

import {
  ArrowLeft,
  Search,
  Download,
  UserCheck,
  UserX,
  Trash2,
  ShieldCheck,
  Tractor,
  ShoppingBag,
  Clock,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import { exportToCsv } from "../utils/exportCsv";
import { API_URL } from "../config";
import "./AdminUsers.css";

function AdminUsers() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    farmers: 0,
    buyers: 0,
    pendingVerification: 0,
    verifiedRate: "0%",
  });

  const [verificationQueue, setVerificationQueue] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [statusFilter, setStatusFilter] = useState("All Account Status");
  const [verificationFilter, setVerificationFilter] = useState("All Verification");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const res = await fetch(`${API_URL}/api/admin/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Failed to load users");
        setLoading(false);
        return;
      }

      setUsers(data.users);
      setStats(data.stats);
      setVerificationQueue(data.verificationQueue);
      setLoading(false);
    } catch (error) {
      setMessage("Cannot connect to backend server");
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Delete this user?");
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/admin/users/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to delete user");
        return;
      }

      alert("User deleted successfully");
      fetchUsers();
    } catch (error) {
      alert("Cannot connect to backend server");
    }
  };

  const handleVerify = async (id) => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/admin/users/${id}/verify`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to verify farmer");
        return;
      }

      fetchUsers();
    } catch (error) {
      alert("Cannot connect to backend server");
    }
  };

  const handleRejectVerification = async (id) => {
    const reason = window.prompt("Reason for rejecting this verification (optional):");

    if (reason === null) {
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_URL}/api/admin/users/${id}/reject-verification`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to reject verification");
        return;
      }

      fetchUsers();
    } catch (error) {
      alert("Cannot connect to backend server");
    }
  };

  const getVerificationDocs = (user) => {
    if (!user.verification_document) return [];
    try {
      const parsed = JSON.parse(user.verification_document);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  };

  const handleToggleActive = async (id, isActive) => {
    if (isActive) {
      const confirmDeactivate = window.confirm("Deactivate this account?");
      if (!confirmDeactivate) return;
    }

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/admin/users/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to update account status");
        return;
      }

      fetchUsers();
    } catch (error) {
      alert("Cannot connect to backend server");
    }
  };

  const handleExport = () => {
    exportToCsv("users.csv", [
      { label: "ID", value: (u) => u.id },
      { label: "Name", value: (u) => u.full_name },
      { label: "Email", value: (u) => u.email },
      { label: "Phone", value: (u) => u.phone },
      { label: "Role", value: (u) => u.role },
      { label: "Status", value: (u) => (u.is_active ? "Active" : "Inactive") },
      {
        label: "Verification",
        value: (u) => (u.role === "farmer" ? (u.is_verified ? "Verified" : "Unverified") : "N/A"),
      },
      { label: "Listings", value: (u) => u.listings },
      { label: "Joined", value: (u) => new Date(u.created_at).toLocaleDateString() },
    ], filteredUsers);
  };

  const filteredUsers = users.filter((user) => {
    const search = searchText.toLowerCase();

    const matchesSearch =
      user.full_name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      String(user.id).includes(search);

    const matchesRole =
      roleFilter === "All Roles" ||
      user.role.toLowerCase() === roleFilter.toLowerCase();

    const matchesStatus =
      statusFilter === "All Account Status" ||
      (statusFilter === "Active" ? user.is_active : !user.is_active);

    const matchesVerification =
      verificationFilter === "All Verification" ||
      (verificationFilter === "Verified" ? Boolean(user.is_verified) : !user.is_verified);

    return matchesSearch && matchesRole && matchesStatus && matchesVerification;
  });

  if (loading) {
    return <h2 style={{ padding: "30px" }}>Loading users...</h2>;
  }

  if (message) {
    return <h2 style={{ padding: "30px", color: "red" }}>{message}</h2>;
  }

  return (
    <div className="enterprise-users-page">
      <header className="users-page-header">
        <div className="header-left">
          <Link to="/admin-dashboard" className="back-button">
            <ArrowLeft size={20} />
          </Link>

          <div>
            <span className="eyebrow">MAO ADMINISTRATION</span>
            <h1>User Management</h1>
            <p>
              Manage farmer and buyer accounts, verify farmer profiles, and
              monitor user access within the livestock marketplace.
            </p>
          </div>
        </div>

        <button className="export-btn" type="button" onClick={handleExport}>
          <Download size={18} />
          Export Users
        </button>
      </header>

      <section className="user-kpi-grid">
        <KpiCard
          icon={<Tractor size={24} />}
          value={stats.farmers}
          label="Registered Farmers"
          note="Total farmer accounts"
        />

        <KpiCard
          icon={<ShoppingBag size={24} />}
          value={stats.buyers}
          label="Registered Buyers"
          note="Total buyer accounts"
        />

        <KpiCard
          icon={<Clock size={24} />}
          value={stats.pendingVerification}
          label="Pending Verification"
          note="Requires MAO review"
        />

        <KpiCard
          icon={<ShieldCheck size={24} />}
          value={stats.verifiedRate}
          label="Verified Accounts"
          note="Account quality rate"
        />
      </section>

      <section className="user-management-card">
        <div className="management-toolbar">
          <div className="toolbar-title">
            <h3>Registered System Users</h3>
            <p>Farmers and buyers currently registered in the system.</p>
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

        <div className="filter-row">
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option>All Roles</option>
            <option>Farmer</option>
            <option>Buyer</option>
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option>All Account Status</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>

          <select
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
          >
            <option>All Verification</option>
            <option>Verified</option>
            <option>Unverified</option>
          </select>
        </div>

        <div className="enterprise-table-wrapper">
          <table className="enterprise-users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Contact</th>
                <th>Role</th>
                <th>Status</th>
                <th>Verification</th>
                <th>Listings</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="8">No users found.</td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <div className="avatar">{user.full_name.charAt(0)}</div>

                        <div>
                          <strong>{user.full_name}</strong>
                          <p>USR-{user.id} • {user.location}</p>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="contact-cell">
                        <strong>{user.email}</strong>
                        <p>{user.phone}</p>
                      </div>
                    </td>

                    <td>
                      <span className={`role-pill ${user.role}`}>
                        {user.role === "farmer" ? (
                          <Tractor size={14} />
                        ) : (
                          <ShoppingBag size={14} />
                        )}
                        {user.role}
                      </span>
                    </td>

                    <td>
                      <span className={`status-pill ${user.is_active ? "active" : "inactive"}`}>
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`verification-pill ${
                          user.role !== "farmer"
                            ? "neutral"
                            : user.is_verified
                            ? "verified"
                            : "pending"
                        }`}
                      >
                        {user.role === "farmer"
                          ? user.is_verified
                            ? "Verified"
                            : "Unverified"
                          : "N/A"}
                      </span>
                    </td>

                    <td>
                      <strong className="listing-count">{user.listings}</strong>
                    </td>

                    <td>{new Date(user.created_at).toLocaleDateString()}</td>

                    <td>
                      <div className="table-actions">
                        {user.role === "farmer" && !user.is_verified && (
                          <button
                            title="Verify Farmer"
                            type="button"
                            onClick={() => handleVerify(user.id)}
                          >
                            <UserCheck size={17} />
                          </button>
                        )}

                        <button
                          title={user.is_active ? "Deactivate Account" : "Reactivate Account"}
                          type="button"
                          onClick={() => handleToggleActive(user.id, user.is_active)}
                        >
                          <UserX size={17} />
                        </button>

                        <button
                          className="danger"
                          title="Delete User"
                          type="button"
                          onClick={() => handleDelete(user.id)}
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

      <section className="verification-summary">
        <div>
          <h3>Farmer Verification Queue</h3>
          <p>
            Farmers with pending verification should be reviewed before their
            livestock listings are approved.
          </p>
        </div>

        <div className="queue-list">
          {verificationQueue.length === 0 ? (
            <div>
              <strong>No pending submissions</strong>
              <span>No farmers are currently awaiting verification review.</span>
            </div>
          ) : (
            verificationQueue.map((user) => {
              const docs = getVerificationDocs(user);

              return (
                <div key={user.id} className="queue-item">
                  <div>
                    <strong>{user.full_name}</strong>
                    <span>
                      {user.verification_submitted_at
                        ? `Submitted ${new Date(user.verification_submitted_at).toLocaleDateString()}`
                        : user.farm_location || "Farm location not provided"}
                    </span>
                  </div>

                  <div className="queue-actions">
                    {docs.map((doc) => (
                      <button
                        key={doc.type}
                        type="button"
                        onClick={() => window.open(doc.url, "_blank")}
                      >
                        View {doc.type}
                      </button>
                    ))}

                    <button type="button" onClick={() => handleVerify(user.id)}>
                      <UserCheck size={15} />
                      Approve
                    </button>

                    <button
                      className="danger"
                      type="button"
                      onClick={() => handleRejectVerification(user.id)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

function KpiCard({ icon, value, label, note }) {
  return (
    <div className="user-kpi-card">
      <div className="kpi-icon">{icon}</div>

      <h2>{value}</h2>
      <p>{label}</p>
      <small>{note}</small>
    </div>
  );
}

export default AdminUsers;