import { X, BadgeCheck, MapPin, FileText, MessageCircle, ShoppingCart } from "lucide-react";
import { isLivestock, formatPrice, formatQuantity, formatWeight, getListingPlaceholder } from "../utils/productCatalog";
import { getDocumentLabel } from "../utils/livestockDocRequirements";
import { useNavigate } from "react-router-dom";
import "./ListingDetailsModal.css";

function parseDocuments(documents) {
  if (!documents) return [];

  try {
    const parsed = JSON.parse(documents);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function formatPostedTime(time) {
  if (!time) return "";

  const diffDays = Math.floor((Date.now() - new Date(time).getTime()) / 86400000);

  if (diffDays <= 0) return "Posted today";
  if (diffDays === 1) return "Posted yesterday";
  if (diffDays < 30) return `Posted ${diffDays} days ago`;

  return `Posted ${new Date(time).toLocaleDateString()}`;
}

function ListingDetailsModal({ listing, onClose, onInquire, onBuyNow }) {
  const navigate = useNavigate();
  const documents = parseDocuments(listing.documents);
  const isProduct = !isLivestock(listing.livestock_type, listing.category);
  const title = listing.breed || listing.livestock_type;

  // Live animals always show every stat (N/A when blank); farm products
  // only show the optional fields the farmer actually filled in.
  const stats = [
    { label: "Age", value: listing.age, show: !isProduct || listing.age },
    {
      label: isProduct ? "Size" : "Weight",
      value: formatWeight(listing.weight, listing.livestock_type, listing.category),
      show: !isProduct || listing.weight,
    },
    {
      label: isProduct ? "Condition" : "Health",
      value: listing.health_status,
      show: !isProduct || listing.health_status,
    },
  ].filter((stat) => stat.show);

  const goToSellerProfile = () => {
    if (!listing.seller_id) return;
    onClose();
    navigate(`/seller/${listing.seller_id}`);
  };

  return (
    <div className="details-modal-overlay" onClick={onClose}>
      <div className="details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="details-modal-media">
          <div className="details-modal-media-scroll">
            <img src={listing.image_url || getListingPlaceholder(listing.livestock_type, listing.category)} alt={title} />
          </div>

          <button className="details-modal-close" type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="details-modal-body">
          <div className="details-modal-top-row">
            <span className="details-modal-status">{listing.livestock_type}</span>

            <strong className="details-modal-price-inline">
              {formatPrice(listing.price, listing.unit)}
            </strong>
          </div>

          <h2 className="details-modal-title">{title}</h2>

          <div className="details-modal-meta-line">
            <MapPin size={13} />
            {listing.location}
            {listing.created_at && (
              <>
                <span className="meta-divider">·</span>
                {formatPostedTime(listing.created_at)}
              </>
            )}
          </div>

          <div className="details-modal-stats-bar">
            {stats.map((stat) => (
              <div key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value || "N/A"}</strong>
              </div>
            ))}

            <div>
              <span>Available</span>
              <strong>
                {listing.quantity > 0
                  ? formatQuantity(listing.quantity, listing.unit)
                  : "Out of stock"}
              </strong>
            </div>
          </div>

          {listing.description && (
            <p className="details-modal-description">{listing.description}</p>
          )}

          {documents.length > 0 && (
            <div className="details-modal-documents">
              <h4>Supporting Documents</h4>

              <div className="details-modal-documents-list">
                {documents.map((docUrl, index) => (
                  <a key={index} href={docUrl} target="_blank" rel="noopener noreferrer">
                    <FileText size={16} />
                    {getDocumentLabel(listing.livestock_type, listing.category, index, documents.length)}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="details-modal-seller">
            <button
              type="button"
              className="details-modal-seller-link"
              onClick={goToSellerProfile}
              disabled={!listing.seller_id}
            >
              <span className="details-modal-seller-avatar">
                {listing.seller_avatar ? (
                  <img src={listing.seller_avatar} alt={listing.seller_name} />
                ) : (
                  listing.seller_name?.charAt(0) || "?"
                )}
              </span>

              <div>
                <strong>
                  {listing.seller_name}
                  {listing.seller_verified && (
                    <BadgeCheck size={14} className="details-modal-seller-check" />
                  )}
                </strong>
                <p>
                  {listing.seller_verified
                    ? "MAO-verified seller"
                    : "Verification pending"}
                  {listing.location && (
                    <>
                      <span className="meta-divider">·</span>
                      <MapPin size={12} className="details-modal-seller-pin" />
                      {listing.location}
                    </>
                  )}
                </p>
              </div>
            </button>

            <div className="details-modal-seller-actions">
              {onInquire && (
                <button type="button" onClick={() => onInquire(listing)}>
                  <MessageCircle size={16} />
                  Inquire
                </button>
              )}

              {onBuyNow && (
                <button
                  type="button"
                  className="details-modal-buy-now"
                  onClick={() => onBuyNow(listing)}
                  disabled={Number(listing.quantity) <= 0}
                >
                  <ShoppingCart size={16} />
                  {Number(listing.quantity) > 0 ? "Buy Now" : "Out of Stock"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ListingDetailsModal;
