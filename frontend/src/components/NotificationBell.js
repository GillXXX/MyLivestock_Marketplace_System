import { useCallback, useEffect, useRef, useState } from "react";

import {
  Bell,
  BellRing,
  ClipboardCheck,
  ShieldCheck,
  FileCheck2,
  Users,
  ShoppingBag,
  MessageCircle,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import "./NotificationBell.css";

const ROLE_CONFIG = {
  admin: { endpoint: "/api/admin/notifications", pagePath: "/admin-notifications" },
  buyer: { endpoint: "/api/buyer/notifications", pagePath: "/buyer-notifications" },
  farmer: { endpoint: "/api/farmer/notifications", pagePath: "/farmer-notifications" },
};

function getIcon(type) {
  if (!type) return <BellRing size={18} />;
  if (type.includes("Approval") || type.includes("Listing")) return <ClipboardCheck size={18} />;
  if (type.includes("Verification") || type.includes("Document")) return <ShieldCheck size={18} />;
  if (type.includes("Transaction")) return <FileCheck2 size={18} />;
  if (type === "Buyer Inquiry") return <MessageCircle size={18} />;
  if (type.includes("Inquiry")) return <ShoppingBag size={18} />;
  if (type.includes("User") || type.includes("Report")) return <Users size={18} />;
  return <BellRing size={18} />;
}

function formatRelativeTime(time) {
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
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function NotificationBell({ role }) {
  const navigate = useNavigate();
  const config = ROLE_CONFIG[role];
  const wrapperRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}${config.endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok) {
        setNotifications(data.notifications || []);
        setUnreadCount((data.stats && data.stats.unreadAlerts) || 0);
      }
    } catch (error) {
      // The bell is a convenience widget — the full notifications page
      // already surfaces connection errors, so fail quietly here.
    }
    setLoading(false);
  }, [config.endpoint]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) fetchNotifications();
  };

  const handleSeeAll = () => {
    setOpen(false);
    navigate(config.pagePath);
  };

  const visible =
    tab === "unread" ? notifications.filter((n) => n.status === "Unread") : notifications;

  const now = new Date();
  const groups = { New: [], Today: [], Earlier: [] };

  visible.forEach((notif) => {
    if (notif.status === "Unread") {
      groups.New.push(notif);
    } else if (isSameDay(new Date(notif.time), now)) {
      groups.Today.push(notif);
    } else {
      groups.Earlier.push(notif);
    }
  });

  const renderGroup = (label, items) => {
    if (items.length === 0) return null;

    return (
      <div className="bell-group" key={label}>
        <span className="bell-group-label">{label}</span>

        {items.map((notif) => (
          <div className={`bell-row ${notif.status === "Unread" ? "unread" : ""}`} key={notif.id}>
            <div className="bell-row-icon">{getIcon(notif.type)}</div>

            <div className="bell-row-content">
              <strong>{notif.title}</strong>
              <p>{notif.message}</p>
              <small>{formatRelativeTime(notif.time)}</small>
            </div>

            {notif.status === "Unread" && <span className="bell-dot"></span>}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="notification-bell" ref={wrapperRef}>
      <button
        className="bell-trigger"
        type="button"
        onClick={handleToggle}
        aria-label="Notifications"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="bell-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="bell-panel">
          <div className="bell-panel-header">
            <h4>Notifications</h4>

            <div className="bell-tabs">
              <button
                type="button"
                className={tab === "all" ? "active" : ""}
                onClick={() => setTab("all")}
              >
                All
              </button>
              <button
                type="button"
                className={tab === "unread" ? "active" : ""}
                onClick={() => setTab("unread")}
              >
                Unread
              </button>
            </div>
          </div>

          <div className="bell-list">
            {loading ? (
              <div className="bell-empty">Loading...</div>
            ) : visible.length === 0 ? (
              <div className="bell-empty">
                {tab === "unread" ? "You're all caught up." : "No notifications yet."}
              </div>
            ) : (
              <>
                {renderGroup("New", groups.New)}
                {renderGroup("Today", groups.Today)}
                {renderGroup("Earlier", groups.Earlier)}
              </>
            )}
          </div>

          <button className="bell-see-all" type="button" onClick={handleSeeAll}>
            See all notifications
          </button>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
