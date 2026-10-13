import { useEffect, useMemo, useRef, useState, useCallback } from "react";

import {
  Users,
  ClipboardCheck,
  BarChart3,
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
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  X,
  Mail,
  Phone,
  Sparkles,
  Wallet,
} from "lucide-react";

import { useNavigate, Link } from "react-router-dom";
import LeafletMap from "../utils/LeafletMap";
import escapeHtml from "../utils/escapeHtml";
import NotificationBell from "../components/NotificationBell";
import { VERUELA_CENTER, VERUELA_BOUNDARY_GEOJSON, VERUELA_BARANGAYS } from "../utils/veruelaGeo";
import { API_URL } from "../config";
import { getProductIcon } from "../utils/productCatalog";
import "./AdminDashboard.css";

const MAP_POLL_INTERVAL_MS = 20000;

const CATEGORY_COLORS = ["#0f3d2e", "#d7a24d", "#3b82f6", "#8b5cf6", "#14b8a6", "#ef4444"];

function getAvatarUrl(image) {
  if (!image) return null;
  return image.startsWith("http") ? image : `${API_URL}${image}`;
}

function getAdminHeroMessage(stats) {
  if (stats.pendingVerification > 0) {
    return {
      headline: "Listings are waiting for your review.",
      body: `${stats.pendingVerification} listing${
        stats.pendingVerification === 1 ? " is" : "s are"
      } waiting for review, out of ${stats.activeListings} active listings on the marketplace.`,
    };
  }

  return {
    headline: "The marketplace is running smoothly.",
    body: `${stats.registeredUsers} registered users are trading across ${stats.activeListings} active listings, with ${stats.completedTrades} completed transactions so far.`,
  };
}

// Raw DB status -> display label used on the Admin Listings filter dropdown
// (that page renders "Available" as "Approved").
const STATUS_DISPLAY_LABEL = {
  Available: "Approved",
};

const STATUS_COLORS = {
  Available: "#16a34a",
  Pending: "#d7a24d",
  Flagged: "#ef4444",
  Sold: "#3b82f6",
  Rejected: "#b42318",
  Removed: "#94a3b8",
};

