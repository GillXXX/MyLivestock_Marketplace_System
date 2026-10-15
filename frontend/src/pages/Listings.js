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
  Pencil,
  Trash2,
  UploadCloud,
  PackageSearch,
  Hash,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import AdminStatCard from "../components/AdminStatCard";
import ProductTypeOptions, { matchesTypeFilter } from "../components/ProductTypeOptions";
import { API_URL } from "../config";
import {
  getProductIcon,
  isLivestock,
  formatPrice,
  formatQuantity,
  formatWeight,
} from "../utils/productCatalog";
import useGoBack from "../utils/useGoBack";
import "./Listings.css";

function Listings() {
  const navigate = useNavigate();
  const goBack = useGoBack("/farmer-dashboard");

  const [listings, setListings] = useState([]);
  const [stats, setStats] = useState({
    activeListings: 0,
    pendingReview: 0,
    marketplaceViews: 0,
    estimatedValue: 0,
  });

  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [selectedListing, setSelectedListing] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const formatPostedTime = (time) => {
    if (!time) return "";

    const diffDays = Math.floor((Date.now() - new Date(time).getTime()) / 86400000);

    if (diffDays <= 0) return "Posted today";
    if (diffDays === 1) return "Posted yesterday";
    if (diffDays < 30) return `Posted ${diffDays} days ago`;

    return `Posted ${new Date(time).toLocaleDateString()}`;
  };

  const parseDocuments = (documents) => {
    if (!documents) return [];

    try {
      const parsed = JSON.parse(documents);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  };

  const handlePublish = async (item) => {
    const confirmed = window.confirm(
      `Submit your ${item.livestock_type} (${item.breed || "listing"}) draft for MAO review?`
    );

    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/listings/${item.id}/publish`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to publish listing");
        return;
      }

      fetchListings();
    } catch (error) {
      alert("Cannot connect to backend server");
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
      typeFilter === "All Types" || matchesTypeFilter(item.livestock_type, typeFilter);

    const matchesStatus =
      statusFilter === "All Status" || item.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const SelectedSpeciesIcon = getProductIcon(
    selectedListing?.livestock_type,
    selectedListing?.category
  );
  const selectedIsLivestock = isLivestock(
    selectedListing?.livestock_type,
    selectedListing?.category
  );

  return (
    <div className="premium-listings-page">
      <div className="premium-header">
        <div className="header-left">
          <button type="button" className="back-btn" onClick={goBack} aria-label="Go back">
            <ArrowLeft size={20} />
          </button>

          <div>
            <span className="page-tag">FARMER MARKETPLACE</span>
            <h1>My Listings</h1>
            <p>Manage your livestock and farm product postings.</p>
          </div>
        </div>

        <Link to="/post" className="create-btn">
          <PlusCircle size={18} />
          Create Listing
        </Link>
      </div>

      <section className="stats-grid">
        <AdminStatCard
          icon={<PackageCheck />}
          value={stats.activeListings}
          label="Active Listings"
          note="Current marketplace posts"
        />

        <AdminStatCard
          icon={<Clock3 />}
          value={stats.pendingReview}
          label="Pending Review"
          note="Awaiting verification"
        />

        <AdminStatCard
          icon={<TrendingUp />}
          value={stats.marketplaceViews}
          label="Marketplace Views"
          note="Buyer engagement"
        />

        <AdminStatCard
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
            placeholder="Search listings..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        <div className="toolbar-actions">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option>All Types</option>
            <ProductTypeOptions />
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option>All Status</option>
            <option>Available</option>
            <option>Pending</option>
            <option>Sold</option>
            <option>Draft</option>
          </select>
        </div>
      </section>

      {listings.length > 0 && (
        <p className="results-count">
          Showing {filteredListings.length} of {listings.length} listing
          {listings.length === 1 ? "" : "s"}
        </p>
      )}

      <section className="premium-livestock-grid">
        {listings.length === 0 ? (
          <div className="listings-empty-state">
            <PackageSearch size={38} />
            <h3>No listings yet</h3>
            <p>Post your first livestock or farm product to start reaching verified buyers.</p>
            <Link to="/post" className="create-btn">
              <PlusCircle size={18} />
              Create Listing
            </Link>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="listings-empty-state">
            <Search size={38} />
            <h3>No listings match your search</h3>
            <p>Try a different keyword or clear your filters.</p>
            <button
              type="button"
              className="clear-filters-btn"
              onClick={() => {
                setSearchText("");
                setTypeFilter("All Types");
                setStatusFilter("All Status");
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          filteredListings.map((item) => {
            const SpeciesIcon = getProductIcon(item.livestock_type, item.category);

            return (
            <div className="premium-card" key={item.id}>
              <div className="premium-image-wrapper">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.breed} />
                ) : (
                  <div className="premium-image-fallback">
                    <SpeciesIcon size={30} />
                  </div>
                )}

                <span className="premium-type-chip">{item.livestock_type}</span>
              </div>

              <div className="premium-card-body">
                <div className="premium-card-title">
                  <div>
                    <h3>{item.breed || item.livestock_type}</h3>
                    <span className="premium-card-subtitle">{item.livestock_type}</span>
                  </div>

                  <strong>{formatPrice(item.price, item.unit)}</strong>
                </div>

                <div className="premium-meta-col">
                  <div>
                    <MapPin size={14} />
                    <span>{item.location}</span>
                  </div>

                  <div>
                    <Clock3 size={14} />
                    <span>{formatPostedTime(item.created_at)}</span>
                  </div>
                </div>

                <div className="premium-status-row">
                  <span className={`premium-badge status-${item.status?.toLowerCase()}`}>
                    {item.status}
                  </span>

                  <span className={item.quantity > 0 ? "stock-chip" : "stock-chip out"}>
                    <Hash size={12} />
                    {item.quantity > 0
                      ? `${formatQuantity(item.quantity, item.unit)} available`
                      : "Out of stock"}
                  </span>
                </div>

                <div className="premium-card-actions">
                  <button
                    className="details-btn"
                    type="button"
                    onClick={() => setSelectedListing(item)}
                  >
                    View Details
                  </button>

                  {item.status === "Draft" && (
                    <button
                      className="publish-btn"
                      title="Submit draft for review"
                      type="button"
                      onClick={() => handlePublish(item)}
                    >
                      <UploadCloud size={16} />
                    </button>
                  )}

                  <Link className="listing-edit-btn" to={`/post/${item.id}`} title="Edit listing">
                    <Pencil size={16} />
                  </Link>

                  <button
                    className="delete-btn"
                    type="button"
                    title="Remove listing"
                    onClick={() => handleDelete(item)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
            );
          })
        )}
      </section>

      {selectedListing && (
        <div className="listing-modal-overlay" onClick={() => setSelectedListing(null)}>
          <div className="listing-modal" onClick={(e) => e.stopPropagation()}>
            <div className="listing-modal-media">
              <div className="listing-modal-media-scroll">
                {selectedListing.image_url ? (
                  <img src={selectedListing.image_url} alt={selectedListing.breed} />
                ) : (
                  <div className="listing-modal-media-fallback">
                    <SelectedSpeciesIcon size={44} />
                  </div>
                )}
              </div>

              <button
                className="listing-modal-close"
                type="button"
                onClick={() => setSelectedListing(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="listing-modal-body">
              <div className="listing-modal-top-row">
                <span
                  className={`listing-modal-status status-${selectedListing.status?.toLowerCase()}`}
                >
                  {selectedListing.status}
                </span>

                <strong className="listing-modal-price-inline">
                  {formatPrice(selectedListing.price, selectedListing.unit)}
                </strong>
              </div>

              <h2 className="listing-modal-title">{selectedListing.livestock_type}</h2>
              <p className="listing-modal-subtitle">
                {selectedListing.breed ||
                  (selectedIsLivestock ? "No breed specified" : "No variety specified")}
              </p>

              <div className="listing-modal-meta-line">
                <MapPin size={13} />
                {selectedListing.location}
                {selectedListing.created_at && (
                  <>
                    <span className="meta-divider">·</span>
                    {formatPostedTime(selectedListing.created_at)}
                  </>
                )}
              </div>

              {/* Farm products leave age/size/variety/condition optional,
                  so hide the empty ones instead of showing "N/A". */}
              <div className="listing-modal-stats-bar">
                {(selectedIsLivestock || selectedListing.age) && (
                  <div>
                    <span>Age</span>
                    <strong>{selectedListing.age || "N/A"}</strong>
                  </div>
                )}

                {(selectedIsLivestock || selectedListing.weight) && (
                  <div>
                    <span>{selectedIsLivestock ? "Weight" : "Size / Weight"}</span>
                    <strong>
                      {formatWeight(selectedListing.weight, selectedListing.livestock_type, selectedListing.category) || "N/A"}
                    </strong>
                  </div>
                )}

                {(selectedIsLivestock || selectedListing.breed) && (
                  <div>
                    <span>{selectedIsLivestock ? "Breed" : "Variety"}</span>
                    <strong>{selectedListing.breed || "N/A"}</strong>
                  </div>
                )}

                {!selectedIsLivestock && selectedListing.health_status && (
                  <div>
                    <span>Condition</span>
                    <strong>{selectedListing.health_status}</strong>
                  </div>
                )}

                <div>
                  <span>Available</span>
                  <strong>
                    {selectedListing.quantity > 0
                      ? formatQuantity(selectedListing.quantity, selectedListing.unit)
                      : "Out of stock"}
                  </strong>
                </div>
              </div>

              {selectedListing.description && (
                <p className="listing-modal-description">{selectedListing.description}</p>
              )}

              {parseDocuments(selectedListing.documents).length > 0 && (
                <div className="listing-modal-documents">
                  <h4>Supporting Documents</h4>

                  <div className="listing-modal-documents-list">
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
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Listings;