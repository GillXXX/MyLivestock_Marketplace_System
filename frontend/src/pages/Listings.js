import { useEffect, useState } from "react";

import {
  ArrowLeft,
  Search,
  PlusCircle,
  Filter,
  TrendingUp,
  PackageCheck,
  Clock3,
  Wallet,
  MapPin,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const defaultImage =
    "https://images.unsplash.com/photo-1500595046743-cd271d694d30?q=80&w=1400&auto=format&fit=crop";

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const res = await fetch("http://localhost:5000/api/listings/my-listings", {
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

    fetchListings();
  }, [navigate]);

  if (loading) return <h2 style={{ padding: "30px" }}>Loading listings...</h2>;
  if (error) return <h2 style={{ padding: "30px", color: "red" }}>{error}</h2>;

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
          icon={<PackageCheck />}
          value={stats.activeListings}
          label="Active Listings"
          note="Current livestock posts"
        />

        <StatCard
          icon={<Clock3 />}
          value={stats.pendingReview}
          label="Pending Review"
          note="Awaiting verification"
        />

        <StatCard
          icon={<TrendingUp />}
          value={stats.marketplaceViews}
          label="Marketplace Views"
          note="Buyer engagement"
        />

        <StatCard
          icon={<Wallet />}
          value={`₱${Number(stats.estimatedValue).toLocaleString()}`}
          label="Estimated Value"
          note="Combined listing worth"
        />
      </section>

      <section className="toolbar-section">
        <div className="search-box">
          <Search size={18} />
          <input type="text" placeholder="Search livestock..." />
        </div>

        <div className="toolbar-actions">
          <select>
            <option>All Livestock</option>
            <option>Swine</option>
            <option>Cattle</option>
            <option>Goat</option>
            <option>Poultry</option>
          </select>

          <select>
            <option>All Status</option>
            <option>Available</option>
            <option>Pending</option>
            <option>Sold</option>
          </select>

          <button className="filter-btn">
            <Filter size={18} />
            Filters
          </button>
        </div>
      </section>

      <section className="premium-livestock-grid">
        {listings.length === 0 ? (
          <h3>No livestock listings yet.</h3>
        ) : (
          listings.map((item) => (
            <div className="premium-card" key={item.id}>
              <div className="premium-image-wrapper">
                <img src={item.image_url || defaultImage} alt={item.breed} />

                <span className="premium-badge">{item.status}</span>

                <button className="favorite-btn">♡</button>
              </div>

              <div className="premium-card-body">
                <div className="premium-card-top">
                  <div>
                    <h3>{item.breed}</h3>

                    <p>
                      <MapPin size={15} />
                      {item.location} • {item.age}
                    </p>
                  </div>

                  <h2>₱{Number(item.price).toLocaleString()}</h2>
                </div>

                <button className="details-btn">View Details</button>
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
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <h2>{value}</h2>
      <p>{label}</p>
      <small>{note}</small>
    </div>
  );
}

export default Listings;