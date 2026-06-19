import { useEffect, useState } from "react";

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
  Filter,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import "./AdminNotifications.css";

function AdminNotifications() {
  const navigate = useNavigate();

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

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const res = await fetch("http://localhost:5000/api/admin/notifications", {
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
    };

    fetchNotifications();
  }, [navigate]);

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
    if (type === "Document Verification") return <ShieldCheck size={22} />;
    if (type === "Transaction Alert") return <FileCheck2 size={22} />;
    if (type === "User Registration") return <Users size={22} />;
    return <BellRing size={22} />;
  };

  const formatTime = (time) => {
    return new Date(time).toLocaleString();
  };

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
        <NotifStat icon={<BellRing />} value={stats.totalAlerts} label="Total Alerts" />
        <NotifStat icon={<AlertTriangle />} value={stats.unreadAlerts} label="Unread Alerts" />
        <NotifStat icon={<ShieldCheck />} value={stats.verificationRequests} label="Verification Requests" />
        <NotifStat icon={<CheckCircle />} value={stats.resolvedToday} label="Resolved Today" />
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
          <option>Document Verification</option>
          <option>Transaction Alert</option>
          <option>User Registration</option>
        </select>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option>All Status</option>
          <option>Unread</option>
          <option>Read</option>
        </select>

        <button type="button">
          <Filter size={17} />
          Filter
        </button>
      </div>

      <section className="notifications-layout">
        <div className="notifications-list-card">
          <div className="notifications-card-header">
            <div>
              <h3>Admin Notification Inbox</h3>
              <p>Latest marketplace actions that require admin attention.</p>
            </div>

            <button type="button">Mark all as read</button>
          </div>

          <div className="notification-list">
            {filteredNotifications.length === 0 ? (
              <p>No notifications found.</p>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  className={`notification-row ${
                    notif.status === "Unread" ? "unread" : ""
                  }`}
                  key={notif.id}
                >
                  <div className="notification-icon">{getIcon(notif.type)}</div>

                  <div className="notification-content">
                    <div className="notification-meta">
                      <span>{notif.type}</span>
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
                        {notif.status}
                      </span>
                    </div>
                  </div>

                  <div className="notification-actions">
                    <button title="View details" type="button">
                      <Eye size={17} />
                    </button>

                    <button className="danger" title="Delete notification" type="button">
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <aside className="notification-side-panel">
          <h3>Notification Categories</h3>

          <CategoryItem
            icon={<ClipboardCheck size={20} />}
            title="Listing Approvals"
            count={categories.listingApprovals}
            text="Livestock posts waiting for review"
          />

          <CategoryItem
            icon={<ShieldCheck size={20} />}
            title="Document Verification"
            count={categories.documentVerification}
            text="Certificates and permits pending"
          />

          <CategoryItem
            icon={<FileCheck2 size={20} />}
            title="Transaction Alerts"
            count={categories.transactionAlerts}
            text="Workflow and transaction updates"
          />

          <CategoryItem
            icon={<Users size={20} />}
            title="User Reports"
            count={categories.userReports}
            text="Farmer and buyer account updates"
          />
        </aside>
      </section>
    </div>
  );
}

function NotifStat({ icon, value, label }) {
  return (
    <div className="notif-stat-card">
      <div className="notif-stat-icon">{icon}</div>
      <h2>{value}</h2>
      <p>{label}</p>
    </div>
  );
}

function CategoryItem({ icon, title, count, text }) {
  return (
    <div className="notif-category">
      <div className="notif-category-icon">{icon}</div>

      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>

      <span>{count}</span>
    </div>
  );
}

export default AdminNotifications;