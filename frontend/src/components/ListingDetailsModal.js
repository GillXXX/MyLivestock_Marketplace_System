import { X, ShieldCheck, FileText, MessageCircle } from "lucide-react";
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

function ListingDetailsModal({ listing, onClose, onInquire, extraActions }) {
  const documents = parseDocuments(listing.documents);

  return (
    <div className="details-modal-overlay" onClick={onClose}>
      <div className="details-modal" onClick={(e) => e.stopPropagation()}>
        <button className="details-modal-close" type="button" onClick={onClose}>
          <X size={20} />
        </button>

        <img src={listing.image_url || DEFAULT_IMAGE} alt={listing.breed} />

        <div className="details-modal-body">
          <div className="details-modal-head">
            <div>
              <h2>{listing.breed}</h2>
              <p>
                {listing.livestock_type}
                {listing.age ? ` • ${listing.age}` : ""}
              </p>
            </div>

            <strong>₱{Number(listing.price).toLocaleString()}</strong>
          </div>

          <div className="details-modal-info">
            <div>
              <span>Weight</span>
              <strong>{listing.weight || "N/A"}</strong>
            </div>

            <div>
              <span>Health Status</span>
              <strong>{listing.health_status || "N/A"}</strong>
            </div>

            <div>
              <span>Location</span>
              <strong>{listing.location}</strong>
            </div>
          </div>

          {listing.description && (
            <div className="details-modal-description">
              <h4>Description</h4>
              <p>{listing.description}</p>
            </div>
          )}

          {documents.length > 0 && (
            <div className="details-modal-documents">
              <h4>Supporting Documents</h4>

              {documents.map((docUrl, index) => (
                <a key={index} href={docUrl} target="_blank" rel="noopener noreferrer">
                  <FileText size={16} />
                  Document {index + 1}
                </a>
              ))}
            </div>
          )}

          <div className="details-modal-seller">
            <div>
              <ShieldCheck size={18} />
              <div>
                <strong>{listing.seller_name}</strong>
                <p>
                  {listing.seller_verified
                    ? "MAO-verified seller"
                    : "Verification pending"}
                </p>
              </div>
            </div>

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
