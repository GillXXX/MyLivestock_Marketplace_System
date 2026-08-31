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
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import "./FarmerNotifications.css";

function FarmerNotifications() {
  const navigate = useNavigate();

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
    <div className="farmer-notifications-page">
      <div className="notifications-header">
        <Link to="/farmer-dashboard" className="back-btn">
          <ArrowLeft size={20} />
        </Link>

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
        <NotifStat icon={<BellRing />} value={stats.totalAlerts} label="Total Alerts" />
        <NotifStat icon={<AlertTriangle />} value={stats.unreadAlerts} label="Unread Alerts" />
        <NotifStat icon={<ClipboardCheck />} value={stats.listingUpdates} label="Listing Updates" />
        <NotifStat icon={<CheckCircle />} value={stats.buyerInquiries} label="Buyer Inquiries" />
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

      <section className="notifications-layout">
        <div className="notifications-list-card">
          <div className="notifications-card-header">
            <div>
              <h3>Notification Inbox</h3>
              <p>Latest updates related to your listings and sales.</p>
            </div>
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
                </div>
              ))
            )}
          </div>
        </div>

        <aside className="notification-side-panel">
          <h3>Notification Types</h3>

          <CategoryItem
            icon={<ClipboardCheck size={20} />}
            title="Listing Status"
            count={stats.listingUpdates}
            text="Approvals, rejections, and listing changes"
          />

          <CategoryItem
            icon={<MessageCircle size={20} />}
            title="Buyer Inquiries"
            count={stats.buyerInquiries}
            text="New buyers interested in your listings"
          />

          <CategoryItem
            icon={<FileCheck2 size={20} />}
            title="Transaction Updates"
            count={notifications.filter((n) => n.type === "Transaction Update").length}
            text="Workflow progress on active sales"
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

export default FarmerNotifications;
