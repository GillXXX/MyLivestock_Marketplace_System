import { useEffect, useState } from "react";
import {
  ArrowLeft,
  MapPin,
  Search,
  Store,
  Eye,
  MessageCircle,
  Navigation,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import "./BuyerMap.css";

function BuyerMap() {
  const navigate = useNavigate();

  const [listings, setListings] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedListing, setSelectedListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

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

        const res = await fetch("http://localhost:5000/api/marketplace", {
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

        setListings(data.listings);
        setSelectedListing(data.listings[0] || null);
        setLoading(false);
      } catch (error) {
        setMessage("Cannot connect to backend server");
        setLoading(false);
      }
    };

    fetchListings();
  }, [navigate]);

  const filteredListings = listings.filter((item) => {
    const search = searchText.toLowerCase();

    return (
      item.breed?.toLowerCase().includes(search) ||
      item.livestock_type?.toLowerCase().includes(search) ||
      item.location?.toLowerCase().includes(search) ||
      item.seller_name?.toLowerCase().includes(search)
    );
  });

  if (loading) return <h2 style={{ padding: "30px" }}>Loading map explorer...</h2>;
  if (message) return <h2 style={{ padding: "30px", color: "red" }}>{message}</h2>;

  return (
    <div className="buyer-map-page">
      <header className="map-header">
        <div className="header-left">
          <Link to="/buyer-dashboard" className="back-btn">
            <ArrowLeft size={20} />
          </Link>

          <div>
            <span className="page-tag">BUYER MAP EXPLORER</span>
            <h1>Nearby Seller Map</h1>
            <p>
              View livestock sellers and available listings by farm location.
            </p>
          </div>
        </div>
      </header>

      <section className="map-layout">
        <aside className="seller-list-panel">
          <div className="seller-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search seller, livestock, location..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          <div className="seller-count">
            <Store size={18} />
            <span>{filteredListings.length} available seller listings</span>
          </div>

          <div className="seller-list">
            {filteredListings.length === 0 ? (
              <p>No sellers found.</p>
            ) : (
              filteredListings.map((item) => (
                <button
                  className={
                    selectedListing?.id === item.id
                      ? "seller-card active"
                      : "seller-card"
                  }
                  key={item.id}
                  onClick={() => setSelectedListing(item)}
                >
                  <img src={item.image_url || defaultImage} alt={item.breed} />

                  <div>
                    <strong>{item.breed}</strong>
                    <p>{item.livestock_type}</p>

                    <span>
                      <MapPin size={13} />
                      {item.location}
                    </span>

                    <small>Seller: {item.seller_name}</small>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <main className="map-main-panel">
          <div className="map-preview-box">
            <div className="map-bg-grid"></div>

            {filteredListings.slice(0, 8).map((item, index) => (
              <button
                key={item.id}
                className={`map-marker marker-${(index % 8) + 1}`}
                onClick={() => setSelectedListing(item)}
                title={item.location}
              >
                <MapPin size={24} />
              </button>
            ))}

            <div className="map-center-label">
              <Navigation size={22} />
              <strong>Veruela, Agusan del Sur</strong>
              <p>Seller locations preview</p>
            </div>
          </div>

          {selectedListing && (
            <div className="selected-seller-card">
              <img
                src={selectedListing.image_url || defaultImage}
                alt={selectedListing.breed}
              />

              <div className="selected-info">
                <span>{selectedListing.livestock_type}</span>
                <h2>{selectedListing.breed}</h2>
                <p>
                  <MapPin size={15} />
                  {selectedListing.location}
                </p>

                <strong>
                  ₱{Number(selectedListing.price).toLocaleString()}
                </strong>

                <small>Seller: {selectedListing.seller_name}</small>
              </div>

              <div className="selected-actions">
                <button>
                  <Eye size={17} />
                  View Details
                </button>

                <button className="inquire-btn">
                  <MessageCircle size={17} />
                  Inquire
                </button>
              </div>
            </div>
          )}
        </main>
      </section>
    </div>
  );
}

export default BuyerMap;