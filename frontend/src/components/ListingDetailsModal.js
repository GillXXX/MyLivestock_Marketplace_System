import { X, BadgeCheck, MapPin, FileText, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./ListingDetailsModal.css";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1500595046743-cd271d694d30?q=80&w=1400&auto=format&fit=crop";

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

function ListingDetailsModal({ listing, onClose, onInquire, extraActions }) {
  const navigate = useNavigate();
  const documents = parseDocuments(listing.documents);

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
            <img src={listing.image_url || DEFAULT_IMAGE} alt={listing.breed} />
          </div>

          <button className="details-modal-close" type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="details-modal-body">
          <div className="details-modal-top-row">
            <span className="details-modal-status">{listing.livestock_type}</span>

            <strong className="details-modal-price-inline">
              ₱{Number(listing.price).toLocaleString()}
            </strong>
          </div>

          <h2 className="details-modal-title">{listing.breed}</h2>

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
            <div>
              <span>Age</span>
              <strong>{listing.age || "N/A"}</strong>
            </div>

            <div>
              <span>Weight</span>
              <strong>{listing.weight || "N/A"}</strong>
            </div>

            <div>
              <span>Health</span>
              <strong>{listing.health_status || "N/A"}</strong>
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
                    Document {index + 1}
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

              {extraActions}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ListingDetailsModal;
