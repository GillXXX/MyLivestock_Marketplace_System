import { useState } from "react";
import { X, Wallet, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import "./MakeOfferModal.css";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1500595046743-cd271d694d30?q=80&w=1400&auto=format&fit=crop";

function MakeOfferModal({ listing, onClose }) {
  const navigate = useNavigate();

  const listedPrice = Number(listing.price) || 0;
  const minOffer = Math.round(listedPrice * 0.95);
  const maxOffer = Math.round(listedPrice * 1.5);

  const [amount, setAmount] = useState(
    listedPrice ? String(listedPrice) : ""
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submitOffer = async () => {
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      setError("Please enter a valid offer amount.");
      return;
    }

    if (listedPrice && (numericAmount < minOffer || numericAmount > maxOffer)) {
      setError(
        `Offer must be between ₱${minOffer.toLocaleString()} and ₱${maxOffer.toLocaleString()}.`
      );
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

      const res = await fetch(
        `${API_URL}/api/marketplace/${listing.id}/transactions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ amount: numericAmount }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to send offer");
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
    <div className="offer-modal-overlay" onClick={onClose}>
      <div className="offer-modal" onClick={(e) => e.stopPropagation()}>
        <button className="offer-modal-close" type="button" onClick={onClose}>
          <X size={20} />
        </button>

        {sent ? (
          <div className="offer-sent">
            <div className="offer-sent-icon">
              <CheckCircle2 size={32} />
            </div>
            <h3>Offer sent!</h3>
            <p>
              Your offer of ₱{Number(amount).toLocaleString()} for the{" "}
              {listing.breed} was sent to {listing.seller_name}.
            </p>
            <div className="offer-sent-actions">
              <button
                type="button"
                className="offer-sent-secondary"
                onClick={onClose}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => navigate("/buyer-transactions")}
              >
                View My Transactions
              </button>
            </div>
          </div>
        ) : (
          <>
            <h3>Make an Offer</h3>
            <p className="offer-modal-subtitle">
              Propose a price to the seller for this listing.
            </p>

            <div className="offer-listing-preview">
              <img src={listing.image_url || DEFAULT_IMAGE} alt={listing.breed} />

              <div>
                <strong>{listing.breed}</strong>
                <span>{listing.livestock_type}</span>
                <small>Seller: {listing.seller_name}</small>
              </div>

              <div className="offer-listed-price">
                <span>Listed at</span>
                <em>₱{listedPrice.toLocaleString()}</em>
              </div>
            </div>

            <label className="offer-amount-label" htmlFor="offer-amount-input">
              Your Offer
            </label>

            <div className="offer-amount-field">
              <span>₱</span>
              <input
                id="offer-amount-input"
                type="number"
                min="0"
                step="1"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (error) setError("");
                }}
                disabled={sending}
              />
            </div>

            {listedPrice > 0 && (
              <p className="offer-range-hint">
                Offers must be between ₱{minOffer.toLocaleString()} and ₱
                {maxOffer.toLocaleString()} (95%–150% of the listed price).
              </p>
            )}

            {error && <p className="offer-error">{error}</p>}

            <div className="offer-modal-actions">
              <button
                type="button"
                className="offer-cancel-btn"
                onClick={onClose}
                disabled={sending}
              >
                Cancel
              </button>

              <button
                type="button"
                className="offer-send-btn"
                onClick={submitOffer}
                disabled={sending}
              >
                <Wallet size={16} />
                {sending ? "Sending..." : "Send Offer"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default MakeOfferModal;
