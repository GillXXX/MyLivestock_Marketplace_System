import { useState } from "react";
import { X, ShoppingCart, CheckCircle2, Minus, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import { UNITS, formatQuantity, getListingPlaceholder } from "../utils/productCatalog";
import "./BuyNowModal.css";

// Starts a deal at Negotiation — from Buy Now, or from "Proceed to
// Negotiation" in the inquiry chat (title / onStarted passed by Messages;
// onStarted replaces the "Go to Messages" screen since they're already
// there).
function BuyNowModal({ listing, onClose, title: heading = "Buy Now", onStarted }) {
  const navigate = useNavigate();

  const listedPrice = Number(listing.price) || 0;
  const maxQuantity = Number(listing.quantity) || 0;

  const [quantity, setQuantity] = useState(maxQuantity > 0 ? 1 : 0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const total = listedPrice * quantity;
  const unit = UNITS.find((u) => u.value === listing.unit) || UNITS[0];
  const title = listing.breed || listing.livestock_type;

  const adjustQuantity = (delta) => {
    setQuantity((prev) => {
      const next = prev + delta;
      if (next < 1) return 1;
      if (next > maxQuantity) return maxQuantity;
      return next;
    });
    if (error) setError("");
  };

  const handleQuantityInput = (e) => {
    const value = Number(e.target.value);
    if (Number.isNaN(value)) return;
    setQuantity(value);
    if (error) setError("");
  };

  const submitOrder = async () => {
    if (!Number.isInteger(quantity) || quantity < 1) {
      setError("Please enter a valid quantity.");
      return;
    }

    if (quantity > maxQuantity) {
      setError(`Only ${formatQuantity(maxQuantity, unit.value)} available for this listing.`);
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
          body: JSON.stringify({ quantity }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to start the negotiation");
        setSending(false);
        return;
      }

      setSending(false);

      if (onStarted) {
        onStarted(data);
        onClose();
        return;
      }

      setSent(true);
    } catch (error) {
      setError("Cannot connect to backend server");
      setSending(false);
    }
  };

  return (
    <div className="buynow-modal-overlay" onClick={onClose}>
      <div className="buynow-modal" onClick={(e) => e.stopPropagation()}>
        <button className="buynow-modal-close" type="button" onClick={onClose}>
          <X size={20} />
        </button>

        {sent ? (
          <div className="buynow-sent">
            <div className="buynow-sent-icon">
              <CheckCircle2 size={32} />
            </div>
            <h3>Negotiation started!</h3>
            <p>
              Your deal for {formatQuantity(quantity, unit.value)} of {title} (₱{total.toLocaleString()}
              at the listed price) was sent to {listing.seller_name}. Head to Messages to agree on
              the details with the seller.
            </p>
            <div className="buynow-sent-actions">
              <button
                type="button"
                className="buynow-sent-secondary"
                onClick={onClose}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => navigate("/buyer-messages")}
              >
                Go to Messages
              </button>
            </div>
          </div>
        ) : (
          <>
            <h3>{heading}</h3>
            <p className="buynow-modal-subtitle">
              Choose how many you want. This starts the negotiation with the seller
              in Messages — you can still cancel within the first hour.
            </p>

            <div className="buynow-listing-preview">
              <img src={listing.image_url || getListingPlaceholder(listing.livestock_type, listing.category)} alt={title} />

              <div>
                <strong>{title}</strong>
                <span>{listing.livestock_type}</span>
                <small>Seller: {listing.seller_name}</small>
              </div>

              <div className="buynow-listed-price">
                <span>Price / {unit.value}</span>
                <em>₱{listedPrice.toLocaleString()}</em>
              </div>
            </div>

            {maxQuantity < 1 ? (
              <p className="buynow-error">This listing is currently out of stock.</p>
            ) : (
              <>
                <label className="buynow-qty-label" htmlFor="buynow-qty-input">
                  How many {unit.plural}?
                  <span className="buynow-qty-available">
                    {formatQuantity(maxQuantity, unit.value)} available
                  </span>
                </label>

                <div className="buynow-qty-field">
                  <button
                    type="button"
                    onClick={() => adjustQuantity(-1)}
                    disabled={sending || quantity <= 1}
                  >
                    <Minus size={16} />
                  </button>

                  <input
                    id="buynow-qty-input"
                    type="number"
                    min="1"
                    max={maxQuantity}
                    step="1"
                    value={quantity}
                    onChange={handleQuantityInput}
                    disabled={sending}
                  />

                  <button
                    type="button"
                    onClick={() => adjustQuantity(1)}
                    disabled={sending || quantity >= maxQuantity}
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <div className="buynow-total-row">
                  <span>Total</span>
                  <strong>₱{total.toLocaleString()}</strong>
                </div>
              </>
            )}

            {error && <p className="buynow-error">{error}</p>}

            <div className="buynow-modal-actions">
              <button
                type="button"
                className="buynow-cancel-btn"
                onClick={onClose}
                disabled={sending}
              >
                Cancel
              </button>

              <button
                type="button"
                className="buynow-order-btn"
                onClick={submitOrder}
                disabled={sending || maxQuantity < 1}
              >
                <ShoppingCart size={16} />
                {sending ? "Starting..." : "Start Negotiation"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default BuyNowModal;
