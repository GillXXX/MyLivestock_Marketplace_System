const db = require("../config/db");
const { createNotification } = require("../utils/notify");
const { PAYMENT_OPTIONS, computeDealAmount } = require("../utils/dealTerms");

// Structured negotiation on an open deal, done from the chat: either side
// proposes terms (price, pickup date and place, payment), the other side
// accepts or counters, and accepting moves the deal to Confirmation. For
// animals sold by live weight, the seller then records the actual weight
// at pickup, which sets the final amount. MAO only monitors these.

const NOTE_MAX_LENGTH = 255;
const PLACE_MAX_LENGTH = 150;
const NEGOTIABLE_STEPS = ["Inquiry", "Negotiation"];

// Matches a deal whose buyer hasn't got an unanswered cancellation request.
const NO_OPEN_CANCEL = "(cancel_requested_at IS NULL OR cancel_outcome IS NOT NULL)";

const trxCode = (id) => `TRX-${String(id).padStart(3, "0")}`;
const peso = (n) => `₱${Number(n).toLocaleString()}`;

const loadDeal = async (id) => {
  const [[deal]] = await db.query(
    `SELECT t.*, l.livestock_type, l.unit, l.price AS listing_price, l.weight AS listing_weight
     FROM transactions t
     JOIN livestock_listings l ON t.listing_id = l.id
     WHERE t.id = ?`,
    [id]
  );
  return deal;
};

// Common checks for anything done to an open deal. Returns an error
// { status, message } or null.
const checkOpenDeal = (deal, userId) => {
  if (!deal) return { status: 404, message: "Transaction not found" };

  if (deal.farmer_id !== userId && deal.buyer_id !== userId) {
    return { status: 403, message: "Not authorized for this transaction" };
  }

  if (deal.status !== "Pending") {
    return { status: 400, message: `This transaction is already ${String(deal.status).toLowerCase()}` };
  }

  if (deal.cancel_requested_at && !deal.cancel_outcome) {
    return { status: 400, message: "There's an open cancellation request on this deal. Settle it first." };
  }

  return null;
};

const priceBasis = (unit) => (unit === "kg_live" ? "kg" : unit || "head");

// Posts an automatic line in the deal's chat, from the person who acted,
// so both sides keep a written record of every offer.
const postDealMessage = async (deal, senderId, text) => {
  const [[conversation]] = await db.query(
    "SELECT id FROM conversations WHERE listing_id = ? AND farmer_id = ? AND buyer_id = ? LIMIT 1",
    [deal.listing_id, deal.farmer_id, deal.buyer_id]
  );

  if (!conversation) return;

  await db.query("INSERT INTO messages (conversation_id, sender_id, message) VALUES (?, ?, ?)", [
    conversation.id,
    senderId,
    text,
  ]);

  await db.query("UPDATE conversations SET farmer_deleted_at = NULL, buyer_deleted_at = NULL WHERE id = ?", [
    conversation.id,
  ]);
};

const formatPickupDate = (date) =>
  new Date(date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });

// "YYYY-MM-DD" in the server's local time, for comparing against today.
const localDateString = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const validateOffer = (body) => {
  const unitPrice = Number(body.unitPrice);
  if (!Number.isFinite(unitPrice) || unitPrice <= 0 || unitPrice >= 100000000) {
    return { error: "Please enter a valid price" };
  }

  const pickupDate = String(body.pickupDate || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pickupDate) || Number.isNaN(new Date(`${pickupDate}T00:00:00`).getTime())) {
    return { error: "Please choose a pickup or delivery date" };
  }

  const today = localDateString(new Date());
  const oneYearOut = new Date();
  oneYearOut.setFullYear(oneYearOut.getFullYear() + 1);
  if (pickupDate < today || pickupDate > localDateString(oneYearOut)) {
    return { error: "The pickup date must be between today and a year from now" };
  }

  const pickupPlace = String(body.pickupPlace || "").trim();
  if (!pickupPlace || pickupPlace.length > PLACE_MAX_LENGTH) {
    return { error: `Please enter where the pickup or delivery happens (up to ${PLACE_MAX_LENGTH} characters)` };
  }

  const payment = String(body.payment || "");
  if (!PAYMENT_OPTIONS.includes(payment)) {
    return { error: "Please choose how payment will be made" };
  }

  const note = String(body.note || "").trim();
  if (note.length > NOTE_MAX_LENGTH) {
    return { error: `Notes must be ${NOTE_MAX_LENGTH} characters or fewer` };
  }

  return {
    unitPrice: Math.round(unitPrice * 100) / 100,
    pickupDate,
    pickupPlace,
    payment,
    note: note || null,
  };
};

