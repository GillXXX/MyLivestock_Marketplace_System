import { useState } from "react";
import { Link } from "react-router-dom";
import { Handshake, Scale, X } from "lucide-react";
import { API_URL } from "../config";
import {
  PAYMENT_OPTIONS,
  computeDealAmount,
  priceBasis,
  peso,
  formatDealDate,
  toDateInputValue,
} from "../utils/dealTerms";
import "./DealTermsBar.css";

// The open deal's terms, pinned above the chat: either side makes an
// offer (price, pickup date and place, payment), the other accepts or
// counters, and accepting moves the deal to Confirmation. For animals
// sold by live weight the seller then records the actual weight at
// pickup. `deal` is the listing + open transaction from the messages
// endpoint; onChanged reloads it.
function DealTermsBar({ deal, currentUser, onChanged }) {
  const [offerOpen, setOfferOpen] = useState(false);
  const [weighOpen, setWeighOpen] = useState(false);
  const [confirmingAccept, setConfirmingAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!deal || !deal.open_transaction_id) return null;

  const isFarmer = currentUser?.role === "farmer";
  const otherSide = isFarmer ? "buyer" : "seller";
  const step = deal.open_transaction_step;
  const isLiveWeight = deal.unit === "kg_live";
  const basis = priceBasis(deal.unit);
  const quantity = Number(deal.deal_quantity) || 0;
  const quantityLabel = `${quantity} ${isLiveWeight ? "head" : basis}`;
  const negotiating = step === "Inquiry" || step === "Negotiation";
  const agreed = Boolean(deal.terms_agreed_at);
  const hasOffer = Boolean(deal.offer_by);
  const offerIsMine = hasOffer && deal.offer_by === currentUser?.id;
  const cancelPending = Boolean(Number(deal.deal_cancel_pending));
  const weighed = Number(deal.actual_weight_kg) > 0;

  const amountAt = (unitPrice) =>
    computeDealAmount({
      unit: deal.unit,
      unitPrice,
      quantity,
      listingWeight: deal.weight,
      actualWeightKg: deal.actual_weight_kg,
    });
  const isEstimate = isLiveWeight && !weighed;

  const post = async (path, body, method = "POST") => {
    setBusy(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/deals/${deal.open_transaction_id}/${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(body || {}),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Something went wrong");
        return false;
      }

      onChanged?.();
      return true;
    } catch (err) {
      setError("Cannot connect to backend server");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const acceptOffer = async () => {
    const ok = await post("accept");
    if (ok) setConfirmingAccept(false);
  };

  const terms = (
    <>
      {deal.offer_pickup_date && <span>Pickup {formatDealDate(deal.offer_pickup_date)}</span>}
      {deal.offer_pickup_place && <span>{deal.offer_pickup_place}</span>}
      {deal.offer_payment && <span>{deal.offer_payment}</span>}
    </>
  );

  let headline;
  let details = null;
  let actions = null;

  if (negotiating && hasOffer && !agreed) {
    headline = (
      <>
        {offerIsMine ? "Your offer" : `${isFarmer ? "Buyer" : "Seller"}'s offer`}:{" "}
        <strong>
          {peso(deal.offer_unit_price)}/{basis}
        </strong>{" "}
        · {peso(amountAt(deal.offer_unit_price))} {isEstimate ? "est. " : ""}for {quantityLabel}
      </>
    );
    details = (
      <div className="deal-terms-meta">
        {terms}
        {deal.offer_note && <span>“{deal.offer_note}”</span>}
      </div>
    );
    actions = offerIsMine ? (
      <>
        <span className="deal-terms-waiting">Waiting for the {otherSide}</span>
        <button type="button" className="deal-terms-btn secondary" onClick={() => setOfferOpen(true)}>
          Change offer
        </button>
      </>
    ) : confirmingAccept ? (
      <>
        <span className="deal-terms-waiting">Accept these terms?</span>
        <button type="button" className="deal-terms-btn" disabled={busy} onClick={acceptOffer}>
          {busy ? "Accepting..." : "Yes, accept"}
        </button>
        <button
          type="button"
          className="deal-terms-btn secondary"
          disabled={busy}
          onClick={() => setConfirmingAccept(false)}
        >
          Back
        </button>
      </>
    ) : (
      <>
        <button type="button" className="deal-terms-btn" onClick={() => setConfirmingAccept(true)}>
          Accept
        </button>
        <button type="button" className="deal-terms-btn secondary" onClick={() => setOfferOpen(true)}>
          Counter
        </button>
      </>
    );
  } else if (negotiating) {
    headline = (
      <>
        Listed at{" "}
        <strong>
          {peso(deal.price)}/{basis}
        </strong>{" "}
        · {peso(amountAt(deal.price))} {isEstimate ? "est. " : ""}for {quantityLabel}
      </>
    );
    details = <p className="deal-terms-hint">Agree on the price, pickup and payment with an offer.</p>;
    actions = (
      <button type="button" className="deal-terms-btn" onClick={() => setOfferOpen(true)}>
        Make an offer
      </button>
    );
  } else {
    // Confirmation: the terms are settled.
    const unitPrice = agreed ? deal.offer_unit_price : deal.price;
    headline = (
      <>
        {agreed ? "Agreed" : "At the listed price"}:{" "}
        <strong>
          {peso(unitPrice)}/{basis}
        </strong>{" "}
        · {peso(deal.deal_amount)} {isEstimate ? "est. " : ""}for {quantityLabel}
      </>
    );
    details = (
      <div className="deal-terms-meta">
        {agreed && terms}
        {isLiveWeight &&
          (weighed ? (
            <span className="deal-terms-weighed">
              Weighed {Number(deal.actual_weight_kg).toLocaleString()} kg — final {peso(deal.deal_amount)}
            </span>
          ) : (
            <span>Final amount set when weighed at pickup</span>
          ))}
      </div>
    );
    actions = (
      <>
        {isFarmer && isLiveWeight && (
          <button type="button" className="deal-terms-btn" onClick={() => setWeighOpen(true)}>
            <Scale size={14} />
            {weighed ? "Correct weight" : "Record weight"}
          </button>
        )}
        <Link
          to={isFarmer ? "/farmer-transactions" : "/buyer-transactions"}
          state={{ transactionId: deal.open_transaction_id }}
          className="deal-terms-btn secondary"
        >
          {!isFarmer && (!isLiveWeight || weighed) ? "Confirm in Transactions" : "View deal"}
        </Link>
      </>
    );
  }

  return (
    <div className="deal-terms-bar">
      <div className="deal-terms-main">
        <div className="deal-terms-title">
          <Handshake size={15} />
          <span className="deal-terms-step">{step}</span>
          <p>{headline}</p>
        </div>
        {details}
        {cancelPending && (
          <p className="deal-terms-hint warn">A cancellation request is open — offers are paused until it's settled.</p>
        )}
        {error && <p className="deal-terms-error">{error}</p>}
      </div>

      {!cancelPending && <div className="deal-terms-actions">{actions}</div>}

      {offerOpen && (
        <OfferModal
          deal={deal}
          basis={basis}
          quantityLabel={quantityLabel}
          isEstimate={isEstimate}
          amountAt={amountAt}
          busy={busy}
          error={error}
          onClose={() => {
            setOfferOpen(false);
            setError("");
          }}
          onSubmit={async (offer) => {
            const ok = await post("offer", offer);
            if (ok) setOfferOpen(false);
          }}
        />
      )}

      {weighOpen && (
        <WeighModal
          deal={deal}
          unitPrice={agreed ? deal.offer_unit_price : deal.price}
          quantity={quantity}
          busy={busy}
          error={error}
          onClose={() => {
            setWeighOpen(false);
            setError("");
          }}
          onSubmit={async (actualWeightKg) => {
            const ok = await post("weight", { actualWeightKg }, "PUT");
            if (ok) setWeighOpen(false);
          }}
        />
      )}
    </div>
  );
}

// Starts from the offer on the table (so a counter only changes what's
// different), or from the listing's price and farm location.
function OfferModal({ deal, basis, quantityLabel, isEstimate, amountAt, busy, error, onClose, onSubmit }) {
  const hasOffer = Boolean(deal.offer_by);
  const [unitPrice, setUnitPrice] = useState(String(Number(hasOffer ? deal.offer_unit_price : deal.price) || ""));
  const [pickupDate, setPickupDate] = useState(hasOffer && deal.offer_pickup_date ? toDateInputValue(deal.offer_pickup_date) : "");
  const [pickupPlace, setPickupPlace] = useState(hasOffer ? deal.offer_pickup_place || "" : deal.location || "");
  const [payment, setPayment] = useState(hasOffer ? deal.offer_payment || PAYMENT_OPTIONS[0] : PAYMENT_OPTIONS[0]);
  const [note, setNote] = useState("");

  const total = amountAt(unitPrice);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ unitPrice: Number(unitPrice), pickupDate, pickupPlace, payment, note });
  };

  return (
    <div className="deal-modal-overlay" onClick={onClose}>
      <form className="deal-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <button className="deal-modal-close" type="button" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <h3>{hasOffer ? "Counter / change offer" : "Make an offer"}</h3>
        <p className="deal-modal-subtitle">
          Listed at {peso(deal.price)}/{basis}
          {deal.unit === "kg_live" && deal.weight ? ` · ~${parseFloat(deal.weight)} kg per head` : ""}
        </p>

        <label>
          Price per {basis} (₱)
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            required
          />
        </label>

        <div className="deal-modal-total">
          <span>{isEstimate ? "Estimated total" : "Total"} for {quantityLabel}</span>
          <strong>{peso(total)}</strong>
        </div>

        <label>
          Pickup / delivery date
          <input
            type="date"
            min={toDateInputValue()}
            value={pickupDate}
            onChange={(e) => setPickupDate(e.target.value)}
            required
          />
        </label>

        <label>
          Pickup / delivery place
          <input
            type="text"
            maxLength={150}
            placeholder="Example: Farm in Brgy. Poblacion"
            value={pickupPlace}
            onChange={(e) => setPickupPlace(e.target.value)}
            required
          />
        </label>

        <label>
          Payment
          <select value={payment} onChange={(e) => setPayment(e.target.value)}>
            {PAYMENT_OPTIONS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>

        <label>
          Note <span className="deal-modal-optional">(optional)</span>
          <input
            type="text"
            maxLength={255}
            placeholder="Example: one is smaller, around 70 kg"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        {error && <p className="deal-terms-error">{error}</p>}

        <div className="deal-modal-actions">
          <button type="button" className="deal-terms-btn secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="deal-terms-btn" disabled={busy}>
            {busy ? "Sending..." : "Send offer"}
          </button>
        </div>
      </form>
    </div>
  );
}

