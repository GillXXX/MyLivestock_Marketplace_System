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

import { Link, useNavigate } from "react-router-dom";
import LeafletMap from "../utils/LeafletMap";
import escapeHtml from "../utils/escapeHtml";
import {
  VERUELA_CENTER,
  VERUELA_BOUNDARY_GEOJSON,
  VERUELA_BARANGAYS,
} from "../utils/veruelaGeo";
import { API_URL } from "../config";
import "./AdminMapMonitoring.css";

const POLL_INTERVAL_MS = 15000;

function AdminMapMonitoring() {
  const navigate = useNavigate();
  const mapRef = useRef(null);

  const [locations, setLocations] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [stats, setStats] = useState({
    sellerLocations: 0,
    pinnedLocations: 0,
    mappedListings: 0,
    livestockTypes: 0,
    withinVeruela: "0%",
    pendingReview: 0,
  });

  const [searchText, setSearchText] = useState("");
  const [livestockFilter, setLivestockFilter] = useState("All Livestock");
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
    const interval = setInterval(() => fetchMapData(), POLL_INTERVAL_MS);
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

    const matchesLivestock =
      livestockFilter === "All Livestock" ||
      livestockTypes.includes(livestockFilter);

    const matchesBarangay =
      barangayFilter === "All Barangays" ||
      address.includes(barangayFilter);

    return matchesSearch && matchesLivestock && matchesBarangay;
  });

  const pinnedFilteredLocations = filteredLocations.filter(
    (item) => item.farm_lat != null && item.farm_lng != null
  );

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
        color: item.status === "Pending" ? "#e3b463" : "#b8842c",
        shape: "pin",
        popupHtml: `
          <div class="map-popup">
            <strong>${escapeHtml(item.farmer || "Unknown farmer")}</strong>
            <span>${escapeHtml(item.address || item.location || "No address")}</span>
            <span>${escapeHtml(item.livestock_types || "No livestock yet")}</span>
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
          <Link to="/admin-dashboard" className="map-back-btn">
            <ArrowLeft size={20} />
          </Link>

          <div>
            <span className="eyebrow">MAO LOCATION MONITORING</span>
            <h1>Map Monitoring</h1>
            <p>
              Monitor seller locations, livestock listing distribution, and farm
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
        <MapStat
          icon={<Users />}
          value={stats.sellerLocations}
          label="Seller Locations"
          trend="Registered farmers"
        />

        <MapStat
          icon={<LocateFixed />}
          value={`${stats.pinnedLocations}/${stats.sellerLocations}`}
          label="Pinned on Map"
          trend="Farmers with exact coordinates"
        />

        <MapStat
          icon={<ClipboardCheck />}
          value={stats.mappedListings}
          label="Mapped Listings"
          trend="Marketplace records"
        />

        <MapStat
          icon={<Layers />}
          value={stats.livestockTypes}
          label="Livestock Types"
          trend="Swine, cattle, goat, poultry"
        />
      </section>

      <section className="map-filter-panel">
        <div className="map-search-box">
          <Search size={18} />

          <input
            placeholder="Search farmer, barangay, livestock type..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        <select
          value={livestockFilter}
          onChange={(e) => setLivestockFilter(e.target.value)}
        >
          <option>All Livestock</option>
          <option>Swine</option>
          <option>Cattle</option>
          <option>Goat</option>
          <option>Poultry</option>
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
        <div className="map-card map-card-large">
          <div className="card-heading">
            <div>
              <h3>Seller Location Overview</h3>
              <p>Live map of pinned seller/farm locations. Updates automatically.</p>
            </div>

            <span className="live-badge">
              <Activity size={15} />
              Live &middot; auto-refreshing
            </span>
          </div>

          <LeafletMap
            ref={mapRef}
            center={VERUELA_CENTER}
            zoom={12}
            height="420px"
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

        <aside className="map-card">
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
                  <div className="record-icon">
                    <MapPin size={20} />
                  </div>

                  <div className="record-info">
                    <strong>{item.farmer}</strong>
                    <p>{item.address || item.location || "No location provided"}</p>

                    <div className="record-tags">
                      <span>{item.livestock_types || "No livestock yet"}</span>
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
        <div className="map-card">
          <h3>Livestock Distribution</h3>

          {distribution.length === 0 ? (
            <p>No livestock distribution data yet.</p>
          ) : (
            distribution.map((item) => {
              const percent =
                totalDistribution > 0
                  ? `${(Number(item.total) / totalDistribution) * 100}%`
                  : "0%";

              return (
                <Distribution
                  key={item.livestock_type}
                  label={item.livestock_type}
                  value={item.total}
                  width={percent}
                />
              );
            })
          )}
        </div>

        <div className="map-card">
          <h3>Monitoring Alerts</h3>

          <div className="alert-row">
            <AlertTriangle size={20} />
            <div>
              <strong>Pending location review</strong>
              <p>{stats.pendingReview} seller/listing record(s) need MAO validation.</p>
            </div>
          </div>

          <div className="alert-row normal">
            <MapPin size={20} />
            <div>
              <strong>Coverage status</strong>
              <p>All current listings are within Veruela scope.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function MapStat({ icon, value, label, trend }) {
  return (
    <div className="map-stat-card">
      <div className="map-stat-icon">{icon}</div>
      <h2>{value}</h2>
      <p>{label}</p>
      <small>{trend}</small>
    </div>
  );
}

function Distribution({ label, value, width }) {
  return (
    <div className="distribution-item">
      <div>
        <strong>{label}</strong>
        <span>{value}</span>
      </div>

      <div className="distribution-track">
        <div style={{ width }}></div>
      </div>
    </div>
  );
}

export default AdminMapMonitoring;
