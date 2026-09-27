import { useEffect, useState } from "react";

import {
  ArrowLeft,
  BellRing,
  ClipboardCheck,
  MessageCircle,
  FileCheck2,
  CheckCircle,
  AlertTriangle,
  Search,
  Eye,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import AdminStatCard from "../components/AdminStatCard";
import { API_URL } from "../config";
import useGoBack from "../utils/useGoBack";
import "./FarmerNotifications.css";

function FarmerNotifications() {
  const navigate = useNavigate();
  const goBack = useGoBack("/farmer-dashboard");

  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({
    totalAlerts: 0,
    unreadAlerts: 0,
    listingUpdates: 0,
    buyerInquiries: 0,
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

        const res = await fetch(`${API_URL}/api/farmer/notifications`, {
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
    if (type === "Listing Status") return <ClipboardCheck size={22} />;
    if (type === "Buyer Inquiry") return <MessageCircle size={22} />;
    if (type === "Transaction Update") return <FileCheck2 size={22} />;
    return <BellRing size={22} />;
  };

  const getTypeAccent = (type) => {
    if (type === "Listing Status") return "blue";
    if (type === "Buyer Inquiry") return "amber";
    if (type === "Transaction Update") return "green";
    return "gold";
  };

  const getNotificationTarget = (notif) => {
    if (notif.type === "Listing Status") return { path: "/listings" };
    if (notif.type === "Buyer Inquiry") {
      const numericId = Number(String(notif.id).split("-")[1]);
      return {
        path: "/farmer-messages",
        state: Number.isFinite(numericId) ? { conversationId: numericId } : undefined,
      };
    }
    if (notif.type === "Transaction Update") return { path: "/farmer-transactions" };
    return null;
  };

  const markAsRead = async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: "Read" } : n))
    );
    setStats((prev) => ({ ...prev, unreadAlerts: Math.max(0, prev.unreadAlerts - 1) }));

    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_URL}/api/farmer/notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      // Best-effort — the badge will just re-settle next visit if this fails.
    }
  };

  const handleNotificationClick = (notif) => {
    if (notif.status === "Unread") markAsRead(notif.id);

    const target = getNotificationTarget(notif);
    if (target) navigate(target.path, { state: target.state });
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, status: "Read" })));
    setStats((prev) => ({ ...prev, unreadAlerts: 0 }));

    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_URL}/api/farmer/notifications/read-all`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      alert("Cannot connect to backend server");
    }
  };

  // "Sep 27, 3:04 PM" — short enough to fit beside the type on a phone
  // (the old full toLocaleString() got cut off there).
  const formatTime = (time) => {
    return new Date(time).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (loading) {
    return <h2 style={{ padding: "30px" }}>Loading notifications...</h2>;
  }

  if (message) {
    return <h2 style={{ padding: "30px", color: "red" }}>{message}</h2>;
  }

  return (
    <div className="farmer-notifications-page">
      <div className="notifications-header">
        <button type="button" className="back-btn" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>

        <div>
          <span className="notif-eyebrow">FARMER PORTAL</span>
          <h1>Notifications</h1>
          <p>
            Stay updated on listing approvals, buyer inquiries, and
            transaction progress.
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
          icon={<ClipboardCheck />}
          value={stats.listingUpdates}
          label="Listing Updates"
          note="Approvals & status changes"
        />
        <AdminStatCard
          accent="green"
          icon={<CheckCircle />}
          value={stats.buyerInquiries}
          label="Buyer Inquiries"
          note="New messages from buyers"
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
            {CATEGORY_DEFS.length} categories
          </span>
        </div>

        <div className="notif-category-strip">
          {CATEGORY_DEFS.map((cat) => (
            <CategoryItem
              key={cat.key}
              icon={cat.icon}
              accent={cat.accent}
              title={cat.title}
              count={
                cat.key === "transactionUpdates"
                  ? notifications.filter((n) => n.type === "Transaction Update").length
                  : stats[cat.key]
              }
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
          <option>Listing Status</option>
          <option>Buyer Inquiry</option>
          <option>Transaction Update</option>
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
            <h3>Notification Inbox</h3>
            <p>Latest updates related to your listings and sales.</p>
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
              const clickable = Boolean(getNotificationTarget(notif));
              const accent = getTypeAccent(notif.type);

              return (
              <div
                className={`notification-row accent-${accent} ${
                  notif.status === "Unread" ? "unread" : ""
                } ${clickable ? "clickable" : ""}`}
                key={notif.id}
                onClick={clickable ? () => handleNotificationClick(notif) : undefined}
                role={clickable ? "button" : undefined}
                tabIndex={clickable ? 0 : undefined}
                onKeyDown={
                  clickable
                    ? (e) => {
                        if (e.key === "Enter") handleNotificationClick(notif);
                      }
                    : undefined
                }
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

                {notif.status === "Unread" && (
                  <div className="notification-actions">
                    <button
                      className="neutral"
                      title="Mark as read"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notif.id);
                      }}
                    >
                      <Eye size={17} />
                    </button>
                  </div>
                )}
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
    key: "listingUpdates",
    title: "Listing Status",
    text: "Approvals, rejections, and listing changes",
    icon: <ClipboardCheck size={18} />,
    accent: "blue",
  },
  {
    key: "buyerInquiries",
    title: "Buyer Inquiries",
    text: "New buyers interested in your listings",
    icon: <MessageCircle size={18} />,
    accent: "amber",
  },
  {
    key: "transactionUpdates",
    title: "Transaction Updates",
    text: "Workflow progress on active sales",
    icon: <FileCheck2 size={18} />,
    accent: "green",
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

export default FarmerNotifications;