function WeighModal({ deal, unitPrice, quantity, busy, error, onClose, onSubmit }) {
  const [weight, setWeight] = useState(deal.actual_weight_kg ? String(Number(deal.actual_weight_kg)) : "");
  const total = computeDealAmount({ unit: "kg_live", unitPrice, quantity, actualWeightKg: weight });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(Number(weight));
  };

  return (
    <div className="deal-modal-overlay" onClick={onClose}>
      <form className="deal-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <button className="deal-modal-close" type="button" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <h3>Record actual weight</h3>
        <p className="deal-modal-subtitle">
          Weigh the animals at pickup and enter the total for all {quantity} head. The buyer confirms
          the final amount.
        </p>

        <label>
          Total live weight (kg)
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            required
          />
        </label>

        <div className="deal-modal-total">
          <span>
            {Number(weight) > 0 ? `${Number(weight).toLocaleString()} kg` : "Weight"} × {peso(unitPrice)}/kg
          </span>
          <strong>{peso(total)}</strong>
        </div>

        {error && <p className="deal-terms-error">{error}</p>}

        <div className="deal-modal-actions">
          <button type="button" className="deal-terms-btn secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="deal-terms-btn" disabled={busy}>
            {busy ? "Saving..." : "Save weight"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default DealTermsBar;
