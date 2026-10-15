import { useEffect, useState } from "react";

import {
  ArrowLeft,
  BellRing,
  ShoppingBag,
  FileCheck2,
  AlertTriangle,
  CheckCircle,
  Search,
  ChevronRight,
  Eye,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import AdminStatCard from "../components/AdminStatCard";
import { API_URL } from "../config";
import useGoBack from "../utils/useGoBack";
import "./BuyerNotifications.css";

const CATEGORY_DEFS = [
  {
    key: "inquiryUpdates",
    title: "Inquiry Updates",
    text: "Replies and updates from sellers",
    icon: <ShoppingBag size={18} />,
    accent: "blue",
  },
  {
    key: "transactionUpdates",
    title: "Transaction Updates",
    text: "Workflow progress on your purchases",
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

function BuyerNotifications() {
  const navigate = useNavigate();
  const goBack = useGoBack("/buyer-dashboard");

  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({
    totalAlerts: 0,
    unreadAlerts: 0,
    inquiryUpdates: 0,
    transactionUpdates: 0,
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

        const res = await fetch(`${API_URL}/api/buyer/notifications`, {
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

  const isUnread = (notif) => notif.status === "Unread";

  const filteredNotifications = notifications.filter((notif) => {
    const search = searchText.toLowerCase();

    const matchesSearch =
      notif.title?.toLowerCase().includes(search) ||
      notif.message?.toLowerCase().includes(search) ||
      notif.type?.toLowerCase().includes(search);

    const matchesType =
      typeFilter === "All Types" || notif.type === typeFilter;

    const matchesStatus =
      statusFilter === "All Status" ||
      (statusFilter === "Unread" ? isUnread(notif) : !isUnread(notif));

    return matchesSearch && matchesType && matchesStatus;
  });

  const liveUnreadCount = stats.unreadAlerts;

  const getIcon = (type) => {
    if (type === "Inquiry Status") return <ShoppingBag size={22} />;
    if (type === "Transaction Update") return <FileCheck2 size={22} />;
    return <BellRing size={22} />;
  };

  const getTypeAccent = (type) => {
    if (type === "Inquiry Status") return "blue";
    if (type === "Transaction Update") return "green";
    return "gold";
  };

  const getNotificationLink = (notif) => {
    if (notif.type === "Inquiry Status") {
      return {
        path: "/buyer-messages",
        state: notif.conversationId ? { conversationId: notif.conversationId } : undefined,
      };
    }
    if (notif.type === "Transaction Update") {
      return {
        path: "/buyer-transactions",
        state: notif.transactionId ? { transactionId: notif.transactionId } : undefined,
      };
    }
    return null;
  };

  const markAsRead = async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: "Read" } : n))
    );
    setStats((prev) => ({ ...prev, unreadAlerts: Math.max(0, prev.unreadAlerts - 1) }));

    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_URL}/api/buyer/notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      // Best-effort — the badge will just re-settle next visit if this fails.
    }
  };

  const handleNotificationClick = (notif) => {
    if (notif.status === "Unread") markAsRead(notif.id);

    const link = getNotificationLink(notif);
    if (!link) return;
    navigate(link.path, { state: link.state });
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, status: "Read" })));
    setStats((prev) => ({ ...prev, unreadAlerts: 0 }));

    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_URL}/api/buyer/notifications/read-all`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      alert("Cannot connect to backend server");
    }
  };

  const formatTime = (time) => {
    const date = new Date(time);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="buyer-notifications-page">
        <div className="notif-skeleton-header">
          <div className="notif-skeleton-block notif-skeleton-btn"></div>
          <div>
            <div className="notif-skeleton-block notif-skeleton-tag"></div>
            <div className="notif-skeleton-block notif-skeleton-title"></div>
          </div>
        </div>

        <div className="notification-stats">
          {[0, 1, 2, 3].map((i) => (
            <div className="notif-skeleton-block notif-skeleton-stat" key={i}></div>
          ))}
        </div>

        <div className="notif-skeleton-block notif-skeleton-toolbar"></div>

        {[0, 1, 2, 3].map((i) => (
          <div className="notif-skeleton-block notif-skeleton-row" key={i}></div>
        ))}
      </div>
    );
  }

  if (message) {
    return <h2 style={{ padding: "30px", color: "red" }}>{message}</h2>;
  }

  return (
    <div className="buyer-notifications-page">
      <div className="notifications-header">
        <button type="button" className="back-btn" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>

        <div>
          <span className="notif-eyebrow">BUYER PORTAL</span>
          <h1>Notifications</h1>
          <p>
            Stay updated on your livestock inquiries and transaction progress.
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
          value={liveUnreadCount}
          label="Unread Alerts"
          note="Needs your attention"
        />
        <AdminStatCard
          accent="amber"
          icon={<ShoppingBag />}
          value={stats.inquiryUpdates}
          label="Inquiry Updates"
          note="Replies from sellers"
        />
        <AdminStatCard
          accent="green"
          icon={<FileCheck2 />}
          value={stats.transactionUpdates}
          label="Transaction Updates"
          note="Workflow progress on your deals"
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
              count={stats[cat.key]}
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
          <option>Inquiry Status</option>
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
            <p>Latest updates related to your inquiries and purchases.</p>
          </div>

          <button className="mark-all-btn" type="button" onClick={handleMarkAllRead}>
            <CheckCircle size={16} />
            Mark all as read
          </button>
        </div>

        <div className="notification-list">
          {filteredNotifications.length === 0 ? (
            <div className="notification-empty-state">
              <BellRing size={36} />
              <h4>No notifications found</h4>
              <p>
                {notifications.length === 0
                  ? "You're all caught up. Updates on your inquiries and transactions will appear here."
                  : "Try adjusting your search or filters."}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif, index) => {
              const isClickable = Boolean(getNotificationLink(notif));
              const unread = isUnread(notif);
              const accent = getTypeAccent(notif.type);

              return (
                <div
                  className={`notification-row accent-${accent} ${
                    unread ? "unread" : ""
                  } ${isClickable ? "clickable" : ""}`}
                  key={notif.id}
                  style={{ animationDelay: `${Math.min(index, 10) * 50}ms` }}
                  onClick={isClickable ? () => handleNotificationClick(notif) : undefined}
                  role={isClickable ? "button" : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  onKeyDown={
                    isClickable
                      ? (e) => {
                          if (e.key === "Enter") handleNotificationClick(notif);
                        }
                      : undefined
                  }
                >
                  <div className="notification-icon">
                    {getIcon(notif.type)}
                    {unread && <span className="notif-pulse-dot"></span>}
                  </div>

                  <div className="notification-content">
                    <div className="notification-meta">
                      <span className="notification-type-chip">{notif.type}</span>
                      <small>{formatTime(notif.time)}</small>
                    </div>

                    <h4>{notif.title}</h4>
                    <p>{notif.message}</p>

                    <div className="notification-tags">
                      <span className={unread ? "tag-unread" : "tag-read"}>
                        <span className="tag-dot"></span>
                        {unread ? "Unread" : "Read"}
                      </span>
                    </div>
                  </div>

                  <div className="notification-side">
                    {unread && (
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

                    {isClickable && (
                      <ChevronRight size={20} className="notification-chevron" />
                    )}
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

export default BuyerNotifications;
