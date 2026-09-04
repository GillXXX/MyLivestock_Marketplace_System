import { useEffect, useState } from "react";

import {
  ArrowLeft,
  BellRing,
  ShoppingBag,
  FileCheck2,
  AlertTriangle,
  Search,
  ChevronRight,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import "./BuyerNotifications.css";

const getReadStorageKey = () => {
  try {
    const userRaw = localStorage.getItem("user");
    const userId = userRaw ? JSON.parse(userRaw).id : "anon";
    return `readNotifications_${userId}`;
  } catch (error) {
    return "readNotifications_anon";
  }
};

const loadReadIds = () => {
  try {
    const stored = localStorage.getItem(getReadStorageKey());
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch (error) {
    return new Set();
  }
};

function BuyerNotifications() {
  const navigate = useNavigate();

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
  const [readIds, setReadIds] = useState(loadReadIds);

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

  const isUnread = (notif) => notif.status === "Unread" && !readIds.has(notif.id);

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

  const liveUnreadCount = notifications.filter((notif) => isUnread(notif)).length;

  const getIcon = (type) => {
    if (type === "Inquiry Status") return <ShoppingBag size={22} />;
    if (type === "Transaction Update") return <FileCheck2 size={22} />;
    return <BellRing size={22} />;
  };

  const getTypeClass = (type) => {
    if (type === "Inquiry Status") return "type-inquiry";
    if (type === "Transaction Update") return "type-transaction";
    return "type-general";
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

  const markAsRead = (id) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;

      const next = new Set(prev);
      next.add(id);

      try {
        localStorage.setItem(getReadStorageKey(), JSON.stringify([...next]));
      } catch (error) {
        // localStorage may be unavailable; read state just won't persist across reloads
      }

      return next;
    });
  };

  const handleNotificationClick = (notif) => {
    markAsRead(notif.id);

    const link = getNotificationLink(notif);
    if (!link) return;
    navigate(link.path, { state: link.state });
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
        <Link to="/buyer-dashboard" className="back-btn">
          <ArrowLeft size={20} />
        </Link>

        <div>
          <span className="notif-eyebrow">BUYER PORTAL</span>
          <h1>Notifications</h1>
          <p>
            Stay updated on your livestock inquiries and transaction progress.
          </p>
        </div>
      </div>

      <section className="notification-stats">
        <NotifStat
          icon={<BellRing />}
          value={stats.totalAlerts}
          label="Total Alerts"
          accent="green"
        />
        <NotifStat
          icon={<AlertTriangle />}
          value={liveUnreadCount}
          label="Unread Alerts"
          accent="amber"
          pulse={liveUnreadCount > 0}
        />
        <NotifStat
          icon={<ShoppingBag />}
          value={stats.inquiryUpdates}
          label="Inquiry Updates"
          accent="soft-green"
        />
        <NotifStat
          icon={<FileCheck2 />}
          value={stats.transactionUpdates}
          label="Transaction Updates"
          accent="gold"
        />
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

      <section className="notifications-layout">
        <div className="notifications-list-card">
          <div className="notifications-card-header">
            <div>
              <h3>Notification Inbox</h3>
              <p>Latest updates related to your inquiries and purchases.</p>
            </div>
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

                return (
                  <div
                    className={`notification-row ${getTypeClass(notif.type)} ${
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
                        <span>{notif.type}</span>
                        <small>{formatTime(notif.time)}</small>
                      </div>

                      <h4>{notif.title}</h4>
                      <p>{notif.message}</p>

                      <div className="notification-tags">
                        <span className={unread ? "tag-unread" : "tag-read"}>
                          {unread ? "Unread" : "Read"}
                        </span>
                      </div>
                    </div>

                    {isClickable && (
                      <ChevronRight size={20} className="notification-chevron" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function NotifStat({ icon, value, label, accent = "green", pulse }) {
  return (
    <div className={`notif-stat-card accent-${accent}`}>
      <div className="notif-stat-icon">
        {icon}
        {pulse && <span className="notif-pulse-dot"></span>}
      </div>
      <h2>{value}</h2>
      <p>{label}</p>
    </div>
  );
}

export default BuyerNotifications;