exports.makeOffer = async (req, res) => {
  try {
    const userId = req.user.id;
    const deal = await loadDeal(req.params.id);

    const dealError = checkOpenDeal(deal, userId);
    if (dealError) return res.status(dealError.status).json({ message: dealError.message });

    if (!NEGOTIABLE_STEPS.includes(deal.workflow_step)) {
      return res.status(400).json({ message: "The terms of this deal are already settled" });
    }

    const offer = validateOffer(req.body);
    if (offer.error) return res.status(400).json({ message: offer.error });

    // A new offer replaces whatever was on the table (it's a counter-offer
    // if the other side made the last one).
    const [result] = await db.query(
      `UPDATE transactions
       SET offer_unit_price = ?, offer_pickup_date = ?, offer_pickup_place = ?, offer_payment = ?,
           offer_note = ?, offer_by = ?, offer_at = NOW(), terms_agreed_at = NULL
       WHERE id = ? AND status = 'Pending' AND workflow_step IN ('Inquiry', 'Negotiation') AND ${NO_OPEN_CANCEL}`,
      [offer.unitPrice, offer.pickupDate, offer.pickupPlace, offer.payment, offer.note, userId, deal.id]
    );

    if (result.affectedRows === 0) {
      return res.status(409).json({ message: "This transaction was already updated. Please refresh." });
    }

    const isCounter = deal.offer_by && deal.offer_by !== userId;
    const estimate = computeDealAmount({
      unit: deal.unit,
      unitPrice: offer.unitPrice,
      quantity: deal.quantity,
      listingWeight: deal.listing_weight,
      actualWeightKg: deal.actual_weight_kg,
    });
    const totalLabel = deal.unit === "kg_live" && !deal.actual_weight_kg ? "est. total" : "total";

    await postDealMessage(
      deal,
      userId,
      `💰 ${isCounter ? "Counter-offer" : "Offer"}: ${peso(offer.unitPrice)}/${priceBasis(deal.unit)} ` +
        `(${peso(estimate)} ${totalLabel} for ${deal.quantity} ${deal.unit === "kg_live" ? "head" : priceBasis(deal.unit)}) · ` +
        `Pickup ${formatPickupDate(offer.pickupDate)} at ${offer.pickupPlace} · ${offer.payment}` +
        (offer.note ? ` · "${offer.note}"` : "")
    );

    await createNotification(
      "Transaction Alert",
      isCounter ? "Counter-offer made" : "Offer made",
      `${trxCode(deal.id)} ${deal.livestock_type}: ${deal.farmer_id === userId ? "seller" : "buyer"} offered ${peso(
        offer.unitPrice
      )}/${priceBasis(deal.unit)}.`,
      deal.id
    );

    res.json({ message: isCounter ? "Counter-offer sent" : "Offer sent" });
  } catch (error) {
    console.error("Make offer error:", error);
    res.status(500).json({ message: "Server error sending the offer" });
  }
};

