import { useEffect, useMemo, useRef, useState } from "react";
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
import LeafletMap from "../utils/LeafletMap";
import escapeHtml from "../utils/escapeHtml";
import ListingDetailsModal from "../components/ListingDetailsModal";
import InquiryModal from "../components/InquiryModal";
import {
  VERUELA_CENTER,
  VERUELA_BOUNDARY_GEOJSON,
  VERUELA_BARANGAYS,
} from "../utils/veruelaGeo";
import { API_URL } from "../config";
import "./BuyerMap.css";

function BuyerMap() {
  const navigate = useNavigate();
  const mapRef = useRef(null);

  const [listings, setListings] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedListing, setSelectedListing] = useState(null);
  const [detailsListing, setDetailsListing] = useState(null);
  const [inquiryListing, setInquiryListing] = useState(null);
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

        const res = await fetch(`${API_URL}/api/marketplace`, {
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

  const filteredListings = useMemo(
    () =>
      listings.filter((item) => {
        const search = searchText.toLowerCase();

        return (
          item.breed?.toLowerCase().includes(search) ||
          item.livestock_type?.toLowerCase().includes(search) ||
          item.location?.toLowerCase().includes(search) ||
          item.seller_name?.toLowerCase().includes(search)
        );
      }),
    [listings, searchText]
  );

  const pinnedListings = useMemo(
    () =>
      filteredListings.filter(
        (item) => item.farm_lat != null && item.farm_lng != null
      ),
    [filteredListings]
  );

  const mapMarkers = useMemo(
    () =>
      pinnedListings.map((item) => ({
        id: item.id,
        lat: Number(item.farm_lat),
        lng: Number(item.farm_lng),
        color: selectedListing?.id === item.id ? "#d7a24d" : "#b8842c",
        pulse: selectedListing?.id === item.id,
        shape: "pin",
        popupHtml: `
          <div class="map-popup">
            <strong>${escapeHtml(item.breed || item.livestock_type)}</strong>
            <span>${escapeHtml(item.location || "No address")}</span>
            <span>Seller: ${escapeHtml(item.seller_name || "Unknown")}</span>
            <span>₱${Number(item.price).toLocaleString()}</span>
          </div>
        `,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pinnedListings, selectedListing]
  );

  const handleSelectListing = (item) => {
    setSelectedListing(item);

    if (item.farm_lat != null && item.farm_lng != null) {
      mapRef.current?.flyTo(Number(item.farm_lat), Number(item.farm_lng), 15);
    }
  };

  useEffect(() => {
    if (selectedListing?.farm_lat != null && selectedListing?.farm_lng != null) {
      mapRef.current?.openPopup(selectedListing.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedListing?.id]);

  const handleViewDetails = (item) => {
    setDetailsListing(item);

    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${API_URL}/api/marketplace/${item.id}/view`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  };

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

        <div className="header-stat">
          <Navigation size={16} />
          <span>
            {pinnedListings.length} of {filteredListings.length} sellers pinned
          </span>
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
              <div className="seller-list-empty">
                <Search size={26} />
                <p>No sellers found</p>
                <span>Try a different search term.</span>
              </div>
            ) : (
              filteredListings.map((item) => (
                <button
                  className={
                    selectedListing?.id === item.id
                      ? "seller-card active"
                      : "seller-card"
                  }
                  key={item.id}
                  onClick={() => handleSelectListing(item)}
                >
                  <img src={item.image_url || defaultImage} alt={item.breed} />

                  <div className="seller-card-body">
                    <div className="seller-card-top">
                      <strong>{item.breed}</strong>
                      <span className="seller-price">
                        ₱{Number(item.price).toLocaleString()}
                      </span>
                    </div>

                    <p>{item.livestock_type}</p>

                    <span className="seller-location">
                      <MapPin size={13} />
                      {item.location}
                    </span>

                    <div className="seller-card-footer">
                      <small>Seller: {item.seller_name}</small>
                      {item.farm_lat == null && (
                        <span className="unpinned-badge">Unpinned</span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <main className="map-main-panel">
          <div className="map-card-heading">
            <div>
              <h3>Seller Location Map</h3>
              <p>
                {pinnedListings.length} of {filteredListings.length} matching
                sellers have a pinned farm location.
              </p>
            </div>

            <div className="map-legend">
              <span>
                <i className="legend-dot"></i>Farm pin
              </span>
              <span>
                <i className="legend-dot active"></i>Selected
              </span>
            </div>
          </div>

          <div className="map-preview-box">
            <LeafletMap
              ref={mapRef}
              center={VERUELA_CENTER}
              zoom={12}
              height="520px"
              markers={mapMarkers}
              barangayLabels={VERUELA_BARANGAYS}
              boundary={VERUELA_BOUNDARY_GEOJSON}
              layerToggle
            />
          </div>

          {pinnedListings.length === 0 && (
            <div className="map-empty-hint">
              <Navigation size={16} />
              <span>None of the matching sellers have a pinned farm location yet.</span>
            </div>
          )}

          {selectedListing && (
            <div className="selected-seller-card">
              <img
                src={selectedListing.image_url || defaultImage}
                alt={selectedListing.breed}
              />

              <div className="selected-info">
                <span className="selected-type-badge">
                  {selectedListing.livestock_type}
                </span>
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
                <button
                  type="button"
                  onClick={() => handleViewDetails(selectedListing)}
                >
                  <Eye size={17} />
                  View Details
                </button>

                <button
                  type="button"
                  className="inquire-btn"
                  onClick={() => setInquiryListing(selectedListing)}
                >
                  <MessageCircle size={17} />
                  Inquire
                </button>
              </div>
            </div>
          )}
        </main>
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

export default BuyerMap;
