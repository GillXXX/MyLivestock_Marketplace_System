import { useCallback, useEffect, useState } from "react";

import {
  ArrowLeft,
  BellRing,
  ClipboardCheck,
  ShieldCheck,
  FileCheck2,
  Users,
  CheckCircle,
  AlertTriangle,
  Eye,
  Trash2,
  Search,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import AdminStatCard from "../components/AdminStatCard";
import { API_URL } from "../config";
import "./AdminNotifications.css";

function AdminNotifications() {
  const navigate = useNavigate();

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isStaff = currentUser.role === "mao_staff";

  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({
    totalAlerts: 0,
    unreadAlerts: 0,
    verificationRequests: 0,
    resolvedToday: 0,
  });

  const [categories, setCategories] = useState({
    listingApprovals: 0,
    documentVerification: 0,
    transactionAlerts: 0,
    userReports: 0,
  });

  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const res = await fetch(`${API_URL}/api/admin/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Failed to load notifications");
        setLoading(false);
        return;
      }

      setNotifications(data.notifications);
      setStats(data.stats);
      setCategories(data.categories);
      setLoading(false);
    } catch (error) {
      setMessage("Cannot connect to backend server");
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async (id) => {
    try {
      const token = localStorage.getItem("token");

      await fetch(`${API_URL}/api/admin/notifications/${id}/read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      fetchNotifications();
    } catch (error) {
      alert("Cannot connect to backend server");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem("token");

      await fetch(`${API_URL}/api/admin/notifications/read-all`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      fetchNotifications();
    } catch (error) {
      alert("Cannot connect to backend server");
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Delete this notification?");
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("token");

      await fetch(`${API_URL}/api/admin/notifications/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      fetchNotifications();
    } catch (error) {
      alert("Cannot connect to backend server");
    }
  };

  const getNotificationRoute = (type) => {
    if (type === "Listing Approval") return "/admin-listings";
    if (type === "Verification Request") return "/admin-verification";
    if (type === "Transaction Alert") return "/admin-transactions";
    if (type === "User Registration") return "/admin-users";
    return null;
  };

  const handleNotificationClick = (notif) => {
    const route = getNotificationRoute(notif.type);
    if (!route) return;

    if (notif.status === "Unread") {
      handleMarkRead(notif.id);
    }

    navigate(route);
  };

  const filteredNotifications = notifications.filter((notif) => {
    const search = searchText.toLowerCase();

    const matchesSearch =
      notif.title?.toLowerCase().includes(search) ||
      notif.message?.toLowerCase().includes(search) ||
      notif.type?.toLowerCase().includes(search);

    const matchesType =
      typeFilter === "All Types" || notif.type === typeFilter;

    const matchesStatus =
      statusFilter === "All Status" || notif.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const getIcon = (type) => {
    if (type === "Listing Approval") return <ClipboardCheck size={22} />;
    if (type === "Verification Request") return <ShieldCheck size={22} />;
    if (type === "Transaction Alert") return <FileCheck2 size={22} />;
    if (type === "User Registration") return <Users size={22} />;
    return <BellRing size={22} />;
  };

  const getTypeAccent = (type) => {
    if (type === "Listing Approval") return "blue";
    if (type === "Verification Request") return "amber";
    if (type === "Transaction Alert") return "green";
    if (type === "User Registration") return "purple";
    return "gold";
  };

  const formatTime = (time) => {
    return new Date(time).toLocaleString();
  };

  const visibleCategories = CATEGORY_DEFS.filter(
    (cat) => !isStaff || cat.key !== "userReports"
  );

  if (loading) {
    return <h2 style={{ padding: "30px" }}>Loading notifications...</h2>;
  }

  if (message) {
    return <h2 style={{ padding: "30px", color: "red" }}>{message}</h2>;
  }

  return (
    <div className="admin-notifications-page">
      <div className="notifications-header">
        <Link to="/admin-dashboard" className="back-btn">
          <ArrowLeft size={20} />
        </Link>

        <div>
          <span className="notif-eyebrow">MAO ADMIN CENTER</span>
          <h1>Notifications</h1>
          <p>
            Review listing approvals, verification requests, transaction alerts,
            and farmer reports.
          </p>
        </div>
      </div>

      <section className="notification-stats">
        <AdminStatCard
          accent="blue"
          icon={<BellRing />}
          value={stats.totalAlerts}
          label="Total Alerts"
          note="All notifications"
        />
        <AdminStatCard
          accent="red"
          icon={<AlertTriangle />}
          value={stats.unreadAlerts}
          label="Unread Alerts"
          note="Needs your attention"
        />
        <AdminStatCard
          accent="amber"
          icon={<ShieldCheck />}
          value={stats.verificationRequests}
          label="Verification Requests"
          note="Pending document review"
        />
        <AdminStatCard
          accent="green"
          icon={<CheckCircle />}
          value={stats.resolvedToday}
          label="Resolved Today"
          note="Cleared in the last 24h"
        />
      </section>

      <section className="notification-categories-panel">
        <div className="notif-category-header">
          <div>
            <h3>Notification Categories</h3>
            <p>Breakdown of alerts by marketplace area.</p>
          </div>

          <span className="notif-category-count-pill">
            <BellRing size={14} />
            {visibleCategories.length} categories
          </span>
        </div>

        <div className="notif-category-strip">
          {visibleCategories.map((cat) => (
            <CategoryItem
              key={cat.key}
              icon={cat.icon}
              accent={cat.accent}
              title={cat.title}
              count={categories[cat.key]}
              text={cat.text}
            />
          ))}
        </div>
      </section>

      <div className="notification-toolbar">
        <div className="notification-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option>All Types</option>
          <option>Listing Approval</option>
          <option>Verification Request</option>
          <option>Transaction Alert</option>
          {!isStaff && <option>User Registration</option>}
        </select>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option>All Status</option>
          <option>Unread</option>
          <option>Read</option>
        </select>
      </div>

      <section className="notifications-list-card">
        <div className="notifications-card-header">
          <div>
            <h3>Admin Notification Inbox</h3>
            <p>Latest marketplace actions that require admin attention.</p>
          </div>

          <button className="mark-all-btn" type="button" onClick={handleMarkAllRead}>
            <CheckCircle size={16} />
            Mark all as read
          </button>
        </div>

        <div className="notification-list">
          {filteredNotifications.length === 0 ? (
            <p>No notifications found.</p>
          ) : (
            filteredNotifications.map((notif) => {
              const route = getNotificationRoute(notif.type);
              const accent = getTypeAccent(notif.type);

              return (
              <div
                className={`notification-row accent-${accent} ${
                  notif.status === "Unread" ? "unread" : ""
                } ${route ? "clickable" : ""}`}
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
              >
                <div className="notification-icon">{getIcon(notif.type)}</div>

                <div className="notification-content">
                  <div className="notification-meta">
                    <span className="notification-type-chip">{notif.type}</span>
                    <small>{formatTime(notif.time)}</small>
                  </div>

                  <h4>{notif.title}</h4>
                  <p>{notif.message}</p>

                  <div className="notification-tags">
                    <span
                      className={
                        notif.status === "Unread" ? "tag-unread" : "tag-read"
                      }
                    >
                      <span className="tag-dot"></span>
                      {notif.status}
                    </span>
                  </div>
                </div>

                <div className="notification-actions">
                  {notif.status === "Unread" && (
                    <button
                      className="neutral"
                      title="Mark as read"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkRead(notif.id);
                      }}
                    >
                      <Eye size={17} />
                    </button>
                  )}

                  <button
                    className="danger"
                    title="Delete notification"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(notif.id);
                    }}
                  >
                    <Trash2 size={17} />
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

const CATEGORY_DEFS = [
  {
    key: "listingApprovals",
    title: "Listing Approvals",
    text: "Livestock posts waiting for review",
    icon: <ClipboardCheck size={18} />,
    accent: "blue",
  },
  {
    key: "documentVerification",
    title: "Document Verification",
    text: "Certificates and permits pending",
    icon: <ShieldCheck size={18} />,
    accent: "amber",
  },
  {
    key: "transactionAlerts",
    title: "Transaction Alerts",
    text: "Workflow and transaction updates",
    icon: <FileCheck2 size={18} />,
    accent: "green",
  },
  {
    key: "userReports",
    title: "User Reports",
    text: "Farmer and buyer account updates",
    icon: <Users size={18} />,
    accent: "purple",
  },
];

function CategoryItem({ icon, accent, title, count, text }) {
  return (
    <div className={`notif-category accent-${accent}`}>
      <div className="notif-category-top">
        <div className="notif-category-icon">{icon}</div>
        <span className="notif-category-count">{count}</span>
      </div>

      <span className="notif-category-title">{title}</span>
      <p className="notif-category-text">{text}</p>
    </div>
  );
}

export default AdminNotifications;