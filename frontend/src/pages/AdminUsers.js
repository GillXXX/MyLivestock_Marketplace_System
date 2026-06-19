import { useEffect, useState } from "react";

import {
  ArrowLeft,
  Search,
  Filter,
  Download,
  Eye,
  UserCheck,
  UserX,
  Trash2,
  ShieldCheck,
  Tractor,
  ShoppingBag,
  Clock,
  MoreVertical,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
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
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const res = await fetch("http://localhost:5000/api/admin/users", {
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
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Delete this user?");
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`http://localhost:5000/api/admin/users/${id}`, {
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

  const filteredUsers = users.filter((user) => {
    const search = searchText.toLowerCase();

    const matchesSearch =
      user.full_name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      String(user.id).includes(search);

    const matchesRole =
      roleFilter === "All Roles" ||
      user.role.toLowerCase() === roleFilter.toLowerCase();

    return matchesSearch && matchesRole;
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

        <button className="export-btn" type="button">
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

            <button className="filter-btn" type="button">
              <Filter size={18} />
              Filters
            </button>
          </div>
        </div>

        <div className="filter-row">
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option>All Roles</option>
            <option>Farmer</option>
            <option>Buyer</option>
          </select>

          <select>
            <option>All Account Status</option>
            <option>Active</option>
          </select>

          <select>
            <option>All Verification</option>
            <option>Verified</option>
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
                      <span className="status-pill active">Active</span>
                    </td>

                    <td>
                      <span className="verification-pill verified">
                        {user.role === "farmer" ? "Verified" : "N/A"}
                      </span>
                    </td>

                    <td>
                      <strong className="listing-count">{user.listings}</strong>
                    </td>

                    <td>{new Date(user.created_at).toLocaleDateString()}</td>

                    <td>
                      <div className="table-actions">
                        <button title="View Details" type="button">
                          <Eye size={17} />
                        </button>

                        <button title="Verify Farmer" type="button">
                          <UserCheck size={17} />
                        </button>

                        <button title="Deactivate Account" type="button">
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

                        <button title="More Options" type="button">
                          <MoreVertical size={17} />
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
              <strong>No farmers yet</strong>
              <span>No verification records available.</span>
            </div>
          ) : (
            verificationQueue.slice(0, 3).map((user) => (
              <div key={user.id}>
                <strong>{user.full_name}</strong>
                <span>{user.farm_location || "Farm location not provided"}</span>
              </div>
            ))
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