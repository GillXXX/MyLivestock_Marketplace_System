import { Fragment, useEffect, useRef, useState } from "react";

import {
  Search,
  Filter,
  Heart,
  MapPin,
  ShieldCheck,
  SlidersHorizontal,
  Eye,
  ShoppingCart,
  BadgeCheck,
  Sparkles,
  PackageSearch,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import ListingDetailsModal from "../components/ListingDetailsModal";
import InquiryModal from "../components/InquiryModal";
import BuyNowModal from "../components/BuyNowModal";
import { haversineDistanceKm, formatDistance, useBuyerLocation } from "../utils/geo";
import { API_URL } from "../config";
import {
  LIVESTOCK_TYPES,
  FARM_PRODUCT_TYPES,
  ALL_KNOWN_TYPES,
  getProductIcon,
  formatPrice,
  formatQuantity,
  formatWeight,
  getListingPlaceholder,
} from "../utils/productCatalog";
import "./Marketplace.css";

function isRecentlyPosted(time) {
  if (!time) return false;
  const diffDays = (Date.now() - new Date(time).getTime()) / 86400000;
  return diffDays <= 2;
}

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
  const [showFilters, setShowFilters] = useState(false);
  const filtersRef = useRef(null);
  const [selectedListing, setSelectedListing] = useState(null);
  const [inquiryListing, setInquiryListing] = useState(null);
  const [buyNowListing, setBuyNowListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const { location: buyerLocation, status: locationStatus } = useBuyerLocation();

  const getDistanceKm = (item) => {
    if (!buyerLocation || item.farm_lat == null || item.farm_lng == null) {
      return null;
    }
    return haversineDistanceKm(
      buyerLocation.lat,
      buyerLocation.lng,
      Number(item.farm_lat),
      Number(item.farm_lng)
    );
  };

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
    if (!showFilters) return undefined;

    const handleClickOutside = (e) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target)) {
        setShowFilters(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilters]);

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

    if (livestockType === "Other") {
      results = results.filter((item) => !ALL_KNOWN_TYPES.includes(item.livestock_type));
    } else if (livestockType !== "All Livestock") {
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

    if (sortBy === "Nearest Location") {
      results.sort((a, b) => {
        const da = getDistanceKm(a);
        const db = getDistanceKm(b);
        if (da == null && db == null) return 0;
        if (da == null) return 1;
        if (db == null) return -1;
        return da - db;
      });
    }

    setFilteredListings(results);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, livestockType, priceRange, sortBy, docsOnly, listings, buyerLocation]);

  if (loading) {
    return (
      <div className="marketplace-page">
        <div className="market-skeleton">
          <div className="skel skel-hero"></div>
          <div className="skel skel-toolbar"></div>
          <div className="skel-grid">
            <div className="skel skel-card"></div>
            <div className="skel skel-card"></div>
            <div className="skel skel-card"></div>
            <div className="skel skel-card"></div>
          </div>
        </div>
      </div>
    );
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
            placeholder="Search livestock, eggs, produce, seller..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        <select
          value={priceRange}
          onChange={(e) => setPriceRange(e.target.value)}
        >
          <option>Price Range</option>
          <option>₱1,000 - ₱10,000</option>
          <option>₱10,000 - ₱30,000</option>
          <option>₱30,000 above</option>
        </select>

        <div className="filter-dropdown-wrap" ref={filtersRef}>
          <button
            type="button"
            className={docsOnly || livestockType !== "All Livestock" ? "active" : ""}
            onClick={() => setShowFilters((prev) => !prev)}
          >
            <SlidersHorizontal size={18} />
            Filters
            {(docsOnly || livestockType !== "All Livestock") && (
              <span className="filter-active-dot" />
            )}
          </button>

          {showFilters && (
            <div className="filter-dropdown">
              <div className="filter-title">
                <Filter size={18} />
                <h3>Filters</h3>
              </div>

              {[
                { label: "Livestock", types: LIVESTOCK_TYPES },
                { label: "Farm Products", types: [...FARM_PRODUCT_TYPES, "Other"] },
              ].map((group) => (
                <div className="filter-group" key={group.label}>
                  <label>{group.label}</label>

                  <div className="filter-chip-row">
                    {group.types.map((type) => (
                      <button
                        key={type}
                        type="button"
                        className={`filter-chip ${livestockType === type ? "active" : ""}`}
                        onClick={() =>
                          setLivestockType(livestockType === type ? "All Livestock" : type)
                        }
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="filter-group">
                <label>Verification</label>
                <p className="filter-note">
                  <ShieldCheck size={14} />
                  Sellers verified by MAO are marked with a badge below.
                </p>

                <button
                  type="button"
                  className={`filter-toggle-row ${docsOnly ? "active" : ""}`}
                  onClick={() => setDocsOnly(!docsOnly)}
                  aria-pressed={docsOnly}
                >
                  <span>With health documents</span>
                  <span className="filter-switch" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <main className="market-content">
          <div className="market-section-header">
            <div>
              <h2>
                Available Listings
                {/* Phone-only: the hero that shows this count is hidden there */}
                <span className="market-count">{filteredListings.length}</span>
              </h2>
              <p>Livestock and backyard farm products from verified sellers.</p>
            </div>

            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option>Sort by Newest</option>
              <option>Lowest Price</option>
              <option>Highest Price</option>
              <option>Nearest Location</option>
            </select>
          </div>

          {sortBy === "Nearest Location" &&
            ["denied", "unsupported", "insecure"].includes(locationStatus) && (
              <p className="location-permission-hint">
                <MapPin size={13} />
                Enable location access in your browser to sort by distance.
              </p>
            )}

          <div className="market-grid">
            {filteredListings.length === 0 ? (
              <div className="market-empty-state">
                <PackageSearch size={38} />
                <h3>No livestock listings found</h3>
                <p>Try a different keyword or clear your filters to see more listings.</p>
              </div>
            ) : (
              filteredListings.map((item) => {
                const SpeciesIcon = getProductIcon(item.livestock_type, item.category);
                const metaParts = [formatWeight(item.weight, item.livestock_type, item.category), item.age].filter(Boolean);

                return (
                <div className="market-card" key={item.id}>
                  <div className="market-image">
                    <img
                      src={item.image_url || getListingPlaceholder(item.livestock_type, item.category)}
                      alt={item.breed || item.livestock_type}
                    />

                    <span className="market-type-chip">
                      <SpeciesIcon size={13} />
                      {item.livestock_type}
                    </span>

                    {isRecentlyPosted(item.created_at) && (
                      <span className="market-new-badge">
                        <Sparkles size={11} />
                        New
                      </span>
                    )}

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
                        <h3>{item.breed || item.livestock_type}</h3>
                        <span className="market-price-tag">
                          {formatPrice(item.price, item.unit)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="market-body">
                    <div className="market-meta-row">
                      {metaParts.map((part, index) => (
                        <Fragment key={index}>
                          <span>{part}</span>
                          <span className="meta-divider">•</span>
                        </Fragment>
                      ))}
                      <span
                        className={
                          Number(item.quantity) > 0 ? "" : "market-out-of-stock"
                        }
                      >
                        {Number(item.quantity) > 0
                          ? `${formatQuantity(item.quantity, item.unit)} available`
                          : "Out of stock"}
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
                        {getDistanceKm(item) != null && (
                          <span className="distance-pill">
                            {formatDistance(getDistanceKm(item))}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="market-card-actions">
                      <button
                        className="view-details-btn"
                        type="button"
                        onClick={() => viewListingDetails(item)}
                      >
                        <Eye size={15} />
                        View Details
                      </button>

                      <button
                        className="buy-now-btn"
                        type="button"
                        onClick={() => setBuyNowListing(item)}
                        disabled={Number(item.quantity) <= 0}
                      >
                        <ShoppingCart size={15} />
                        {Number(item.quantity) > 0 ? "Buy Now" : "Out of Stock"}
                      </button>
                    </div>
                  </div>
                </div>
                );
              })
            )}
          </div>
      </main>

      {selectedListing && (
        <ListingDetailsModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          onInquire={(item) => setInquiryListing(item)}
          onBuyNow={(item) => setBuyNowListing(item)}
        />
      )}

      {inquiryListing && (
        <InquiryModal
          listing={inquiryListing}
          onClose={() => setInquiryListing(null)}
        />
      )}

      {buyNowListing && (
        <BuyNowModal
          listing={buyNowListing}
          onClose={() => setBuyNowListing(null)}
        />
      )}
    </div>
  );
}

export default Marketplace;