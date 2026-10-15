import { useEffect, useState, useRef, useCallback, useMemo } from "react";

import {
  ArrowLeft,
  MapPin,
  Search,
  Users,
  ClipboardCheck,
  LocateFixed,
  Layers,
  Activity,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import useGoBack from "../utils/useGoBack";
import AdminStatCard from "../components/AdminStatCard";
import ProductTypeOptions, { matchesTypeFilter } from "../components/ProductTypeOptions";
import LeafletMap from "../utils/LeafletMap";
import escapeHtml from "../utils/escapeHtml";
import {
  VERUELA_CENTER,
  VERUELA_BOUNDARY_GEOJSON,
  VERUELA_BARANGAYS,
  isInsideVeruela,
} from "../utils/veruelaGeo";
import { API_URL } from "../config";
import { getProductIcon } from "../utils/productCatalog";
import { pollWhenIdle } from "../utils/polling";
import "./AdminMapMonitoring.css";

const POLL_INTERVAL_MS = 15000;

function AdminMapMonitoring() {
  const navigate = useNavigate();
  const goBack = useGoBack("/admin-dashboard");
  const mapRef = useRef(null);
  const mapPollRef = useRef(false);

  const [locations, setLocations] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [stats, setStats] = useState({
    sellerLocations: 0,
    pinnedLocations: 0,
    mappedListings: 0,
    livestockTypes: 0,
    pendingReview: 0,
  });

  const [searchText, setSearchText] = useState("");
  const [livestockFilter, setLivestockFilter] = useState("All Types");
  const [barangayFilter, setBarangayFilter] = useState("All Barangays");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchMapData = useCallback(
    async (isRefresh = false) => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        if (isRefresh) setRefreshing(true);

        const res = await fetch(`${API_URL}/api/admin/map`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          setMessage(data.message || "Failed to load map data");
          setLoading(false);
          setRefreshing(false);
          return;
        }

        setLocations(data.locations);
        setDistribution(data.distribution);
        setStats(data.stats);
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
    fetchMapData();
    const interval = setInterval(pollWhenIdle(mapPollRef, fetchMapData), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchMapData]);

  const filteredLocations = locations.filter((item) => {
    const search = searchText.toLowerCase();

    const farmer = item.farmer || "";
    const address = item.address || item.location || "";
    const livestockTypes = item.livestock_types || "";

    const matchesSearch =
      farmer.toLowerCase().includes(search) ||
      address.toLowerCase().includes(search) ||
      livestockTypes.toLowerCase().includes(search);

    // livestock_types is the farmer's listing types joined with commas
    const matchesLivestock =
      livestockFilter === "All Types" ||
      livestockTypes
        .split(",")
        .some((type) => matchesTypeFilter(type.trim(), livestockFilter));

    const matchesBarangay =
      barangayFilter === "All Barangays" ||
      address.includes(barangayFilter);

    return matchesSearch && matchesLivestock && matchesBarangay;
  });

  const pinnedFilteredLocations = filteredLocations.filter(
    (item) => item.farm_lat != null && item.farm_lng != null
  );

  // Farms pinned outside the municipal boundary — checked against the
  // actual Veruela outline, not just assumed.
  const outsideVeruelaCount = locations.filter(
    (item) =>
      item.farm_lat != null &&
      item.farm_lng != null &&
      !isInsideVeruela(Number(item.farm_lat), Number(item.farm_lng))
  ).length;

  const barangays = [
    "All Barangays",
    ...new Set(
      locations
        .map((item) => item.address || item.location)
        .filter(Boolean)
        .map((address) => address.split(",")[0])
    ),
  ];

  const totalDistribution = distribution.reduce(
    (sum, item) => sum + Number(item.total),
    0
  );

  const mapMarkers = useMemo(
    () =>
      pinnedFilteredLocations.map((item) => ({
        id: item.id,
        lat: Number(item.farm_lat),
        lng: Number(item.farm_lng),
        // Matches the legend dots exactly — neon teal for active, neon
        // gold for pending so it visually demands review.
        color: item.status === "Pending" ? "#FFD60A" : "#00F5D4",
        shape: "pin",
        pulse: item.status === "Pending",
        popupHtml: `
          <div class="map-popup">
            <strong>${escapeHtml(item.farmer || "Unknown farmer")}</strong>
            <span>${escapeHtml(item.address || item.location || "No address")}</span>
            <span>${escapeHtml(item.livestock_types || "No listings yet")}</span>
            <span>${item.listings} listing(s)</span>
          </div>
        `,
      })),
    [pinnedFilteredLocations]
  );

  const handleRecordClick = (item) => {
    if (item.farm_lat != null && item.farm_lng != null) {
      mapRef.current?.flyTo(Number(item.farm_lat), Number(item.farm_lng), 15);
    }
  };

  if (loading) {
    return <h2 style={{ padding: "30px" }}>Loading map monitoring...</h2>;
  }

  if (message) {
    return <h2 style={{ padding: "30px", color: "red" }}>{message}</h2>;
  }

  return (
    <div className="map-admin-page">
      <header className="map-topbar">
        <div className="map-title-group">
          <button type="button" className="map-back-btn" onClick={goBack} aria-label="Go back">
            <ArrowLeft size={20} />
          </button>

          <div>
            <span className="eyebrow">MAO LOCATION MONITORING</span>
            <h1>Map Monitoring</h1>
            <p>
              Monitor seller locations, listing distribution, and farm
              activity within Veruela, Agusan del Sur.
            </p>
          </div>
        </div>

        <div className="map-topbar-actions">
          {lastUpdated && (
            <span className="last-updated">
              Synced {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}

          <button
            className={`refresh-pill ${refreshing ? "spinning" : ""}`}
            onClick={() => fetchMapData(true)}
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </header>

      <section className="map-kpi-grid">
        <AdminStatCard
          accent="blue"
          icon={<Users />}
          value={stats.sellerLocations}
          label="Seller Locations"
          note="Registered farmers"
        />

        <AdminStatCard
          accent="green"
          icon={<LocateFixed />}
          value={`${stats.pinnedLocations}/${stats.sellerLocations}`}
          label="Pinned on Map"
          note="Farmers with exact coordinates"
        />

        <AdminStatCard
          accent="amber"
          icon={<ClipboardCheck />}
          value={stats.mappedListings}
          label="Mapped Listings"
          note="Marketplace records"
        />

        <AdminStatCard
          accent="purple"
          icon={<Layers />}
          value={stats.livestockTypes}
          label="Product Types"
          note="Livestock and farm products"
        />
      </section>

      <section className="map-filter-panel">
        <div className="map-search-box">
          <Search size={18} />

          <input
            placeholder="Search farmer, barangay, product type..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        <select
          value={livestockFilter}
          onChange={(e) => setLivestockFilter(e.target.value)}
        >
          <option>All Types</option>
          <ProductTypeOptions />
        </select>

        <select
          value={barangayFilter}
          onChange={(e) => setBarangayFilter(e.target.value)}
        >
          {barangays.map((barangay, index) => (
            <option key={index}>{barangay}</option>
          ))}
        </select>
      </section>

      <section className="map-main-grid">
        <div className="map-card map-card-large accent-teal">
          <div className="card-heading">
            <div>
              <h3>Seller Location Overview</h3>
              <p>Live map of pinned seller/farm locations. Updates automatically.</p>
            </div>

            <span className="live-badge">
              <i className="live-dot"></i>
              <Activity size={15} />
              Live &middot; auto-refreshing
            </span>
          </div>

          <LeafletMap
            ref={mapRef}
            center={VERUELA_CENTER}
            zoom={12}
            height="540px"
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
            {stats.sellerLocations > stats.pinnedLocations && (
              <span className="legend-hint">
                {stats.sellerLocations - stats.pinnedLocations} farmer(s) haven't pinned
                their farm location yet
              </span>
            )}
          </div>
        </div>

        <aside className="map-card accent-blue">
          <div className="card-heading">
            <div>
              <h3>Seller Records</h3>
              <p>Click a record to jump to it on the map</p>
            </div>

            <strong className="record-count">{filteredLocations.length}</strong>
          </div>

          <div className="location-records">
            {filteredLocations.length === 0 ? (
              <p>No seller locations found.</p>
            ) : (
              filteredLocations.map((item) => (
                <div
                  className={`location-record ${
                    item.farm_lat != null ? "clickable" : ""
                  }`}
                  key={item.id}
                  onClick={() => handleRecordClick(item)}
                >
                  <div className={`record-icon ${item.status === "Pending" ? "pending" : ""}`}>
                    <MapPin size={20} />
                  </div>

                  <div className="record-info">
                    <strong>{item.farmer}</strong>
                    <p>{item.address || item.location || "No location provided"}</p>

                    <div className="record-tags">
                      <span>{item.livestock_types || "No listings yet"}</span>
                      <span>{item.listings} listing(s)</span>
                      {item.farm_lat == null && (
                        <span className="tag-unpinned">Not pinned</span>
                      )}
                    </div>
                  </div>

                  <div className="record-action">
                    <span
                      className={
                        item.status === "Pending"
                          ? "status-pending"
                          : "status-active"
                      }
                    >
                      {item.status === "Pending" ? "Pending" : "Active"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </section>

      <section className="map-insights-grid">
        <div className="map-card accent-green">
          <div className="card-heading">
            <div>
              <h3>Product Distribution</h3>
              <p>Share of mapped listings by species.</p>
            </div>
          </div>

          {distribution.length === 0 ? (
            <p>No listing distribution data yet.</p>
          ) : (
            distribution.map((item) => {
              const pct =
                totalDistribution > 0
                  ? (Number(item.total) / totalDistribution) * 100
                  : 0;

              return (
                <Distribution
                  key={item.livestock_type}
                  icon={getProductIcon(item.livestock_type, item.category)}
                  type={item.livestock_type}
                  label={item.livestock_type}
                  value={item.total}
                  percent={pct}
                  width={`${pct}%`}
                />
              );
            })
          )}
        </div>

        <div className="map-card accent-amber">
          <div className="card-heading">
            <div>
              <h3>Monitoring Alerts</h3>
              <p>Items that may need MAO attention.</p>
            </div>
          </div>

          <div className="alert-row warning">
            <div className="alert-icon warning">
              <AlertTriangle size={20} />
            </div>
            <div className="alert-body">
              <strong>Pending location review</strong>
              <p>{stats.pendingReview} seller/listing record(s) need MAO validation.</p>
            </div>
            <span className="alert-status warning">Action Needed</span>
          </div>

          <div className={`alert-row ${outsideVeruelaCount > 0 ? "warning" : "normal"}`}>
            <div className={`alert-icon ${outsideVeruelaCount > 0 ? "warning" : ""}`}>
              <MapPin size={20} />
            </div>
            <div className="alert-body">
              <strong>Coverage status</strong>
              <p>
                {outsideVeruelaCount > 0
                  ? `${outsideVeruelaCount} seller location(s) are pinned outside Veruela.`
                  : "All pinned seller locations are within Veruela."}
              </p>
            </div>
            <span className={`alert-status ${outsideVeruelaCount > 0 ? "warning" : "normal"}`}>
              {outsideVeruelaCount > 0 ? "Check Pins" : "All Clear"}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

function Distribution({ icon: Icon, type, label, value, percent, width }) {
  return (
    <div className="distribution-item">
      <div>
        <span className="distribution-label">
          <i className={`distribution-icon ${(type || "").toLowerCase()}`}>
            <Icon size={18} strokeWidth={2.25} />
          </i>
          <strong>{label}</strong>
        </span>

        <span className="distribution-figures">
          <span className="distribution-percent">{percent.toFixed(0)}%</span>
          <span className="distribution-value">{value}</span>
        </span>
      </div>

      <div className="distribution-track">
        <div className={(type || "").toLowerCase()} style={{ width }}></div>
      </div>
    </div>
  );
}

export default AdminMapMonitoring;
