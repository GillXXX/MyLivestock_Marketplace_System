import { useEffect, useState } from "react";

import {
  ArrowLeft,
  Heart,
  Search,
  Filter,
  MapPin,
  Eye,
  MessageCircle,
  Trash2,
  ShieldCheck,
  TrendingUp,
  Wallet,
  Clock3,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
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
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const defaultImage =
    "https://images.unsplash.com/photo-1500595046743-cd271d694d30?q=80&w=1400&auto=format&fit=crop";

  useEffect(() => {
    fetchFavorites();
  }, []);

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

    setFilteredListings(results);
  }, [searchText, livestockType, status, savedListings]);

  const fetchFavorites = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const res = await fetch("http://localhost:5000/api/favorites", {
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
  };

  const removeFavorite = async (listingId) => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`http://localhost:5000/api/favorites/${listingId}`, {
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

        <button type="button">
          <Filter size={17} />
          Filter
        </button>
      </section>

      <section className="saved-grid">
        {filteredListings.length === 0 ? (
          <h3>No saved livestock yet.</h3>
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
                    <p>{item.seller_name}</p>
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
                    <span>Saved recently</span>
                  </div>
                </div>

                <div className="saved-status-row">
                  <span
                    className={
                      item.status === "Available"
                        ? "saved-status available"
                        : "saved-status pending"
                    }
                  >
                    {item.status}
                  </span>

                  <span className="verified-seller">
                    <ShieldCheck size={14} />
                    Verified seller
                  </span>
                </div>

                <div className="saved-actions">
                  <button className="view-btn" type="button">
                    <Eye size={17} />
                    View Details
                  </button>

                  <button className="message-btn" type="button">
                    <MessageCircle size={17} />
                    Inquire
                  </button>

                  <button
                    className="delete-btn"
                    type="button"
                    onClick={() => removeFavorite(item.id)}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </section>
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