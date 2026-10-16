import { useEffect, useState } from "react";

import { ArrowLeft, MapPin, BadgeCheck, Navigation } from "lucide-react";
import { getProductIcon, formatPrice, getListingPlaceholder } from "../utils/productCatalog";

import { useNavigate, useParams } from "react-router-dom";
import ListingDetailsModal from "../components/ListingDetailsModal";
import InquiryModal from "../components/InquiryModal";
import BuyNowModal from "../components/BuyNowModal";
import LeafletMap from "../utils/LeafletMap";
import escapeHtml from "../utils/escapeHtml";
import { haversineDistanceKm, formatDistance, useBuyerLocation, APPROXIMATE_FARM_RADIUS_M } from "../utils/geo";
import { API_URL } from "../config";
import ListingReviewBadge, { isMaoApproved } from "../components/ListingReviewBadge";
import "./SellerProfile.css";

function SellerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [seller, setSeller] = useState(null);
  const [listings, setListings] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [inquiryListing, setInquiryListing] = useState(null);
  const [buyNowListing, setBuyNowListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { location: buyerLocation } = useBuyerLocation();

  useEffect(() => {
    const fetchSellerProfile = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const res = await fetch(`${API_URL}/api/marketplace/sellers/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.message || "Failed to load seller profile");
          setLoading(false);
          return;
        }

        setSeller(data.seller);
        setListings(data.listings);
        setLoading(false);
      } catch (err) {
        setError("Cannot connect to backend server");
        setLoading(false);
      }
    };

    fetchSellerProfile();
  }, [id, navigate]);

  const openListing = (item) => {
    setSelectedListing({
      ...item,
      seller_id: seller.id,
      seller_name: seller.full_name,
      seller_verified: seller.is_verified,
      seller_avatar: seller.profile_image,
    });
  };

  if (loading) return <h2 style={{ padding: "30px" }}>Loading seller profile...</h2>;
  if (error) return <h2 style={{ padding: "30px", color: "red" }}>{error}</h2>;

  const memberSince = seller.created_at
    ? new Date(seller.created_at).getFullYear()
    : null;

  const hasPin = seller.farm_lat != null && seller.farm_lng != null;

  const distanceFromYou =
    hasPin && buyerLocation
      ? haversineDistanceKm(
          buyerLocation.lat,
          buyerLocation.lng,
          Number(seller.farm_lat),
          Number(seller.farm_lng)
        )
      : null;

  return (
    <div className="seller-profile-page">
      <div className="seller-profile-header">
        <button className="back-btn" type="button" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>

        <span className="page-tag">SELLER PROFILE</span>
      </div>

      <section className="seller-card">
        <div className="seller-card-avatar">
          {seller.profile_image ? (
            <img src={seller.profile_image} alt={seller.full_name} />
          ) : (
            seller.full_name?.charAt(0) || "?"
          )}
        </div>

        <div className="seller-card-info">
          <h1>
            {seller.full_name}
            {seller.is_verified && (
              <span className="seller-verified-badge">
                <BadgeCheck size={16} />
                MAO Verified
              </span>
            )}
          </h1>

          <p className="seller-card-location">
            <MapPin size={14} />
            {seller.farm_location || seller.location || "Location not set"}
          </p>

          {memberSince && <p className="seller-card-member">Member since {memberSince}</p>}

          {seller.about && <p className="seller-card-about">{seller.about}</p>}
        </div>

        <div className="seller-card-stats">
          <strong>{listings.length}</strong>
          <span>Active Listings</span>
        </div>
      </section>

      <section className="seller-map-section">
        <h2>
          <Navigation size={16} />
          Farm Location
          {distanceFromYou != null && (
            <span className="seller-distance-badge">
              {formatDistance(distanceFromYou)}
            </span>
          )}
        </h2>

        {hasPin ? (
          <div className="seller-map-box">
            <LeafletMap
              center={[Number(seller.farm_lat), Number(seller.farm_lng)]}
              zoom={14}
              height="260px"
              layerToggle
              markers={[
                {
                  id: seller.id,
                  lat: Number(seller.farm_lat),
                  lng: Number(seller.farm_lng),
                  color: "#d7a24d",
                  shape: "pin",
                  pulse: true,
                  areaRadius: seller.farm_location_approximate ? APPROXIMATE_FARM_RADIUS_M : 0,
                  popupHtml: `
                    <div class="map-popup">
                      <strong>${escapeHtml(seller.full_name)}</strong>
                      <span>${escapeHtml(seller.farm_location || seller.location || "")}</span>
                      ${
                        distanceFromYou != null
                          ? `<span>${escapeHtml(formatDistance(distanceFromYou))} from you</span>`
                          : ""
                      }
                    </div>
                  `,
                },
              ]}
            />
            {seller.farm_location_approximate && (
              <p className="seller-map-note">
                Approximate location: the farm is inside the shaded circle, within{" "}
                {APPROXIMATE_FARM_RADIUS_M} m of the pin. The exact spot is shared once you and the
                seller agree on a deal.
              </p>
            )}
          </div>
        ) : (
          <p className="seller-map-empty">
            This seller hasn't pinned their farm location on the map yet.
          </p>
        )}
      </section>

      <section className="seller-listings-section">
        <h2>Listings from {seller.full_name}</h2>

        {listings.length === 0 ? (
          <p className="seller-listings-empty">No active listings right now.</p>
        ) : (
          <div className="seller-listings-grid">
            {listings.map((item) => {
              const TypeIcon = getProductIcon(item.livestock_type, item.category);

              return (
              <div className="seller-listing-card" key={item.id}>
                <div className="seller-listing-image">
                  <img src={item.image_url || getListingPlaceholder(item.livestock_type, item.category)} alt={item.breed || item.livestock_type} />

                  <span className="seller-listing-type">
                    <TypeIcon size={12} />
                    {item.livestock_type}
                  </span>

                  {isMaoApproved(item) && (
                    <span className="seller-listing-review">
                      <ListingReviewBadge listing={item} />
                    </span>
                  )}
                </div>

                <div className="seller-listing-body">
                  <div className="seller-listing-heading">
                    <h3>{item.breed || item.livestock_type}</h3>
                    <span>{formatPrice(item.price, item.unit)}</span>
                  </div>

                  <p className="seller-listing-meta">
                    <MapPin size={12} />
                    {item.location}
                    {item.age && (
                      <>
                        <span className="meta-divider">•</span>
                        {item.age}
                      </>
                    )}
                  </p>

                  <button
                    className="seller-listing-details-btn"
                    type="button"
                    onClick={() => openListing(item)}
                  >
                    View Details
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </section>

      {selectedListing && (
        <ListingDetailsModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          onInquire={(item) => setInquiryListing(item)}
          onBuyNow={(item) => setBuyNowListing(item)}
        />
      )}

      {inquiryListing && (
        <InquiryModal listing={inquiryListing} onClose={() => setInquiryListing(null)} />
      )}

      {buyNowListing && (
        <BuyNowModal listing={buyNowListing} onClose={() => setBuyNowListing(null)} />
      )}
    </div>
  );
}

export default SellerProfile;
