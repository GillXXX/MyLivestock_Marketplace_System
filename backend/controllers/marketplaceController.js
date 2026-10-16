const db = require("../config/db");
const { createNotification } = require("../utils/notify");
const { getPricePerQuantityUnit } = require("../utils/productCatalog");
const { farmersWithAgreedDeal, applyFarmLocationPrivacy } = require("../utils/locationPrivacy");

const getMarketplaceListings = async (req, res) => {
  try {
    const [listings] = await db.query(
      `SELECT 
        l.id,
        l.livestock_type,
        l.category,
        l.unit,
        l.breed,
        l.age,
        l.weight,
        l.price,
        l.quantity,
        l.health_status,
        l.location,
        l.description,
        l.image_url,
        l.documents,
        l.status,
        l.reviewed_at,
        l.created_at,
        u.id AS seller_id,
        u.full_name AS seller_name,
        u.is_verified AS seller_verified,
        u.profile_image AS seller_avatar,
        u.farm_lat,
        u.farm_lng
      FROM livestock_listings l
      JOIN users u ON l.farmer_id = u.id
      WHERE l.status = 'Available'
      ORDER BY l.created_at DESC`
    );

    // Farm pins are approximate unless this buyer has agreed on a deal
    // with that farmer (see utils/locationPrivacy.js).
    const exactFor = await farmersWithAgreedDeal(db, req.user.id);

    res.json({ listings: listings.map((listing) => applyFarmLocationPrivacy(listing, "seller_id", exactFor)) });
  } catch (error) {
    console.error("Marketplace listings error:", error);
    res.status(500).json({ message: "Server error loading marketplace" });
  }
};

const getSellerProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const [sellerRows] = await db.query(
      `SELECT id, full_name, location, farm_location, barangay, purok, about, profile_image, is_verified, created_at,
              farm_lat, farm_lng
       FROM users
       WHERE id = ? AND role = 'farmer'`,
      [id]
    );

    if (sellerRows.length === 0) {
      return res.status(404).json({ message: "Seller not found" });
    }

    const [listings] = await db.query(
      `SELECT id, livestock_type, category, breed, age, weight, price, quantity, unit, health_status, location,
        description, image_url, documents, status, reviewed_at, created_at
       FROM livestock_listings
       WHERE farmer_id = ? AND status = 'Available'
       ORDER BY created_at DESC`,
      [id]
    );

    // Same as the marketplace: an approximate pin, and only the purok and
    // barangay of the address (not the sitio/street), unless this buyer
    // has agreed on a deal with the farmer.
    const exactFor = await farmersWithAgreedDeal(db, req.user.id);
    const { barangay, purok, ...seller } = applyFarmLocationPrivacy(sellerRows[0], "id", exactFor);
    if (!exactFor.has(seller.id) && barangay) {
      seller.farm_location = [purok, barangay, "Veruela, Agusan del Sur"].filter(Boolean).join(", ");
    }

    res.json({
      seller,
      listings,
    });
  } catch (error) {
    console.error("Seller profile error:", error);
    res.status(500).json({ message: "Server error loading seller profile" });
  }
};

const recordListingView = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      "UPDATE livestock_listings SET views = views + 1 WHERE id = ?",
      [id]
    );

    res.json({ message: "View recorded" });
  } catch (error) {
    console.error("Record listing view error:", error);
    res.status(500).json({ message: "Server error recording view" });
  }
};

const findOrCreateConversation = async (listingId, farmerId, buyerId) => {
  const [existingConversation] = await db.query(
    "SELECT id FROM conversations WHERE listing_id = ? AND farmer_id = ? AND buyer_id = ?",
    [listingId, farmerId, buyerId]
  );

  if (existingConversation.length > 0) {
    return existingConversation[0].id;
  }

  const [result] = await db.query(
    "INSERT INTO conversations (listing_id, farmer_id, buyer_id) VALUES (?, ?, ?)",
    [listingId, farmerId, buyerId]
  );

  return result.insertId;
};

const createInquiry = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const { listingId, message } = req.body;

    if (!listingId) {
      return res.status(400).json({ message: "Listing ID is required" });
    }

    const [listingRows] = await db.query(
      "SELECT id, farmer_id FROM livestock_listings WHERE id = ? AND status = 'Available'",
      [listingId]
    );

    // Drafts, listings still awaiting review and removed ones aren't on
    // the marketplace, so they can't be asked about either.
    if (listingRows.length === 0) {
      return res.status(404).json({ message: "This listing is no longer available" });
    }

    const farmerId = listingRows[0].farmer_id;

    await db.query(
      "INSERT INTO inquiries (listing_id, buyer_id, message, status) VALUES (?, ?, ?, 'Unread')",
      [listingId, buyerId, message || null]
    );

    const conversationId = await findOrCreateConversation(listingId, farmerId, buyerId);

    await db.query(
      "INSERT INTO messages (conversation_id, sender_id, message, listing_id) VALUES (?, ?, ?, ?)",
      [conversationId, buyerId, message || "", listingId]
    );

    await db.query(
      "UPDATE conversations SET farmer_deleted_at = NULL, buyer_deleted_at = NULL WHERE id = ?",
      [conversationId]
    );

    res.status(201).json({ message: "Inquiry sent successfully", conversationId });
  } catch (error) {
    console.error("Create inquiry error:", error);
    res.status(500).json({ message: "Server error sending inquiry" });
  }
};