exports.acceptOffer = async (req, res) => {
  try {
    const userId = req.user.id;
    const deal = await loadDeal(req.params.id);

    const dealError = checkOpenDeal(deal, userId);
    if (dealError) return res.status(dealError.status).json({ message: dealError.message });

    if (!NEGOTIABLE_STEPS.includes(deal.workflow_step) || deal.terms_agreed_at) {
      return res.status(400).json({ message: "The terms of this deal are already settled" });
    }

    if (!deal.offer_by) {
      return res.status(400).json({ message: "There's no offer to accept yet" });
    }

    if (deal.offer_by === userId) {
      return res.status(400).json({ message: "Wait for the other side to accept your offer" });
    }

    const amount = computeDealAmount({
      unit: deal.unit,
      unitPrice: deal.offer_unit_price,
      quantity: deal.quantity,
      listingWeight: deal.listing_weight,
      actualWeightKg: deal.actual_weight_kg,
    });

    // Only accepts the exact offer that was read — if it was countered in
    // the meantime, the person accepting needs to see the new one first.
    const [result] = await db.query(
      `UPDATE transactions
       SET listed_amount = COALESCE(listed_amount, amount), amount = ?,
           terms_agreed_at = NOW(), workflow_step = 'Confirmation'
       WHERE id = ? AND status = 'Pending' AND workflow_step IN ('Inquiry', 'Negotiation')
         AND terms_agreed_at IS NULL AND offer_by = ? AND offer_at = ? AND ${NO_OPEN_CANCEL}`,
      [amount, deal.id, deal.offer_by, deal.offer_at]
    );

    if (result.affectedRows === 0) {
      return res.status(409).json({ message: "The offer changed while you were looking. Please refresh." });
    }

    const needsWeighing = deal.unit === "kg_live" && !deal.actual_weight_kg;

    await postDealMessage(
      deal,
      userId,
      `✅ Deal agreed at ${peso(deal.offer_unit_price)}/${priceBasis(deal.unit)} — ${peso(amount)}${
        needsWeighing ? " estimated; the final amount is set when the animals are weighed at pickup" : ""
      }. Pickup ${formatPickupDate(deal.offer_pickup_date)} at ${deal.offer_pickup_place} · ${deal.offer_payment}.`
    );

    await createNotification(
      "Transaction Alert",
      "Deal terms agreed",
      `${trxCode(deal.id)} ${deal.livestock_type} agreed at ${peso(deal.offer_unit_price)}/${priceBasis(
        deal.unit
      )} (${peso(amount)}) and moved to "Confirmation".`,
      deal.id
    );

    res.json({ message: "Deal terms agreed", amount, workflow_step: "Confirmation" });
  } catch (error) {
    console.error("Accept offer error:", error);
    res.status(500).json({ message: "Server error accepting the offer" });
  }
};

exports.recordWeight = async (req, res) => {
  try {
    const userId = req.user.id;
    const deal = await loadDeal(req.params.id);

    const dealError = checkOpenDeal(deal, userId);
    if (dealError) return res.status(dealError.status).json({ message: dealError.message });

    if (deal.farmer_id !== userId) {
      return res.status(403).json({ message: "Only the seller records the weight" });
    }

    if (deal.unit !== "kg_live") {
      return res.status(400).json({ message: "This listing isn't sold by live weight" });
    }

    if (!["Negotiation", "Confirmation"].includes(deal.workflow_step)) {
      return res.status(400).json({ message: "This deal isn't ready for weighing" });
    }

    const weight = Number(req.body.actualWeightKg);
    if (!Number.isFinite(weight) || weight <= 0 || weight > 5000 * deal.quantity) {
      return res.status(400).json({ message: "Please enter the total actual weight in kg" });
    }
    const actualWeightKg = Math.round(weight * 100) / 100;

    // The agreed price if terms were settled, otherwise the listed one.
    const unitPrice = deal.terms_agreed_at ? deal.offer_unit_price : deal.listing_price;
    const amount = computeDealAmount({ unit: deal.unit, unitPrice, quantity: deal.quantity, actualWeightKg });

    const [result] = await db.query(
      `UPDATE transactions
       SET listed_amount = COALESCE(listed_amount, amount), actual_weight_kg = ?, weighed_at = NOW(), amount = ?
       WHERE id = ? AND status = 'Pending' AND workflow_step IN ('Negotiation', 'Confirmation') AND ${NO_OPEN_CANCEL}`,
      [actualWeightKg, amount, deal.id]
    );

    if (result.affectedRows === 0) {
      return res.status(409).json({ message: "This transaction was already updated. Please refresh." });
    }

    await postDealMessage(
      deal,
      userId,
      `⚖️ ${deal.actual_weight_kg ? "Weight corrected" : "Weighed"}: ${actualWeightKg.toLocaleString()} kg total for ${
        deal.quantity
      } head × ${peso(unitPrice)}/kg = ${peso(amount)}. Please check and confirm.`
    );

    await createNotification(
      "Transaction Alert",
      "Animals weighed",
      `${trxCode(deal.id)} ${deal.livestock_type}: ${actualWeightKg} kg recorded, final amount ${peso(amount)}.`,
      deal.id
    );

    res.json({ message: "Weight recorded", amount, actual_weight_kg: actualWeightKg });
  } catch (error) {
    console.error("Record weight error:", error);
    res.status(500).json({ message: "Server error recording the weight" });
  }
};
