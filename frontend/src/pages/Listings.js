import { useEffect, useState } from "react";

import {
  ArrowLeft,
  Search,
  PlusCircle,
  TrendingUp,
  PackageCheck,
  Clock3,
  Wallet,
  MapPin,
  X,
  FileText,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import "./Listings.css";

function Listings() {
  const navigate = useNavigate();

  const [listings, setListings] = useState([]);
  const [stats, setStats] = useState({
    activeListings: 0,
    pendingReview: 0,
    marketplaceViews: 0,
    estimatedValue: 0,
  });

  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Livestock");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [selectedListing, setSelectedListing] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const defaultImage =
    "https://images.unsplash.com/photo-1500595046743-cd271d694d30?q=80&w=1400&auto=format&fit=crop";

  const fetchListings = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const res = await fetch(`${API_URL}/api/listings/my-listings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to load listings");
        setLoading(false);
        return;
      }

      setListings(data.listings);
      setStats(data.stats);
      setLoading(false);
    } catch (error) {
      setError("Cannot connect to backend server");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const parseDocuments = (documents) => {
    if (!documents) return [];

    try {
      const parsed = JSON.parse(documents);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  };

  const handleDelete = async (item) => {
    const confirmed = window.confirm(
      `Remove your ${item.livestock_type} (${item.breed || "listing"}) from the marketplace? This can't be undone from here.`
    );

    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/listings/${item.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to remove listing");
        return;
      }

      if (selectedListing?.id === item.id) {
        setSelectedListing(null);
      }

      fetchListings();
    } catch (error) {
      alert("Cannot connect to backend server");
    }
  };

  if (loading) return <h2 style={{ padding: "30px" }}>Loading listings...</h2>;
  if (error) return <h2 style={{ padding: "30px", color: "red" }}>{error}</h2>;

  const searchTerm = searchText.trim().toLowerCase();
  const filteredListings = listings.filter((item) => {
    const matchesSearch = searchTerm
      ? [item.livestock_type, item.breed, item.location]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(searchTerm))
      : true;

    const matchesType =
      typeFilter === "All Livestock" || item.livestock_type === typeFilter;

    const matchesStatus =
      statusFilter === "All Status" || item.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="premium-listings-page">
      <div className="premium-header">
        <div className="header-left">
          <Link to="/farmer-dashboard" className="back-btn">
            <ArrowLeft size={20} />
          </Link>

          <div>
            <span className="page-tag">FARMER MARKETPLACE</span>
            <h1>My Livestock Listings</h1>
            <p>Manage your livestock marketplace postings professionally.</p>
          </div>
        </div>

        <Link to="/post" className="create-btn">
          <PlusCircle size={18} />
          Create Listing
        </Link>
      </div>

      <section className="stats-grid">
        <StatCard
          tone="green"
          icon={<PackageCheck />}
          value={stats.activeListings}
          label="Active Listings"
          note="Current livestock posts"
        />

        <StatCard
          tone="amber"
          icon={<Clock3 />}
          value={stats.pendingReview}
          label="Pending Review"
          note="Awaiting verification"
        />

        <StatCard
          tone="blue"
          icon={<TrendingUp />}
          value={stats.marketplaceViews}
          label="Marketplace Views"
          note="Buyer engagement"
        />

        <StatCard
          tone="purple"
          icon={<Wallet />}
          value={`₱${Number(stats.estimatedValue).toLocaleString()}`}
          label="Estimated Value"
          note="Combined listing worth"
        />
      </section>

      <section className="toolbar-section">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search livestock..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        <div className="toolbar-actions">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option>All Livestock</option>
            <option>Swine</option>
            <option>Cattle</option>
            <option>Goat</option>
            <option>Poultry</option>
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option>All Status</option>
            <option>Available</option>
            <option>Pending</option>
            <option>Sold</option>
          </select>
        </div>
      </section>

      <section className="premium-livestock-grid">
        {listings.length === 0 ? (
          <h3>No livestock listings yet.</h3>
        ) : filteredListings.length === 0 ? (
          <h3>No listings match your search.</h3>
        ) : (
          filteredListings.map((item) => (
            <div className="premium-card" key={item.id}>
              <div className="premium-image-wrapper">
                <img src={item.image_url || defaultImage} alt={item.breed} />

                <span className={`premium-badge status-${item.status?.toLowerCase()}`}>
                  {item.status}
                </span>

                <div className="premium-image-overlay">
                  <div className="premium-overlay-text">
                    <h3>{item.breed}</h3>
                    <span className="premium-price-tag">
                      ₱{Number(item.price).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="premium-card-body">
                <div className="premium-meta-row">
                  <span>
                    <MapPin size={14} />
                    {item.location}
                  </span>
                  <span className="meta-divider">•</span>
                  <span>{item.age}</span>
                </div>

                <div className="premium-divider" />

                <div className="premium-card-actions">
                  <button
                    className="details-btn"
                    type="button"
                    onClick={() => setSelectedListing(item)}
                  >
                    View Details
                  </button>

                  <Link className="listing-edit-btn" to={`/post/${item.id}`}>
                    <Pencil size={16} />
                  </Link>

                  <button
                    className="delete-btn"
                    type="button"
                    onClick={() => handleDelete(item)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      {selectedListing && (
        <div className="listing-modal-overlay" onClick={() => setSelectedListing(null)}>
          <div className="listing-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="listing-modal-close"
              type="button"
              onClick={() => setSelectedListing(null)}
            >
              <X size={20} />
            </button>

            <img
              src={selectedListing.image_url || defaultImage}
              alt={selectedListing.breed}
            />

            <div className="listing-modal-body">
              <div className="listing-modal-head">
                <div>
                  <h2>{selectedListing.breed}</h2>
                  <p>
                    {selectedListing.livestock_type} • {selectedListing.age}
                  </p>
                </div>

                <strong>₱{Number(selectedListing.price).toLocaleString()}</strong>
              </div>

              <div className="listing-modal-info">
                <div>
                  <span>Weight</span>
                  <strong>{selectedListing.weight || "N/A"}</strong>
                </div>

                <div>
                  <span>Health Status</span>
                  <strong>{selectedListing.health_status || "N/A"}</strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong>{selectedListing.status}</strong>
                </div>

                <div>
                  <span>Location</span>
                  <strong>{selectedListing.location}</strong>
                </div>

                <div>
                  <span>
                    <Eye size={12} style={{ verticalAlign: "-2px" }} /> Views
                  </span>
                  <strong>{selectedListing.views || 0}</strong>
                </div>
              </div>

              {selectedListing.description && (
                <div className="listing-modal-description">
                  <h4>Description</h4>
                  <p>{selectedListing.description}</p>
                </div>
              )}

              {parseDocuments(selectedListing.documents).length > 0 && (
                <div className="listing-modal-documents">
                  <h4>Supporting Documents</h4>

                  {parseDocuments(selectedListing.documents).map((docUrl, index) => (
                    <a
                      key={index}
                      href={docUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FileText size={16} />
                      Document {index + 1}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, value, label, note, tone = "green" }) {
  return (
    <div className={`stat-card tone-${tone}`}>
      <div className="stat-icon">{icon}</div>
      <h2>{value}</h2>
      <p>{label}</p>
      <small>{note}</small>
    </div>
  );
}

export default Listings;