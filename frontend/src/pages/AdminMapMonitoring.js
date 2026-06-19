import { useEffect, useState } from "react";

import {
  ArrowLeft,
  MapPin,
  Search,
  Filter,
  Users,
  ClipboardCheck,
  Navigation,
  Eye,
  LocateFixed,
  Layers,
  Activity,
  AlertTriangle,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import "./AdminMapMonitoring.css";

function AdminMapMonitoring() {
  const navigate = useNavigate();

  const [locations, setLocations] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [stats, setStats] = useState({
    sellerLocations: 0,
    mappedListings: 0,
    livestockTypes: 0,
    withinVeruela: "0%",
    pendingReview: 0,
  });

  const [searchText, setSearchText] = useState("");
  const [livestockFilter, setLivestockFilter] = useState("All Livestock");
  const [barangayFilter, setBarangayFilter] = useState("All Barangays");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchMapData = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const res = await fetch("http://localhost:5000/api/admin/map", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          setMessage(data.message || "Failed to load map data");
          setLoading(false);
          return;
        }

        setLocations(data.locations);
        setDistribution(data.distribution);
        setStats(data.stats);
        setLoading(false);
      } catch (error) {
        setMessage("Cannot connect to backend server");
        setLoading(false);
      }
    };

    fetchMapData();
  }, [navigate]);

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

        <button className="primary-action" type="button">
          <Navigation size={18} />
          Center Veruela Map
        </button>
      </header>

      <section className="map-kpi-grid">
        <MapStat
          icon={<Users />}
          value={stats.sellerLocations}
          label="Seller Locations"
          trend="Registered farmers"
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

        <MapStat
          icon={<LocateFixed />}
          value={stats.withinVeruela}
          label="Within Veruela"
          trend="Scope compliant"
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

        <button type="button">
          <Filter size={17} />
          Apply Filter
        </button>
      </section>

      <section className="map-main-grid">
        <div className="map-card map-card-large">
          <div className="card-heading">
            <div>
              <h3>Seller Location Overview</h3>
              <p>Approximate visual monitoring map for seller/farm locations.</p>
            </div>

            <span className="live-badge">
              <Activity size={15} />
              Live Preview
            </span>
          </div>

          <div className="professional-map">
            <div className="route route-a"></div>
            <div className="route route-b"></div>
            <div className="route route-c"></div>

            {filteredLocations.slice(0, 3).map((item, index) => (
              <MapMarker
                key={item.id}
                className={
                  index === 0
                    ? "marker-a"
                    : index === 1
                    ? "marker-b"
                    : "marker-c warning"
                }
                count={item.listings}
                name={item.farmer}
                text={`${item.livestock_types || "No livestock"} • ${
                  item.address || item.location || "No location"
                }`}
              />
            ))}

            <div className="map-center-label">
              <strong>Veruela, Agusan del Sur</strong>
              <p>Seller/farm location monitoring area</p>
            </div>

            <div className="map-legend">
              <span>
                <i className="active-dot"></i> Active
              </span>
              <span>
                <i className="pending-dot"></i> Pending Review
              </span>
            </div>
          </div>
        </div>

        <aside className="map-card">
          <div className="card-heading">
            <div>
              <h3>Seller Records</h3>
              <p>Registered farm/seller locations</p>
            </div>

            <strong className="record-count">{filteredLocations.length}</strong>
          </div>

          <div className="location-records">
            {filteredLocations.length === 0 ? (
              <p>No seller locations found.</p>
            ) : (
              filteredLocations.map((item) => (
                <div className="location-record" key={item.id}>
                  <div className="record-icon">
                    <MapPin size={20} />
                  </div>

                  <div className="record-info">
                    <strong>{item.farmer}</strong>
                    <p>{item.address || item.location || "No location provided"}</p>

                    <div className="record-tags">
                      <span>{item.livestock_types || "No livestock yet"}</span>
                      <span>{item.listings} listing(s)</span>
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

                    <button type="button">
                      <Eye size={17} />
                    </button>
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

function MapMarker({ className, count, name, text }) {
  return (
    <div className={`pro-marker ${className}`}>
      <span>{count}</span>

      <div className="marker-card">
        <strong>{name}</strong>
        <p>{text}</p>
      </div>
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