const createTransaction = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const { id: listingId } = req.params;
    const { quantity } = req.body;

    const orderQuantity = Number(quantity);

    if (!Number.isInteger(orderQuantity) || orderQuantity < 1) {
      return res.status(400).json({ message: "Please select a valid quantity" });
    }

    const [listingRows] = await db.query(
      "SELECT id, farmer_id, livestock_type, price, quantity, unit, weight, status FROM livestock_listings WHERE id = ?",
      [listingId]
    );

    if (listingRows.length === 0) {
      return res.status(404).json({ message: "Listing not found" });
    }

    const listing = listingRows[0];

    if (listing.farmer_id === buyerId) {
      return res.status(400).json({ message: "You can't buy your own listing" });
    }

    if (listing.status !== "Available") {
      return res.status(400).json({ message: "This listing is no longer available" });
    }

    // One open deal per buyer per listing — the price and quantity are
    // worked out inside it, so a second one would only duplicate it.
    const [[openDeal]] = await db.query(
      "SELECT id FROM transactions WHERE listing_id = ? AND buyer_id = ? AND status = 'Pending' LIMIT 1",
      [listingId, buyerId]
    );

    if (openDeal) {
      return res.status(409).json({
        message: "You already have an open deal for this listing. Continue it in Messages.",
      });
    }

    if (listing.unit === "kg_live" && !(parseFloat(listing.weight) > 0)) {
      return res.status(400).json({ message: "This listing is missing its weight. Ask the seller to update it." });
    }

    // Sold by live weight, this is an estimate from the listing's average
    // weight per head; the real figure comes from weighing at pickup.
    const amount = Math.round(getPricePerQuantityUnit(listing) * orderQuantity * 100) / 100;
    const priceNote =
      listing.unit === "kg_live"
        ? `est. at ₱${Number(listing.price).toLocaleString()}/kg live weight, ~${parseFloat(listing.weight)} kg per head`
        : "at the listed price";

    // Reserving the stock and recording the order happen together or not
    // at all, so a failure partway through can't leave stock taken off the
    // listing with no order to show for it.
    const connection = await db.getConnection();
    let result;

    try {
      await connection.beginTransaction();

      // Reserve the stock atomically (rather than trusting the quantity we
      // already fetched) so two buyers racing to order the last few head
      // can't both succeed past what's actually available.
      const [reserveResult] = await connection.query(
        "UPDATE livestock_listings SET quantity = quantity - ? WHERE id = ? AND status = 'Available' AND quantity >= ?",
        [orderQuantity, listingId, orderQuantity]
      );

      if (reserveResult.affectedRows === 0) {
        await connection.rollback();
        return res.status(400).json({
          message: `Only ${listing.quantity} available for this listing`,
        });
      }

      await connection.query(
        "UPDATE livestock_listings SET status = 'Sold' WHERE id = ? AND quantity <= 0",
        [listingId]
      );

      // The buyer starts the deal themselves — Buy Now, or "Proceed to
      // Negotiation" after asking about the product in chat — so it begins
      // at Negotiation; Inquiry is the chatting before that.
      [result] = await connection.query(
        `INSERT INTO transactions (listing_id, buyer_id, farmer_id, amount, listed_amount, quantity, workflow_step, status)
         VALUES (?, ?, ?, ?, ?, ?, 'Negotiation', 'Pending')`,
        [listingId, buyerId, listing.farmer_id, amount, amount, orderQuantity]
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const conversationId = await findOrCreateConversation(listingId, listing.farmer_id, buyerId);

    await db.query(
      "INSERT INTO messages (conversation_id, sender_id, message, listing_id) VALUES (?, ?, ?, ?)",
      [
        conversationId,
        buyerId,
        `🤝 Ready to negotiate: ${orderQuantity} x ${listing.livestock_type} for ₱${amount.toLocaleString()} (${priceNote}). Let's agree on the details!`,
        listingId,
      ]
    );

    await db.query(
      "UPDATE conversations SET farmer_deleted_at = NULL, buyer_deleted_at = NULL WHERE id = ?",
      [conversationId]
    );

    await createNotification(
      "Transaction Alert",
      "Negotiation started",
      `A buyer started negotiating for ${orderQuantity} x ${listing.livestock_type} (₱${amount.toLocaleString()}, ${priceNote}).`,
      result.insertId
    );

    res.status(201).json({ message: "Negotiation started", transactionId: result.insertId, conversationId });
  } catch (error) {
    console.error("Create transaction error:", error);
    res.status(500).json({ message: "Server error creating order" });
  }
};

module.exports = {
  getMarketplaceListings,
  getSellerProfile,
  createInquiry,
  recordListingView,
  createTransaction,
};