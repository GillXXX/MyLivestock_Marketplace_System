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
  FileText,
  XCircle,
  Eye,
  X,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { exportToCsv } from "../utils/exportCsv";
import useGoBack from "../utils/useGoBack";
import AdminStatCard from "../components/AdminStatCard";
import { API_URL } from "../config";
import { VERUELA_BARANGAYS } from "../utils/veruelaGeo";
import "./AdminUsers.css";

function getAvatarUrl(image) {
  if (!image) return null;
  return image.startsWith("http") ? image : `${API_URL}${image}`;
}

function AdminUsers() {
  const navigate = useNavigate();
  const goBack = useGoBack("/admin-dashboard");

  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    farmers: 0,
    buyers: 0,
    pendingVerification: 0,
    verifiedRate: "0%",
  });

  const [verificationQueue, setVerificationQueue] = useState([]);
  const [viewingDocsFor, setViewingDocsFor] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [statusFilter, setStatusFilter] = useState("All Account Status");
  const [verificationFilter, setVerificationFilter] = useState("All Verification");
  const [barangayFilter, setBarangayFilter] = useState("All Barangays");
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

  // Verification documents come back as signed links on this server
  // ("/private-files/..."); older ones may still be full public URLs.
  const docHref = (url) => (url && url.startsWith("/") ? `${API_URL}${url}` : url);

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
      { label: "Barangay", value: (u) => u.barangay || "" },
      { label: "Purok", value: (u) => u.purok || "" },
      { label: "Status", value: (u) => (u.is_active ? "Active" : "Inactive") },
      {
        label: "Verification",
        value: (u) => (u.role === "farmer" ? (u.is_verified ? "Verified" : "Unverified") : "N/A"),
      },
      { label: "Listings", value: (u) => (u.role === "farmer" ? u.listings : "N/A") },
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

    // Only farmers record a barangay; "Not specified" finds those who haven't yet.
    const matchesBarangay =
      barangayFilter === "All Barangays" ||
      (barangayFilter === "Not specified"
        ? user.role === "farmer" && !user.barangay
        : user.barangay === barangayFilter);

    return matchesSearch && matchesRole && matchesStatus && matchesVerification && matchesBarangay;
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
          <button type="button" className="back-button" onClick={goBack} aria-label="Go back">
            <ArrowLeft size={20} />
          </button>

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
        <AdminStatCard
          accent="green"
          icon={<Tractor size={24} />}
          value={stats.farmers}
          label="Registered Farmers"
          note="Total farmer accounts"
        />

        <AdminStatCard
          accent="blue"
          icon={<ShoppingBag size={24} />}
          value={stats.buyers}
          label="Registered Buyers"
          note="Total buyer accounts"
        />

        <AdminStatCard
          accent="amber"
          icon={<Clock size={24} />}
          value={stats.pendingVerification}
          label="Farmers to Verify"
          note="Submitted ID and barangay certificate"
        />

        <AdminStatCard
          accent="purple"
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

          <select value={barangayFilter} onChange={(e) => setBarangayFilter(e.target.value)}>
            <option>All Barangays</option>
            {VERUELA_BARANGAYS.map((barangay) => (
              <option key={barangay.name}>{barangay.name}</option>
            ))}
            <option>Not specified</option>
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
                        {user.profile_image ? (
                          <img
                            className="avatar"
                            src={getAvatarUrl(user.profile_image)}
                            alt={user.full_name}
                          />
                        ) : (
                          <div className="avatar">{user.full_name.charAt(0)}</div>
                        )}

                        <div>
                          <strong>{user.full_name}</strong>
                          <p>
                            USR-{user.id} •{" "}
                            {user.barangay
                              ? [user.purok, user.barangay].filter(Boolean).join(", ")
                              : user.location}
                          </p>
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

                    {/* Only farmers post listings — a count for buyers is meaningless */}
                    <td className={user.role === "farmer" ? "" : "listings-na"}>
                      {user.role === "farmer" ? (
                        <strong className="listing-count">{user.listings}</strong>
                      ) : (
                        <span className="listing-count-na">—</span>
                      )}
                    </td>

                    <td>{new Date(user.created_at).toLocaleDateString()}</td>

                    <td>
                      <div className="table-actions">
                        {user.role === "farmer" && (
                          <button
                            className="neutral"
                            title="View Submitted Documents"
                            type="button"
                            onClick={() => setViewingDocsFor(user)}
                          >
                            <Eye size={17} />
                          </button>
                        )}

                        {user.role === "farmer" && !user.is_verified && (
                          <button
                            className="approve"
                            title="Verify Farmer"
                            type="button"
                            onClick={() => handleVerify(user.id)}
                          >
                            <UserCheck size={17} />
                          </button>
                        )}

                        <button
                          className="warning"
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
            <div className="queue-empty">
              <ShieldCheck size={28} />
              <strong>No pending submissions</strong>
              <span>No farmers are currently awaiting verification review.</span>
            </div>
          ) : (
            verificationQueue.map((user) => {
              const docs = getVerificationDocs(user);

              return (
                <div key={user.id} className="queue-item">
                  <div className="queue-item-info">
                    {user.profile_image ? (
                      <img
                        className="queue-avatar"
                        src={getAvatarUrl(user.profile_image)}
                        alt={user.full_name}
                      />
                    ) : (
                      <div className="queue-avatar">{user.full_name.charAt(0)}</div>
                    )}

                    <div>
                      <strong>{user.full_name}</strong>
                      <span>
                        {user.verification_submitted_at
                          ? `Submitted ${new Date(user.verification_submitted_at).toLocaleDateString()}`
                          : user.farm_location || "Farm location not provided"}
                      </span>
                    </div>

                    <span className="queue-pending-badge">
                      <Clock size={12} />
                      Pending Review
                    </span>
                  </div>

                  <div className="queue-actions">
                    {docs.map((doc) => (
                      <button
                        key={doc.type}
                        className="doc-chip"
                        type="button"
                        onClick={() => window.open(docHref(doc.url), "_blank")}
                      >
                        <FileText size={14} />
                        {doc.type}
                      </button>
                    ))}

                    <button className="approve" type="button" onClick={() => handleVerify(user.id)}>
                      <UserCheck size={15} />
                      Approve
                    </button>

                    <button
                      className="danger"
                      type="button"
                      onClick={() => handleRejectVerification(user.id)}
                    >
                      <XCircle size={15} />
                      Reject
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {viewingDocsFor && (
        <div className="docs-modal-overlay" onClick={() => setViewingDocsFor(null)}>
          <div className="docs-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="docs-modal-close"
              type="button"
              onClick={() => setViewingDocsFor(null)}
            >
              <X size={20} />
            </button>

            <div className="docs-modal-header">
              {viewingDocsFor.profile_image ? (
                <img
                  className="docs-modal-avatar"
                  src={getAvatarUrl(viewingDocsFor.profile_image)}
                  alt={viewingDocsFor.full_name}
                />
              ) : (
                <div className="docs-modal-avatar">
                  {viewingDocsFor.full_name.charAt(0)}
                </div>
              )}

              <div>
                <strong>{viewingDocsFor.full_name}</strong>
                <span
                  className={`verification-pill ${
                    viewingDocsFor.verification_status === "Approved"
                      ? "verified"
                      : viewingDocsFor.verification_status === "Pending"
                      ? "pending"
                      : viewingDocsFor.verification_status === "Rejected"
                      ? "rejected"
                      : "neutral"
                  }`}
                >
                  {viewingDocsFor.verification_status || "Not Submitted"}
                </span>
              </div>
            </div>

            {viewingDocsFor.verification_submitted_at && (
              <p className="docs-modal-meta">
                Submitted{" "}
                {new Date(viewingDocsFor.verification_submitted_at).toLocaleDateString()}
              </p>
            )}

            {viewingDocsFor.verification_note && (
              <div className="docs-modal-note">
                <strong>Admin note:</strong> {viewingDocsFor.verification_note}
              </div>
            )}

            <div className="docs-modal-list">
              {getVerificationDocs(viewingDocsFor).length === 0 ? (
                <p className="docs-modal-empty">No documents submitted yet.</p>
              ) : (
                getVerificationDocs(viewingDocsFor).map((doc, index) => (
                  <a
                    key={index}
                    className="doc-chip"
                    href={docHref(doc.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FileText size={14} />
                    {doc.type}
                  </a>
                ))
              )}
            </div>

            {viewingDocsFor.verification_status === "Pending" && (
              <div className="docs-modal-actions">
                <button
                  className="approve"
                  type="button"
                  onClick={() => {
                    handleVerify(viewingDocsFor.id);
                    setViewingDocsFor(null);
                  }}
                >
                  <UserCheck size={15} />
                  Approve
                </button>

                <button
                  className="danger"
                  type="button"
                  onClick={() => {
                    handleRejectVerification(viewingDocsFor.id);
                    setViewingDocsFor(null);
                  }}
                >
                  <XCircle size={15} />
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUsers;