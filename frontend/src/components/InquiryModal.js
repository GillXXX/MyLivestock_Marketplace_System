import { useState } from "react";
import { X, Send, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import "./InquiryModal.css";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1500595046743-cd271d694d30?q=80&w=1400&auto=format&fit=crop";

function InquiryModal({ listing, onClose }) {
  const navigate = useNavigate();

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submitInquiry = async () => {
    if (!text.trim()) {
      setError("Please write a message before sending.");
      return;
    }

    setSending(true);
    setError("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const res = await fetch(`${API_URL}/api/marketplace/inquire`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ listingId: listing.id, message: text.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to send inquiry");
        setSending(false);
        return;
      }

      setSending(false);
      setSent(true);
    } catch (error) {
      setError("Cannot connect to backend server");
      setSending(false);
    }
  };

  return (
    <div className="inquiry-modal-overlay" onClick={onClose}>
      <div className="inquiry-modal" onClick={(e) => e.stopPropagation()}>
        <button className="inquiry-modal-close" type="button" onClick={onClose}>
          <X size={20} />
        </button>

        {sent ? (
          <div className="inquiry-sent">
            <div className="inquiry-sent-icon">
              <CheckCircle2 size={32} />
            </div>
            <h3>Inquiry sent!</h3>
            <p>
              {listing.seller_name} will be notified about your message
              regarding the {listing.breed}.
            </p>
            <button type="button" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <>
            <h3>Send an Inquiry</h3>
            <p className="inquiry-modal-subtitle">
              Your message goes directly to the seller of this listing.
            </p>

            <div className="inquiry-listing-preview">
              <img src={listing.image_url || DEFAULT_IMAGE} alt={listing.breed} />

              <div>
                <strong>{listing.breed}</strong>
                <span>{listing.livestock_type}</span>
                <small>Seller: {listing.seller_name}</small>
              </div>

              <em>₱{Number(listing.price).toLocaleString()}</em>
            </div>

            <textarea
              rows={4}
              placeholder={`Hi ${listing.seller_name}, is the ${listing.breed} still available?`}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (error) setError("");
              }}
              disabled={sending}
            />

            {error && <p className="inquiry-error">{error}</p>}

            <div className="inquiry-modal-actions">
              <button
                type="button"
                className="inquiry-cancel-btn"
                onClick={onClose}
                disabled={sending}
              >
                Cancel
              </button>

              <button
                type="button"
                className="inquiry-send-btn"
                onClick={submitInquiry}
                disabled={sending}
              >
                <Send size={16} />
                {sending ? "Sending..." : "Send Inquiry"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default InquiryModal;