function AdminDashboard() {
  const navigate = useNavigate();

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isStaff = currentUser.role === "mao_staff";

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
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

  const categoryBreakdown = useMemo(() => {
    if (!dashboardData) return [];
    return dashboardData.listingsByCategory.map((item, index) => ({
      label: item.livestock_type,
      category: item.category,
      value: item.total,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }));
  }, [dashboardData]);

  const statusBreakdown = useMemo(() => {
    if (!dashboardData) return [];
    return dashboardData.listingsByStatus.map((item) => ({
      label: item.status,
      value: item.total,
      color: STATUS_COLORS[item.status] || "#94a3b8",
    }));
  }, [dashboardData]);

  const mapMarkers = useMemo(
    () =>
      mapPreview.locations
        .filter((item) => item.farm_lat != null && item.farm_lng != null)
        .map((item) => ({
          id: item.id,
          lat: Number(item.farm_lat),
          lng: Number(item.farm_lng),
          // Matches the legend dots exactly — neon teal for active, neon
          // gold for pending so it visually demands review.
          color: item.status === "Pending" ? "#FFD60A" : "#00F5D4",
          shape: "pin",
          pulse: item.status === "Pending",
          popupHtml: `<div class="map-popup"><strong>${escapeHtml(
            item.farmer || "Unknown farmer"
          )}</strong><span>${escapeHtml(
            item.livestock_types || "No listings yet"
          )}</span></div>`,
        })),
    [mapPreview.locations]
  );

  const revenueTotal30d = useMemo(() => {
    if (!dashboardData?.trends?.revenue) return 0;
    return dashboardData.trends.revenue
      .slice(-4)
      .reduce((sum, week) => sum + week.value, 0);
  }, [dashboardData]);

  const goToListingsByStatus = (status) => {
    navigate("/admin-listings", {
      state: { statusFilter: STATUS_DISPLAY_LABEL[status] || status },
    });
  };

  const goToListingsByType = (type) => {
    navigate("/admin-listings", { state: { typeFilter: type } });
  };

  if (loading) return <h2 style={{ padding: "30px" }}>Loading admin dashboard...</h2>;

  if (message) {
    return <h2 style={{ padding: "30px", color: "red" }}>{message}</h2>;
  }

  const hero = getAdminHeroMessage(dashboardData.stats);

  return (
    <>
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
            <button
              className={`pro-icon-btn refresh-btn ${refreshing ? "spinning" : ""}`}
              onClick={() => fetchAdminDashboard(true)}
              title="Refresh dashboard data"
            >
              <RefreshCw size={19} />
            </button>

            <NotificationBell role="admin" />

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

        {(dashboardData.stats.overdueVerification > 0 || dashboardData.stats.flaggedTotal > 0) && (
          <div className="admin-alert-banner">
            <AlertTriangle size={20} />

            <div className="admin-alert-text">
              <strong>Needs attention</strong>
              <p>
                {dashboardData.stats.overdueVerification > 0 && (
                  <span>
                    {dashboardData.stats.overdueVerification} verification
                    {dashboardData.stats.overdueVerification === 1 ? "" : "s"} overdue (7+ days)
                  </span>
                )}
                {dashboardData.stats.overdueVerification > 0 && dashboardData.stats.flaggedTotal > 0 && (
                  <span className="admin-alert-sep"> · </span>
                )}
                {dashboardData.stats.flaggedTotal > 0 && (
                  <span>
                    {dashboardData.stats.flaggedTotal} listing
                    {dashboardData.stats.flaggedTotal === 1 ? "" : "s"} flagged
                  </span>
                )}
              </p>
            </div>

            <button type="button" onClick={() => navigate("/admin-verification")}>
              Review now <ArrowUpRight size={15} />
            </button>
          </div>
        )}

        <section className="admin-hero-card">
          <TrendingUp className="hero-watermark" />

          <div className="hero-main">
            <span className="hero-tag">
              <Sparkles size={13} /> Marketplace Performance
            </span>
            <h2>{hero.headline}</h2>
            <p>{hero.body}</p>

            <div className="hero-actions">
              <Link to="/admin-verification">
                {dashboardData.stats.pendingVerification > 0 ? "Review Listings" : "View Listing Reviews"}
                <ArrowUpRight size={18} />
              </Link>

              <Link className="secondary" to="/admin-listings">
                Manage Listings
              </Link>

              <Link className="ghost" to="/admin-reports">
                View Reports
              </Link>
            </div>
          </div>

          <div className="hero-side">
            <div className="hero-metric">
              <strong>{dashboardData.stats.pendingVerification}</strong>
              <span>Listings to review</span>
            </div>

            <div className="hero-mini-stats">
              <div>
                <CheckCircle size={15} />
                <span>{dashboardData.stats.activeListings} active listings</span>
              </div>
              <div>
                <Wallet size={15} />
                <span>₱{revenueTotal30d.toLocaleString()} last 4 weeks</span>
              </div>
            </div>
          </div>
        </section>

        <section className="kpi-grid">
          <Kpi
            accent="green"
            title="Registered Users"
            value={dashboardData.stats.registeredUsers}
            trend="Farmers and buyers"
            icon={<Users />}
            delta={dashboardData.deltas.registeredUsers}
            sparkline={dashboardData.trends.growth.map((d) => d.users)}
          />

          <Kpi
            accent="blue"
            title="Active Listings"
            value={dashboardData.stats.activeListings}
            trend="Available listings"
            icon={<ClipboardCheck />}
            delta={dashboardData.deltas.activeListings}
            sparkline={dashboardData.trends.growth.map((d) => d.listings)}
          />

          <Kpi
            accent="amber"
            title="Listings to Review"
            value={dashboardData.stats.pendingVerification}
            trend="Needs action"
            icon={<Clock />}
            delta={dashboardData.deltas.pendingVerification}
          />

          <Kpi
            accent="purple"
            title="Completed Trades"
            value={dashboardData.stats.completedTrades}
            trend="Recorded transactions"
            icon={<CheckCircle />}
            delta={dashboardData.deltas.completedTrades}
            sparkline={dashboardData.trends.revenue.map((d) => d.count)}
          />
        </section>

        <section className="pro-grid">
          <div className="pro-card wide">
            <div className="card-head">
              <div>
                <h3>
                  <TrendingUp size={18} /> Growth Trend
                </h3>
                <p>New listings and user signups over the last 30 days.</p>
              </div>

              <div className="chart-legend-inline">
                <span>
                  <i style={{ background: "#0f3d2e" }}></i> Listings
                </span>
                <span>
                  <i style={{ background: "#d7a24d" }}></i> Users
                </span>
              </div>
            </div>

            <TrendChart
              data={dashboardData.trends.growth}
              series={[
                { key: "listings", color: "#0f3d2e", label: "Listings" },
                { key: "users", color: "#d7a24d", label: "Users" },
              ]}
            />
          </div>

          <div className="pro-card">
            <div className="card-head">
              <div>
                <h3>
                  <BarChart3 size={18} /> Revenue Trend
                </h3>
                <p>Completed trade value, last 12 weeks.</p>
              </div>
            </div>

            <TrendChart
              data={dashboardData.trends.revenue}
              series={[{ key: "value", color: "#2563eb", label: "Revenue" }]}
            />

            <div className="trend-total">
              <strong>₱{revenueTotal30d.toLocaleString()}</strong>
              <span>Last 4 weeks</span>
            </div>
          </div>
        </section>

        <section className="pro-grid">
          <div className="pro-card wide">
            <div className="card-head">
              <div>
                <h3>Listing Review Queue</h3>
                <p>Pending listings awaiting review, oldest first.</p>
              </div>

              <button onClick={() => navigate("/admin-verification")}>
                View All <ArrowUpRight size={15} />
              </button>
            </div>

            <table className="pro-table">
              <thead>
                <tr>
                  <th>Farmer</th>
                  <th>Product</th>
                  <th>Document</th>
                  <th>Waiting</th>
                </tr>
              </thead>

              <tbody>
                {dashboardData.verificationQueue.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="empty-row">
                      No listings waiting for review — all caught up.
                    </td>
                  </tr>
                ) : (
                  dashboardData.verificationQueue.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <button
                          type="button"
                          className="farmer-cell farmer-cell-link"
                          onClick={() => setSelectedFarmer(item)}
                        >
                          {item.farmer_profile_image ? (
                            <img
                              className={`avatar status-${statusSlug(item.status)}`}
                              src={getAvatarUrl(item.farmer_profile_image)}
                              alt={item.farmer_name}
                            />
                          ) : (
                            <span className={`avatar status-${statusSlug(item.status)}`}>
                              {initials(item.farmer_name)}
                            </span>
                          )}
                          {item.farmer_name}
                        </button>
                      </td>
                      <td>
                        <span className="livestock-tag">{item.livestock_type}</span>
                      </td>
                      <td>{item.health_status || "Health Document"}</td>
                      <td>
                        <span
                          className={`age-badge ${isOverdue(item.created_at) ? "overdue" : ""}`}
                        >
                          {formatRelativeTime(item.created_at)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="pro-card">
            <div className="card-head">
              <div>
                <h3>
                  <AlertTriangle size={18} /> Flagged Listings
                </h3>
                <p>Needs admin review.</p>
              </div>

              {dashboardData.stats.flaggedTotal > 0 && (
                <span className="live-badge alert">{dashboardData.stats.flaggedTotal} flagged</span>
              )}
            </div>

            {dashboardData.flaggedListings.length === 0 ? (
              <p className="empty-hint">No flagged listings right now.</p>
            ) : (
              <div className="flagged-list">
                {dashboardData.flaggedListings.map((item) => (
                  <div className="flagged-row" key={item.id}>
                    <div>
                      <strong>
                        {item.breed ? `${item.livestock_type} — ${item.breed}` : item.livestock_type}
                      </strong>
                      <p>
                        {item.farmer_name} · {formatRelativeTime(item.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button className="report-view-all" onClick={() => navigate("/admin-listings")}>
              <AlertTriangle size={16} /> Review Flagged Listings
            </button>
          </div>
        </section>

        <section className="pro-grid insights">
          <div className="pro-card">
            <div className="card-head">
              <div>
                <h3>
                  <PieChart size={18} /> Status Breakdown
                </h3>
                <p>Click a slice to view those listings.</p>
              </div>
            </div>

            {statusBreakdown.length === 0 ? (
              <p className="empty-hint">No listing data yet.</p>
            ) : (
              <Donut segments={statusBreakdown} onSegmentClick={goToListingsByStatus} />
            )}
          </div>

          <div className="pro-card wide">
            <div className="card-head">
              <div>
                <h3>
                  <Layers size={18} /> Listings by Category
                </h3>
                <p>Distribution of active listings across livestock and farm product types.</p>
              </div>
            </div>

            {categoryBreakdown.length === 0 ? (
              <p className="empty-hint">No category data yet.</p>
            ) : (
              <BarList items={categoryBreakdown} onItemClick={goToListingsByType} />
            )}
          </div>
        </section>

        <section className="pro-grid full">
          <div className="pro-card map-monitoring-card">
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
              zoom={11.5}
              height="380px"
              markers={mapMarkers}
              barangayLabels={VERUELA_BARANGAYS}
              boundary={VERUELA_BOUNDARY_GEOJSON}
              layerToggle
            />

            <div className="map-legend-bar">
              <span>
                <i className="active-dot"></i> Active
              </span>
              <span>
                <i className="pending-dot"></i> Pending Review
              </span>
              {mapPreview.stats &&
                mapPreview.stats.sellerLocations > mapPreview.stats.pinnedLocations && (
                  <span className="legend-hint">
                    {mapPreview.stats.sellerLocations - mapPreview.stats.pinnedLocations} farmer
                    {mapPreview.stats.sellerLocations - mapPreview.stats.pinnedLocations === 1
                      ? ""
                      : "s"}{" "}
                    haven't pinned their location yet
                  </span>
                )}
            </div>

            <button className="report-view-all" onClick={() => navigate("/admin-map")}>
              <MapPin size={16} /> Open Full Map
            </button>
          </div>
        </section>

        <section className="quick-actions">
          {!isStaff && (
            <button
              className="action-card"
              type="button"
              onClick={() => navigate("/admin-users")}
            >
              <Users size={22} />
              <div>
                <strong>Manage Users</strong>
                <p>Review farmer and buyer accounts.</p>
              </div>
            </button>
          )}

          <button
            className="action-card accent"
            type="button"
            onClick={() => navigate("/admin-verification")}
          >
            <ClipboardCheck size={22} />
            <div>
              <strong>Verify Listings</strong>
              <p>Approve or flag pending submissions.</p>
            </div>
          </button>

          <button
            className="action-card"
            type="button"
            onClick={() => navigate("/admin-reports")}
          >
            <BarChart3 size={22} />
            <div>
              <strong>Generate Report</strong>
              <p>Export a detailed analytics summary.</p>
            </div>
          </button>
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
              {selectedFarmer.farmer_profile_image ? (
                <img
                  className={`avatar large status-${statusSlug(selectedFarmer.status)}`}
                  src={getAvatarUrl(selectedFarmer.farmer_profile_image)}
                  alt={selectedFarmer.farmer_name}
                />
              ) : (
                <span className={`avatar large status-${statusSlug(selectedFarmer.status)}`}>
                  {initials(selectedFarmer.farmer_name)}
                </span>
              )}
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

            {!isStaff && (
              <button
                className="farmer-modal-view-all"
                type="button"
                onClick={() => navigate("/admin-users")}
              >
                <UserCircle size={16} /> View Full Profile in User Management
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function formatRelativeTime(time) {
  if (!time) return "";

  const diffMs = Date.now() - new Date(time).getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(time).toLocaleDateString();
}

function isOverdue(time) {
  if (!time) return false;
  return Date.now() - new Date(time).getTime() > 7 * 24 * 60 * 60 * 1000;
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

function Kpi({ title, value, trend, icon, accent, delta, sparkline }) {
  return (
    <div className={`kpi-card accent-${accent}`}>
      <div className="kpi-top">
        <div className="kpi-icon">{icon}</div>
        <DeltaBadge delta={delta} />
      </div>
      <h2>{value}</h2>
      <div className="kpi-bottom">
        <p>{title}</p>
        <small>{trend}</small>
      </div>
      {sparkline && sparkline.some((v) => v > 0) && (
        <div className="kpi-sparkline">
          <MiniSparkline data={sparkline} />
        </div>
      )}
    </div>
  );
}

function DeltaBadge({ delta }) {
  if (!delta) return null;
  const { pct, current, previous } = delta;

  if (pct === null) {
    return current > 0 ? (
      <span className="kpi-delta up">
        <ArrowUpRight size={12} /> New
      </span>
    ) : null;
  }

  if (pct === 0 && current === 0 && previous === 0) return null;

  const isUp = pct >= 0;

  return (
    <span className={`kpi-delta ${isUp ? "up" : "down"}`}>
      {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(pct)}%
    </span>
  );
}

function MiniSparkline({ data, height = 46 }) {
  const width = 200;
  const max = Math.max(1, ...data);
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - (Math.max(0, v) / max) * (height - 4) - 2;
    return [x, y];
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`)
    .join(" ");

  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      className="mini-sparkline"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height }}
    >
      <defs>
        <linearGradient id="sparkline-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--kpi-color)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--kpi-color)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkline-fill)" stroke="none" />
      <path d={linePath} fill="none" stroke="var(--kpi-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const DONUT_HOVER_GROWTH = 5;

function Donut({ segments, size = 176, thickness = 26, onSegmentClick }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  const total = segments.reduce((sum, item) => sum + item.value, 0) || 1;
  // Reserve room for the hover state's thicker stroke so the enlarged ring
  // never pokes past the viewBox edge and gets clipped.
  const radius = (size - thickness - DONUT_HOVER_GROWTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const hovered = hoverIndex != null ? segments[hoverIndex] : null;
  let offset = 0;

  return (
    <div className="donut-wrap">
      <svg viewBox={`0 0 ${size} ${size}`} className="donut">
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
            const isHovered = hoverIndex === index;
            const circle = (
              <circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={isHovered ? thickness + DONUT_HOVER_GROWTH : thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap={segments.length > 1 ? "round" : "butt"}
                opacity={hoverIndex != null && !isHovered ? 0.35 : 1}
                className="donut-segment"
                onMouseEnter={() => setHoverIndex(index)}
                onMouseLeave={() => setHoverIndex(null)}
                onClick={() => onSegmentClick && onSegmentClick(seg.label)}
              />
            );
            offset += dash;
            return circle;
          })}
        </g>

        <text x="50%" y="46%" textAnchor="middle" className="donut-total">
          {hovered ? hovered.value : total}
        </text>
        <text x="50%" y="63%" textAnchor="middle" className="donut-label">
          {hovered ? hovered.label : "listings"}
        </text>
        {hovered && (
          <text x="50%" y="76%" textAnchor="middle" className="donut-percent">
            {Math.round((hovered.value / total) * 100)}%
          </text>
        )}
      </svg>

      <ul className="legend">
        {segments.map((item, index) => (
          <li
            key={item.label}
            className={hoverIndex === index ? "active" : ""}
            onMouseEnter={() => setHoverIndex(index)}
            onMouseLeave={() => setHoverIndex(null)}
            onClick={() => onSegmentClick && onSegmentClick(item.label)}
          >
            <span className="dot" style={{ background: item.color }}></span>
            {item.label}
            <em>{Math.round((item.value / total) * 100)}%</em>
            <strong>{item.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BarList({ items, onItemClick }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;

  return (
    <div className="bar-list">
      {items.map((item) => {
        const percent = Math.round((item.value / total) * 100);
        const SpeciesIcon = getProductIcon(item.label, item.category);

        return (
          <button
            type="button"
            className="bar-row"
            key={item.label}
            onClick={() => onItemClick && onItemClick(item.label)}
          >
            <div
              className="bar-row-icon"
              style={{ background: `${item.color}1a`, color: item.color }}
            >
              <SpeciesIcon size={16} />
            </div>

            <div className="bar-row-body">
              <div className="bar-row-label">
                <span>{item.label}</span>
                <span className="bar-row-stats">
                  <em>{percent}%</em>
                  <strong>{item.value}</strong>
                </span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${(item.value / max) * 100}%`, background: item.color }}
                ></div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function TrendChart({ data, series, height = 200, xKey = "label" }) {
  const svgRef = useRef(null);
  const [hoverIndex, setHoverIndex] = useState(null);

  const width = 600;
  const padTop = 14;
  const padBottom = 26;
  const padX = 4;
  const innerHeight = height - padTop - padBottom;

  const maxValue = Math.max(
    1,
    ...data.flatMap((d) => series.map((s) => d[s.key] || 0))
  );

  const stepX = data.length > 1 ? (width - padX * 2) / (data.length - 1) : 0;

  const pointsFor = (key) =>
    data.map((d, i) => {
      const x = padX + i * stepX;
      const y = padTop + innerHeight - (Math.max(0, d[key] || 0) / maxValue) * innerHeight;
      return [x, y];
    });

  const linePath = (points) =>
    points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(" ");

  const areaPath = (points) => {
    if (points.length === 0) return "";
    const first = points[0];
    const last = points[points.length - 1];
    const baseline = (padTop + innerHeight).toFixed(2);
    return `${linePath(points)} L ${last[0].toFixed(2)} ${baseline} L ${first[0].toFixed(2)} ${baseline} Z`;
  };

  const handleMove = (e) => {
    if (!svgRef.current || data.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    const index = Math.max(0, Math.min(data.length - 1, Math.round(fraction * (data.length - 1))));
    setHoverIndex(index);
  };

  const hoverX = hoverIndex != null && data.length > 0 ? padX + hoverIndex * stepX : null;
  const labelStep = Math.max(1, Math.ceil(data.length / 6));

  return (
    <div className="trend-chart">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height }}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          {series.map((s) => (
            <linearGradient id={`trend-grad-${s.key}`} key={s.key} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {series.map((s) => {
          const points = pointsFor(s.key);
          return (
            <g key={s.key}>
              <path d={areaPath(points)} fill={`url(#trend-grad-${s.key})`} stroke="none" />
              <path
                d={linePath(points)}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          );
        })}

        {hoverX != null && (
          <line
            x1={hoverX}
            x2={hoverX}
            y1={padTop}
            y2={padTop + innerHeight}
            stroke="var(--border)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}

        {hoverIndex != null &&
          series.map((s) => {
            const points = pointsFor(s.key);
            const [x, y] = points[hoverIndex];
            return (
              <circle key={s.key} cx={x} cy={y} r="3.5" fill={s.color} stroke="white" strokeWidth="1.5" />
            );
          })}
      </svg>

      {hoverIndex != null && data[hoverIndex] && (
        <div
          className="trend-tooltip"
          style={{ left: `${Math.min(92, Math.max(8, (hoverX / width) * 100))}%` }}
        >
          <strong>{data[hoverIndex][xKey]}</strong>
          {series.map((s) => (
            <div key={s.key} className="trend-tooltip-row">
              <span className="dot" style={{ background: s.color }}></span>
              {s.label}: <b>{data[hoverIndex][s.key]}</b>
            </div>
          ))}
        </div>
      )}

      <div className="trend-x-labels">
        {data
          .filter((_, i) => i % labelStep === 0)
          .map((d, i) => (
            <span key={`${d[xKey]}-${i}`}>{d[xKey]}</span>
          ))}
      </div>
    </div>
  );
}

export default AdminDashboard;
