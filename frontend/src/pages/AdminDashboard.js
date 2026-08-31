import { useEffect, useMemo, useState, useCallback } from "react";

import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  ShieldCheck,
  FileCheck2,
  BarChart3,
  Bell,
  BellRing,
  Search,
  Settings,
  LogOut,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Clock,
  UserCircle,
  RefreshCw,
  PieChart,
  Layers,
  Radio,
  ChevronDown,
  FileText,
  FileSpreadsheet,
  FileClock,
  ArrowUpRight,
  X,
  Mail,
  Phone,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import LeafletMap from "../utils/LeafletMap";
import escapeHtml from "../utils/escapeHtml";
import { VERUELA_CENTER, VERUELA_BOUNDARY_GEOJSON } from "../utils/veruelaGeo";
import { API_URL } from "../config";
import "./AdminDashboard.css";

const MAP_POLL_INTERVAL_MS = 20000;

const CATEGORY_COLORS = ["#0f3d2e", "#d7a24d", "#3b82f6", "#8b5cf6", "#14b8a6", "#ef4444"];
const STATUS_COLORS = {
  Available: "#0f3d2e",
  Pending: "#d7a24d",
  Flagged: "#ef4444",
};

function AdminDashboard() {
  const navigate = useNavigate();

  const [showNotif, setShowNotif] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [queueFilter, setQueueFilter] = useState("All");
  const [mapPreview, setMapPreview] = useState({ locations: [], stats: null });
  const [selectedFarmer, setSelectedFarmer] = useState(null);

  const fetchAdminDashboard = useCallback(
    async (isRefresh = false) => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        if (isRefresh) setRefreshing(true);

        const res = await fetch(`${API_URL}/api/admin/dashboard`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          setMessage(data.message || "Failed to load admin dashboard");
          setLoading(false);
          setRefreshing(false);
          return;
        }

        setDashboardData(data);
        setLastUpdated(new Date());
        setLoading(false);
        setRefreshing(false);
      } catch (error) {
        setMessage("Cannot connect to backend server");
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    fetchAdminDashboard();
  }, [fetchAdminDashboard]);

  useEffect(() => {
    const fetchMapPreview = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch(`${API_URL}/api/admin/map`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (res.ok) {
          setMapPreview({ locations: data.locations || [], stats: data.stats || null });
        }
      } catch (error) {
        // Silent: the map preview is a secondary widget, main dashboard fetch already surfaces errors.
      }
    };

    fetchMapPreview();
    const interval = setInterval(fetchMapPreview, MAP_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const categoryBreakdown = useMemo(() => {
    if (!dashboardData) return [];
    const counts = {};
    dashboardData.activity.forEach((item) => {
      counts[item.livestock_type] = (counts[item.livestock_type] || 0) + 1;
    });
    return Object.entries(counts).map(([label, value], index) => ({
      label,
      value,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }));
  }, [dashboardData]);

  const statusBreakdown = useMemo(() => {
    if (!dashboardData) return [];
    const counts = {};
    dashboardData.activity.forEach((item) => {
      counts[item.status] = (counts[item.status] || 0) + 1;
    });
    return Object.entries(counts).map(([label, value]) => ({
      label,
      value,
      color: STATUS_COLORS[label] || "#94a3b8",
    }));
  }, [dashboardData]);

  const ratios = useMemo(() => {
    if (!dashboardData) return {};
    const { registeredUsers, activeListings, pendingVerification, completedTrades } =
      dashboardData.stats;

    return {
      listingsPerUser: registeredUsers
        ? Math.min(100, (activeListings / registeredUsers) * 100)
        : 0,
      pendingShare: activeListings
        ? Math.min(100, (pendingVerification / activeListings) * 100)
        : 0,
      completionRate: activeListings
        ? Math.min(100, (completedTrades / activeListings) * 100)
        : 0,
    };
  }, [dashboardData]);

  const queueCounts = useMemo(() => {
    if (!dashboardData) return { All: 0, Available: 0, Pending: 0, Flagged: 0 };
    const counts = { All: dashboardData.verificationQueue.length, Available: 0, Pending: 0, Flagged: 0 };
    dashboardData.verificationQueue.forEach((item) => {
      if (item.status === "Available") counts.Available += 1;
      else if (item.status === "Pending") counts.Pending += 1;
      else counts.Flagged += 1;
    });
    return counts;
  }, [dashboardData]);

  const filteredQueue = useMemo(() => {
    if (!dashboardData) return [];
    if (queueFilter === "All") return dashboardData.verificationQueue;
    return dashboardData.verificationQueue.filter((item) =>
      queueFilter === "Flagged"
        ? item.status !== "Available" && item.status !== "Pending"
        : item.status === queueFilter
    );
  }, [dashboardData, queueFilter]);

  const mapMarkers = useMemo(
    () =>
      mapPreview.locations
        .filter((item) => item.farm_lat != null && item.farm_lng != null)
        .map((item) => ({
          id: item.id,
          lat: Number(item.farm_lat),
          lng: Number(item.farm_lng),
          color: item.status === "Pending" ? "#e3b463" : "#b8842c",
          shape: "pin",
          popupHtml: `<div class="map-popup"><strong>${escapeHtml(
            item.farmer || "Unknown farmer"
          )}</strong><span>${escapeHtml(
            item.livestock_types || "No livestock yet"
          )}</span></div>`,
        })),
    [mapPreview.locations]
  );

  const reports = useMemo(
    () => [
      {
        title: "Monthly Sales Report",
        description: "Summary of completed livestock trades and revenue this month.",
        icon: <FileSpreadsheet />,
        format: "XLSX",
        status: "Ready",
      },
      {
        title: "Livestock Category Summary",
        description: "Breakdown of active listings across cattle, swine, goat and more.",
        icon: <FileText />,
        format: "PDF",
        status: "Ready",
      },
      {
        title: "Pending Verification Report",
        description: "Farmers and listings still awaiting document verification.",
        icon: <FileClock />,
        format: "PDF",
        status: "Draft",
      },
    ],
    []
  );

  if (loading) return <h2 style={{ padding: "30px" }}>Loading admin dashboard...</h2>;

  if (message) {
    return <h2 style={{ padding: "30px", color: "red" }}>{message}</h2>;
  }

  return (
    <div className="pro-admin">
      <aside className="pro-sidebar">
        <div className="pro-brand">
          <div className="pro-logo">MAO</div>

          <div>
            <h3>Livestock Admin</h3>
            <p>Veruela MAO</p>
          </div>
        </div>

        <nav>
          <p className="nav-group-label">Overview</p>
          <Link className="active" to="/admin-dashboard">
            <LayoutDashboard size={20} /> Dashboard
          </Link>

          <p className="nav-group-label">Management</p>
          <Link to="/admin-users">
            <Users size={20} /> Users
          </Link>

          <Link to="/admin-listings">
            <ClipboardCheck size={20} /> Listings
          </Link>

          <Link to="/admin-verification">
            <ShieldCheck size={20} /> Verification
          </Link>

          <Link to="/admin-transactions">
            <FileCheck2 size={20} /> Transactions
          </Link>

          <p className="nav-group-label">Insights</p>
          <Link to="/admin-map">
            <MapPin size={20} /> Map Monitoring
          </Link>

          <Link to="/admin-reports">
            <BarChart3 size={20} /> Reports
          </Link>

          <p className="nav-group-label">System</p>
          <Link to="/admin-notifications">
            <BellRing size={20} /> Notifications
          </Link>

          <Link to="/admin-settings">
            <Settings size={20} /> Settings
          </Link>
        </nav>

        <button className="pro-logout" onClick={handleLogout}>
          <LogOut size={20} /> Logout
        </button>

        <div className="sidebar-status">
          <span className="pulse-dot-sm"></span> System Online
        </div>
      </aside>

      <main className="pro-main">
        <header className="pro-topbar">
          <div>
            <span className="eyebrow">
              <Radio size={13} className="pulse-dot" /> Municipal Agriculture Office
            </span>
            <h1>Admin Command Center</h1>
            <p>
              Monitor users, listings, verification, transactions, reports, and
              seller locations.
            </p>
          </div>

          <div className="pro-actions">
            <div className="pro-search">
              <Search size={18} />
              <input placeholder="Search records..." />
            </div>

            <button
              className={`pro-icon-btn refresh-btn ${refreshing ? "spinning" : ""}`}
              onClick={() => fetchAdminDashboard(true)}
              title="Refresh dashboard data"
            >
              <RefreshCw size={19} />
            </button>

            <div className="notif-wrap">
              <button
                onClick={() => setShowNotif(!showNotif)}
                className="pro-icon-btn"
              >
                <Bell size={21} />
                <i></i>
              </button>

              {showNotif && (
                <div className="notif-panel">
                  <h4>Notifications</h4>

                  {dashboardData.activity.length === 0 ? (
                    <div className="notif-item">
                      <strong>No notifications</strong>
                      <p>No recent system activity.</p>
                    </div>
                  ) : (
                    dashboardData.activity.slice(0, 3).map((item, index) => (
                      <div
                        className={index === 0 ? "notif-item unread" : "notif-item"}
                        key={index}
                      >
                        <strong>Listing update</strong>
                        <p>
                          {item.farmer_name} submitted {item.livestock_type}.
                        </p>
                        <small>Recently</small>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="admin-profile">
              <UserCircle size={34} />

              <div>
                <strong>MAO Admin</strong>
                <p>Administrator</p>
              </div>

              <ChevronDown size={16} className="profile-chevron" />
            </div>
          </div>
        </header>

        {lastUpdated && (
          <div className="last-updated">
            Last synced {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}

        <section className="kpi-grid">
          <Kpi
            accent="green"
            title="Registered Users"
            value={dashboardData.stats.registeredUsers}
            trend="Farmers and buyers"
            icon={<Users />}
          />

          <Kpi
            accent="blue"
            title="Active Listings"
            value={dashboardData.stats.activeListings}
            trend="Available livestock"
            icon={<ClipboardCheck />}
            ringPercent={ratios.listingsPerUser}
            ringLabel="of users listing"
          />

          <Kpi
            accent="amber"
            title="Pending Verification"
            value={dashboardData.stats.pendingVerification}
            trend="Needs action"
            icon={<Clock />}
            ringPercent={ratios.pendingShare}
            ringLabel="of listings"
          />

          <Kpi
            accent="purple"
            title="Completed Trades"
            value={dashboardData.stats.completedTrades}
            trend="Recorded transactions"
            icon={<CheckCircle />}
            ringPercent={ratios.completionRate}
            ringLabel="close rate"
          />
        </section>

        <section className="pro-grid insights">
          <div className="pro-card">
            <div className="card-head">
              <div>
                <h3>
                  <PieChart size={18} /> Status Breakdown
                </h3>
                <p>Live listings grouped by current status.</p>
              </div>
            </div>

            {statusBreakdown.length === 0 ? (
              <p className="empty-hint">No listing activity yet.</p>
            ) : (
              <div className="donut-wrap">
                <Donut segments={statusBreakdown} />
                <ul className="legend">
                  {statusBreakdown.map((item) => (
                    <li key={item.label}>
                      <span className="dot" style={{ background: item.color }}></span>
                      {item.label}
                      <strong>{item.value}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="pro-card wide">
            <div className="card-head">
              <div>
                <h3>
                  <Layers size={18} /> Listings by Category
                </h3>
                <p>Distribution of active livestock across categories.</p>
              </div>
            </div>

            {categoryBreakdown.length === 0 ? (
              <p className="empty-hint">No category data yet.</p>
            ) : (
              <BarList items={categoryBreakdown} />
            )}
          </div>
        </section>

        <section className="pro-grid">
          <div className="pro-card wide">
            <div className="card-head">
              <div>
                <h3>Verification Queue</h3>
                <p>
                  Review submitted documents and approve or flag transactions.
                </p>
              </div>

              <button onClick={() => navigate("/admin-listings")}>
                View All <ArrowUpRight size={15} />
              </button>
            </div>

            <div className="queue-toolbar">
              <div className="queue-filters">
                {["All", "Available", "Pending", "Flagged"].map((filterKey) => (
                  <button
                    key={filterKey}
                    className={`filter-chip ${queueFilter === filterKey ? "active" : ""}`}
                    onClick={() => setQueueFilter(filterKey)}
                  >
                    {filterKey}
                    <span>{queueCounts[filterKey] ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>

            <table className="pro-table">
              <thead>
                <tr>
                  <th>Farmer</th>
                  <th>Livestock</th>
                  <th>Document</th>
                  <th>Workflow</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredQueue.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-row">
                      No {queueFilter !== "All" ? queueFilter.toLowerCase() : ""} verification
                      records.
                    </td>
                  </tr>
                ) : (
                  filteredQueue.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <button
                          type="button"
                          className="farmer-cell farmer-cell-link"
                          onClick={() => setSelectedFarmer(item)}
                        >
                          <span className={`avatar status-${statusSlug(item.status)}`}>
                            {initials(item.farmer_name)}
                          </span>
                          {item.farmer_name}
                        </button>
                      </td>
                      <td>
                        <span className="livestock-tag">{item.livestock_type}</span>
                      </td>
                      <td>{item.health_status || "Health Document"}</td>
                      <td>
                        <Workflow step="Verification" />
                      </td>
                      <td>
                        <span
                          className={
                            item.status === "Available"
                              ? "badge approved"
                              : item.status === "Pending"
                              ? "badge pending"
                              : "badge flagged"
                          }
                        >
                          <span className="badge-dot"></span>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="pro-card activity-card">
            <div className="card-head">
              <div>
                <h3>System Activity</h3>
                <p>Latest listing events across the marketplace.</p>
              </div>

              {dashboardData.activity.length > 0 && (
                <span className="live-badge">
                  <span className="pulse-dot-sm"></span>
                  {dashboardData.activity.length} live
                </span>
              )}
            </div>

            {dashboardData.activity.length === 0 ? (
              <div className="empty-state">
                <Radio size={26} />
                <p>No system activity yet.</p>
              </div>
            ) : (
              <div className="timeline">
                {dashboardData.activity.map((item, index) => (
                  <Activity
                    key={index}
                    last={index === dashboardData.activity.length - 1}
                    status={item.status}
                    icon={
                      item.status === "Available" ? (
                        <CheckCircle />
                      ) : item.status === "Pending" ? (
                        <AlertTriangle />
                      ) : (
                        <Users />
                      )
                    }
                    tag={item.status === "Available" ? "New Listing" : item.status}
                    title={`${item.livestock_type} listing`}
                    text={`${item.farmer_name} posted ${item.breed}.`}
                    time={index === 0 ? "Just now" : "Earlier"}
                  />
                ))}
              </div>
            )}

            <button
              className="report-view-all"
              onClick={() => navigate("/admin-notifications")}
            >
              <BellRing size={16} /> View All Activity
            </button>
          </div>
        </section>

        <section className="pro-grid bottom">
          <div className="pro-card">
            <div className="card-head">
              <div>
                <h3>Map Monitoring</h3>
                <p>Live seller and farm location overview.</p>
              </div>

              {mapPreview.stats && (
                <span className="live-badge">
                  <span className="pulse-dot-sm"></span>
                  {mapPreview.stats.pinnedLocations}/{mapPreview.stats.sellerLocations} pinned
                </span>
              )}
            </div>

            <LeafletMap
              center={VERUELA_CENTER}
              zoom={11}
              height="240px"
              markers={mapMarkers}
              boundary={VERUELA_BOUNDARY_GEOJSON}
            />

            <button className="report-view-all" onClick={() => navigate("/admin-map")}>
              <MapPin size={16} /> Open Full Map
            </button>
          </div>

          <div className="pro-card">
            <div className="card-head">
              <div>
                <h3>Reports Overview</h3>
                <p>Quick access to printable monitoring reports.</p>
              </div>
            </div>

            <div className="report-list">
              {reports.map((report) => (
                <div className="report-card" key={report.title}>
                  <div className={`report-icon status-${report.status.toLowerCase()}`}>
                    {report.icon}
                  </div>

                  <div className="report-body">
                    <div className="report-top">
                      <strong>{report.title}</strong>
                      <span className={`status-${report.status.toLowerCase()}`}>
                        {report.status}
                      </span>
                    </div>
                    <p>{report.description}</p>
                    <span className="report-format">{report.format}</span>
                  </div>
                </div>
              ))}
            </div>

            <button className="report-view-all" onClick={() => navigate("/admin-reports")}>
              <BarChart3 size={16} /> View All Reports
            </button>
          </div>
        </section>
      </main>

      {selectedFarmer && (
        <div className="farmer-modal-overlay" onClick={() => setSelectedFarmer(null)}>
          <div className="farmer-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="farmer-modal-close"
              type="button"
              onClick={() => setSelectedFarmer(null)}
            >
              <X size={20} />
            </button>

            <div className="farmer-modal-head">
              <span className={`avatar large status-${statusSlug(selectedFarmer.status)}`}>
                {initials(selectedFarmer.farmer_name)}
              </span>
              <div>
                <h3>{selectedFarmer.farmer_name}</h3>
                <span className={`verification-pill ${selectedFarmer.farmer_is_verified ? "verified" : "pending"}`}>
                  {selectedFarmer.farmer_is_verified ? "Verified Farmer" : "Unverified Farmer"}
                </span>
              </div>
            </div>

            <div className="farmer-modal-info">
              <div>
                <Mail size={16} />
                <span>{selectedFarmer.farmer_email || "No email on file"}</span>
              </div>
              <div>
                <Phone size={16} />
                <span>{selectedFarmer.farmer_phone || "No phone on file"}</span>
              </div>
              <div>
                <MapPin size={16} />
                <span>{selectedFarmer.farmer_farm_location || selectedFarmer.farmer_location || "No location on file"}</span>
              </div>
              <div>
                <Clock size={16} />
                <span>
                  Member since{" "}
                  {selectedFarmer.farmer_joined_at
                    ? new Date(selectedFarmer.farmer_joined_at).toLocaleDateString()
                    : "Unknown"}
                </span>
              </div>
            </div>

            <div className="farmer-modal-listing">
              <h4>Listing under review</h4>
              <div className="farmer-modal-listing-row">
                <span className="livestock-tag">{selectedFarmer.livestock_type}</span>
                <span
                  className={
                    selectedFarmer.status === "Available"
                      ? "badge approved"
                      : selectedFarmer.status === "Pending"
                      ? "badge pending"
                      : "badge flagged"
                  }
                >
                  <span className="badge-dot"></span>
                  {selectedFarmer.status}
                </span>
              </div>
              <p>{selectedFarmer.health_status || "Health Document"}</p>
            </div>

            <button
              className="farmer-modal-view-all"
              type="button"
              onClick={() => navigate("/admin-users")}
            >
              <UserCircle size={16} /> View Full Profile in User Management
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function statusSlug(status) {
  if (status === "Available") return "available";
  if (status === "Pending") return "pending";
  return "flagged";
}

function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function Kpi({ title, value, trend, icon, accent, ringPercent, ringLabel }) {
  return (
    <div className={`kpi-card accent-${accent}`}>
      <div className="kpi-top">
        <div className="kpi-icon">{icon}</div>
        {typeof ringPercent === "number" && (
          <MiniRing percent={ringPercent} label={ringLabel} />
        )}
      </div>
      <h2>{value}</h2>
      <p>{title}</p>
      <small>{trend}</small>
    </div>
  );
}

function MiniRing({ percent, label }) {
  const size = 56;
  const thickness = 6;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.max(0, Math.min(100, percent)) / 100) * circumference;

  return (
    <div className="mini-ring" title={`${Math.round(percent)}% ${label || ""}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--ring-track)"
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--ring-color)"
          strokeWidth={thickness}
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span>{Math.round(percent)}%</span>
    </div>
  );
}

function Donut({ segments, size = 168, thickness = 24 }) {
  const total = segments.reduce((sum, item) => sum + item.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut">
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--ring-track)"
          strokeWidth={thickness}
        />
        {segments.map((seg, index) => {
          const fraction = seg.value / total;
          const dash = fraction * circumference;
          const circle = (
            <circle
              key={index}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap={segments.length > 1 ? "round" : "butt"}
            />
          );
          offset += dash;
          return circle;
        })}
      </g>
      <text x="50%" y="47%" textAnchor="middle" className="donut-total">
        {total}
      </text>
      <text x="50%" y="63%" textAnchor="middle" className="donut-label">
        listings
      </text>
    </svg>
  );
}

function BarList({ items }) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="bar-list">
      {items.map((item) => (
        <div className="bar-row" key={item.label}>
          <div className="bar-row-label">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${(item.value / max) * 100}%`, background: item.color }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Workflow({ step }) {
  return (
    <div className="workflow">
      <span className="done"></span>
      <span className="done"></span>
      <span className={step === "Negotiation" ? "active" : "done"}></span>
      <span className={step === "Verification" ? "active" : "done"}></span>
      <span className={step === "Confirmation" ? "active" : ""}></span>
    </div>
  );
}

function Activity({ icon, title, text, time, last, status, tag }) {
  return (
    <div className={`timeline-item ${last ? "last" : ""}`}>
      <div className={`timeline-icon status-${statusSlug(status)}`}>{icon}</div>

      <section>
        <div className="timeline-top">
          <div className="timeline-heading">
            <strong>{title}</strong>
            <span className={`tag-chip status-${statusSlug(status)}`}>{tag}</span>
          </div>
          <time>{time}</time>
        </div>
        <p>{text}</p>
      </section>
    </div>
  );
}

export default AdminDashboard;
