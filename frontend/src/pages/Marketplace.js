import { useEffect, useState } from "react";

import {
  Search,
  Filter,
  Heart,
  MapPin,
  ShieldCheck,
  SlidersHorizontal,
  Eye,
  Wallet,
  Weight,
  Calendar,
  BadgeCheck,
  PawPrint,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import ListingDetailsModal from "../components/ListingDetailsModal";
import InquiryModal from "../components/InquiryModal";
import MakeOfferModal from "../components/MakeOfferModal";
import { API_URL } from "../config";
import "./Marketplace.css";

function Marketplace() {
  const navigate = useNavigate();

  const [listings, setListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);

  const [searchText, setSearchText] = useState("");
  const [livestockType, setLivestockType] = useState("All Livestock");
  const [priceRange, setPriceRange] = useState("Price Range");
  const [sortBy, setSortBy] = useState("Sort by Newest");
  const [docsOnly, setDocsOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [selectedListing, setSelectedListing] = useState(null);
  const [inquiryListing, setInquiryListing] = useState(null);
  const [offerListing, setOfferListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const defaultImage =
    "https://images.unsplash.com/photo-1500595046743-cd271d694d30?q=80&w=1400&auto=format&fit=crop";

  const addToFavorites = async (listingId) => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const res = await fetch(`${API_URL}/api/favorites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ listingId }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to add favorite");
        return;
      }

      setFavoriteIds((prev) =>
        prev.includes(listingId) ? prev : [...prev, listingId]
      );

      alert("Added to favorites ❤️");
    } catch (error) {
      alert("Cannot connect to backend server");
    }
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

  const viewListingDetails = (item) => {
    setSelectedListing(item);

    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${API_URL}/api/marketplace/${item.id}/view`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  };

  useEffect(() => {
    const fetchMarketplaceListings = async () => {
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
          setMessage(data.message || "Failed to load marketplace");
          setLoading(false);
          return;
        }

        setListings(data.listings);
        setFilteredListings(data.listings);
        setLoading(false);
      } catch (error) {
        setMessage("Cannot connect to backend server");
        setLoading(false);
      }
    };

    fetchMarketplaceListings();
  }, [navigate]);

  useEffect(() => {
    let results = [...listings];

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

    if (priceRange === "₱1,000 - ₱10,000") {
      results = results.filter(
        (item) =>
          Number(item.price) >= 1000 && Number(item.price) <= 10000
      );
    }

    if (priceRange === "₱10,000 - ₱30,000") {
      results = results.filter(
        (item) =>
          Number(item.price) > 10000 && Number(item.price) <= 30000
      );
    }

    if (priceRange === "₱30,000 above") {
      results = results.filter((item) => Number(item.price) > 30000);
    }

    if (docsOnly) {
      results = results.filter((item) => parseDocuments(item.documents).length > 0);
    }

    if (sortBy === "Lowest Price") {
      results.sort((a, b) => Number(a.price) - Number(b.price));
    }

    if (sortBy === "Highest Price") {
      results.sort((a, b) => Number(b.price) - Number(a.price));
    }

    if (sortBy === "Sort by Newest") {
      results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    setFilteredListings(results);
  }, [searchText, livestockType, priceRange, sortBy, docsOnly, listings]);

  if (loading) {
    return <h2 style={{ padding: "30px" }}>Loading marketplace...</h2>;
  }

  if (message) {
    return <h2 style={{ padding: "30px", color: "red" }}>{message}</h2>;
  }

  return (
    <div className="marketplace-page">
      <section className="market-hero">
        <div>
          <span>BUYER MARKETPLACE</span>
          <h1>Find verified livestock from local farmers.</h1>
          <p>
            Browse swine, cattle, goats, and poultry listings with transparent
            pricing, seller information, and farm location visibility.
          </p>
        </div>

        <div className="hero-card">
          <h3>{filteredListings.length}</h3>
          <p>Available Listings</p>
        </div>
      </section>

      <section className="market-toolbar">
        <div className="market-search">
          <Search size={20} />

          <input
            placeholder="Search livestock, breed, seller, or location..."
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

        <select
          value={priceRange}
          onChange={(e) => setPriceRange(e.target.value)}
        >
          <option>Price Range</option>
          <option>₱1,000 - ₱10,000</option>
          <option>₱10,000 - ₱30,000</option>
          <option>₱30,000 above</option>
        </select>

        <button type="button" onClick={() => setShowFilters((prev) => !prev)}>
          <SlidersHorizontal size={18} />
          {showFilters ? "Hide Filters" : "Filters"}
        </button>
      </section>

      <section className="market-layout">
        {showFilters && (
        <aside className="filter-panel">
          <div className="filter-title">
            <Filter size={20} />
            <h3>Filters</h3>
          </div>

          <div className="filter-group">
            <label>Livestock Type</label>

            <div>
              <input
                type="checkbox"
                checked={livestockType === "Swine"}
                onChange={() =>
                  setLivestockType(
                    livestockType === "Swine" ? "All Livestock" : "Swine"
                  )
                }
              />{" "}
              Swine
            </div>

            <div>
              <input
                type="checkbox"
                checked={livestockType === "Cattle"}
                onChange={() =>
                  setLivestockType(
                    livestockType === "Cattle" ? "All Livestock" : "Cattle"
                  )
                }
              />{" "}
              Cattle
            </div>

            <div>
              <input
                type="checkbox"
                checked={livestockType === "Goat"}
                onChange={() =>
                  setLivestockType(
                    livestockType === "Goat" ? "All Livestock" : "Goat"
                  )
                }
              />{" "}
              Goat
            </div>

            <div>
              <input
                type="checkbox"
                checked={livestockType === "Poultry"}
                onChange={() =>
                  setLivestockType(
                    livestockType === "Poultry" ? "All Livestock" : "Poultry"
                  )
                }
              />{" "}
              Poultry
            </div>
          </div>

          <div className="filter-group">
            <label>Verification</label>
            <p className="filter-note">
              <ShieldCheck size={14} />
              Sellers verified by MAO are marked with a badge below.
            </p>
            <div>
              <input
                type="checkbox"
                checked={docsOnly}
                onChange={(e) => setDocsOnly(e.target.checked)}
              />{" "}
              With health documents
            </div>
          </div>
        </aside>
        )}

        <main className="market-content">
          <div className="market-section-header">
            <div>
              <h2>Available Livestock</h2>
              <p>Showing verified marketplace listings for buyers.</p>
            </div>

            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option>Sort by Newest</option>
              <option>Lowest Price</option>
              <option>Highest Price</option>
              <option>Nearest Location</option>
            </select>
          </div>

          <div className="market-grid">
            {filteredListings.length === 0 ? (
              <h3>No livestock listings found.</h3>
            ) : (
              filteredListings.map((item) => (
                <div className="market-card" key={item.id}>
                  <div className="market-image">
                    <img
                      src={item.image_url || defaultImage}
                      alt={item.breed}
                    />

                    <span className="market-type-chip">
                      <PawPrint size={13} />
                      {item.livestock_type}
                    </span>

                    <button
                      className="heart-btn"
                      type="button"
                      onClick={() => addToFavorites(item.id)}
                    >
                      <Heart
                        size={16}
                        fill={
                          favoriteIds.includes(item.id)
                            ? "currentColor"
                            : "none"
                        }
                        color={
                          favoriteIds.includes(item.id)
                            ? "red"
                            : "currentColor"
                        }
                      />
                    </button>

                    <div className="market-image-overlay">
                      <div className="market-overlay-text">
                        <h3>{item.breed}</h3>
                        <span className="market-price-tag">
                          ₱{Number(item.price).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="market-body">
                    <div className="market-meta-row">
                      <span>
                        <Weight size={14} />
                        {item.weight || "N/A"}
                      </span>
                      <span className="meta-divider">•</span>
                      <span>
                        <Calendar size={14} />
                        {item.age || "N/A"}
                      </span>
                    </div>

                    <div className="market-divider" />

                    <div className="seller-row">
                      <span className="seller-avatar">
                        {item.seller_name?.charAt(0) || "?"}
                      </span>

                      <div className="seller-row-info">
                        <strong>
                          {item.seller_name}
                          {item.seller_verified && (
                            <BadgeCheck size={14} className="seller-verified-icon" />
                          )}
                        </strong>
                        <p>
                          <MapPin size={13} />
                          {item.location}
                        </p>
                      </div>
                    </div>

                    <button
                      className="view-details-btn"
                      type="button"
                      onClick={() => viewListingDetails(item)}
                    >
                      <Eye size={18} />
                      View Details
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </section>

      {selectedListing && (
        <ListingDetailsModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          onInquire={(item) => setInquiryListing(item)}
          extraActions={
            <button
              type="button"
              className="secondary-action"
              onClick={() => setOfferListing(selectedListing)}
            >
              <Wallet size={16} />
              Make an Offer
            </button>
          }
        />
      )}

      {inquiryListing && (
        <InquiryModal
          listing={inquiryListing}
          onClose={() => setInquiryListing(null)}
        />
      )}

      {offerListing && (
        <MakeOfferModal
          listing={offerListing}
          onClose={() => setOfferListing(null)}
        />
      )}
    </div>
  );
}

export default Marketplace;