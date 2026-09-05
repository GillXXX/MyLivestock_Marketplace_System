import { useCallback, useEffect, useState } from "react";

import {
  ArrowLeft,
  Heart,
  Search,
  MapPin,
  MessageCircle,
  Trash2,
  ShieldCheck,
  TrendingUp,
  Wallet,
  Clock3,
  Store,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import ListingDetailsModal from "../components/ListingDetailsModal";
import InquiryModal from "../components/InquiryModal";
import { API_URL } from "../config";
import "./BuyerFavorites.css";

function BuyerFavorites() {
  const navigate = useNavigate();

  const [savedListings, setSavedListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [stats, setStats] = useState({
    savedListings: 0,
    verifiedSellers: 0,
    savedValue: 0,
    activeInquiries: 0,
  });

  const [searchText, setSearchText] = useState("");
  const [livestockType, setLivestockType] = useState("All Livestock");
  const [status, setStatus] = useState("All Status");
  const [sortBy, setSortBy] = useState("Recently Saved");
  const [detailsListing, setDetailsListing] = useState(null);
  const [inquiryListing, setInquiryListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const defaultImage =
    "https://images.unsplash.com/photo-1500595046743-cd271d694d30?q=80&w=1400&auto=format&fit=crop";

  const formatSavedTime = (time) => {
    if (!time) return "Saved recently";

    const diffDays = Math.floor((Date.now() - new Date(time).getTime()) / 86400000);

    if (diffDays <= 0) return "Saved today";
    if (diffDays === 1) return "Saved yesterday";
    if (diffDays < 30) return `Saved ${diffDays}d ago`;

    return `Saved ${new Date(time).toLocaleDateString()}`;
  };

  const fetchFavorites = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const res = await fetch(`${API_URL}/api/favorites`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Failed to load saved listings");
        setLoading(false);
        return;
      }

      setSavedListings(data.favorites);
      setFilteredListings(data.favorites);
      setStats(data.stats);
      setLoading(false);
    } catch (error) {
      setMessage("Cannot connect to backend server");
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  useEffect(() => {
    let results = [...savedListings];

    if (searchText.trim() !== "") {
      const search = searchText.toLowerCase();

      results = results.filter(
        (item) =>
          item.breed?.toLowerCase().includes(search) ||
          item.livestock_type?.toLowerCase().includes(search) ||
          item.location?.toLowerCase().includes(search) ||
          item.seller_name?.toLowerCase().includes(search)
      );
    }

    if (livestockType !== "All Livestock") {
      results = results.filter((item) => item.livestock_type === livestockType);
    }

    if (status !== "All Status") {
      results = results.filter((item) => item.status === status);
    }

    if (sortBy === "Lowest Price") {
      results.sort((a, b) => Number(a.price) - Number(b.price));
    }

    if (sortBy === "Highest Price") {
      results.sort((a, b) => Number(b.price) - Number(a.price));
    }

    if (sortBy === "Recently Saved") {
      results.sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at));
    }

    setFilteredListings(results);
  }, [searchText, livestockType, status, sortBy, savedListings]);

  const removeFavorite = async (listingId) => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/favorites/${listingId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to remove favorite");
        return;
      }

      setSavedListings((prev) => prev.filter((item) => item.id !== listingId));
    } catch (error) {
      alert("Cannot connect to backend server");
    }
  };

  const getStatusClass = (itemStatus) => {
    if (itemStatus === "Available") return "saved-status available";
    if (itemStatus === "Sold") return "saved-status sold";
    return "saved-status pending";
  };

  const goToSellerProfile = (item) => {
    if (!item.seller_id) return;
    navigate(`/seller/${item.seller_id}`);
  };

  const handleViewDetails = (item) => {
    setDetailsListing(item);

    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${API_URL}/api/marketplace/${item.id}/view`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  };

  if (loading) {
    return <h2 style={{ padding: "30px" }}>Loading saved listings...</h2>;
  }

  if (message) {
    return <h2 style={{ padding: "30px", color: "red" }}>{message}</h2>;
  }

  return (
    <div className="buyer-favorites-page">
      <div className="favorites-header">
        <div className="header-left">
          <Link to="/buyer-dashboard" className="back-btn">
            <ArrowLeft size={20} />
          </Link>

          <div>
            <span className="page-tag">BUYER SAVED LISTINGS</span>
            <h1>Saved Livestock</h1>
            <p>
              Review your favorite livestock listings, compare prices, and contact
              verified sellers.
            </p>
          </div>
        </div>
      </div>

      <section className="favorites-stats">
        <StatCard
          icon={<Heart />}
          value={stats.savedListings}
          label="Saved Listings"
          note="Your watchlist"
        />

        <StatCard
          icon={<ShieldCheck />}
          value={stats.verifiedSellers}
          label="Verified Sellers"
          note="MAO monitored"
        />

        <StatCard
          icon={<Wallet />}
          value={`₱${Number(stats.savedValue).toLocaleString()}`}
          label="Saved Value"
          note="Total estimate"
        />

        <StatCard
          icon={<TrendingUp />}
          value={stats.activeInquiries}
          label="Active Inquiries"
          note="From saved items"
        />
      </section>

      <section className="favorites-toolbar">
        <div className="favorites-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search saved livestock..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        <select
          value={livestockType}
          onChange={(e) => setLivestockType(e.target.value)}
        >
          <option>All Livestock</option>
          <option>Swine</option>
          <option>Cattle</option>
          <option>Goat</option>
          <option>Poultry</option>
        </select>

        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option>All Status</option>
          <option>Available</option>
          <option>Pending</option>
          <option>Sold</option>
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option>Recently Saved</option>
          <option>Lowest Price</option>
          <option>Highest Price</option>
        </select>
      </section>

      <section className="saved-grid">
        {filteredListings.length === 0 ? (
          <div className="saved-empty">
            <Heart size={32} />
            <h3>
              {savedListings.length === 0
                ? "No saved livestock yet"
                : "No saved listings match your filters"}
            </h3>
            <p>
              {savedListings.length === 0
                ? "Listings you favorite in the Marketplace will show up here."
                : "Try adjusting your search or filters."}
            </p>
            {savedListings.length === 0 && (
              <Link to="/marketplace" className="saved-empty-cta">
                <Store size={16} />
                Browse Marketplace
              </Link>
            )}
          </div>
        ) : (
          filteredListings.map((item) => (
            <div className="saved-card" key={item.id}>
              <div className="saved-image">
                <img src={item.image_url || defaultImage} alt={item.breed} />

                <span className="saved-type">{item.livestock_type}</span>

                <button
                  className="remove-heart"
                  type="button"
                  onClick={() => removeFavorite(item.id)}
                >
                  <Heart size={18} fill="currentColor" />
                </button>
              </div>

              <div className="saved-body">
                <div className="saved-title">
                  <div>
                    <h3>{item.breed}</h3>
                    <button
                      type="button"
                      className="saved-seller-link"
                      onClick={() => goToSellerProfile(item)}
                      disabled={!item.seller_id}
                    >
                      {item.seller_name}
                    </button>
                  </div>

                  <strong>₱{Number(item.price).toLocaleString()}</strong>
                </div>

                <div className="saved-meta">
                  <div>
                    <MapPin size={16} />
                    <span>{item.location}</span>
                  </div>

                  <div>
                    <Clock3 size={16} />
                    <span>{formatSavedTime(item.saved_at)}</span>
                  </div>
                </div>

                <div className="saved-status-row">
                  <span className={getStatusClass(item.status)}>{item.status}</span>

                  {item.seller_verified ? (
                    <span className="verified-seller">
                      <ShieldCheck size={14} />
                      Verified seller
                    </span>
                  ) : (
                    <span className="verified-seller pending">
                      <ShieldCheck size={14} />
                      Verification pending
                    </span>
                  )}
                </div>

                <div className="saved-actions">
                  <button
                    className="view-btn"
                    type="button"
                    onClick={() => handleViewDetails(item)}
                  >
                    View Details
                  </button>

                  <button
                    className="message-btn"
                    type="button"
                    onClick={() => setInquiryListing(item)}
                  >
                    <MessageCircle size={16} />
                  </button>

                  <button
                    className="delete-btn"
                    type="button"
                    onClick={() => removeFavorite(item.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      {detailsListing && (
        <ListingDetailsModal
          listing={detailsListing}
          onClose={() => setDetailsListing(null)}
          onInquire={(item) => setInquiryListing(item)}
        />
      )}

      {inquiryListing && (
        <InquiryModal
          listing={inquiryListing}
          onClose={() => setInquiryListing(null)}
        />
      )}
    </div>
  );
}

function StatCard({ icon, value, label, note }) {
  return (
    <div className="favorite-stat-card">
      <div className="favorite-stat-icon">{icon}</div>
      <h2>{value}</h2>
      <p>{label}</p>
      <small>{note}</small>
    </div>
  );
}

export default BuyerFavorites;