const db = require("../config/db");
const { createNotification } = require("../utils/notify");

const getMarketplaceListings = async (req, res) => {
  try {
    const [listings] = await db.query(
      `SELECT 
        l.id,
        l.livestock_type,
        l.breed,
        l.age,
        l.weight,
        l.price,
        l.health_status,
        l.location,
        l.description,
        l.image_url,
        l.documents,
        l.status,
        l.created_at,
        u.id AS seller_id,
        u.full_name AS seller_name,
        u.is_verified AS seller_verified,
        u.farm_lat,
        u.farm_lng
      FROM livestock_listings l
      JOIN users u ON l.farmer_id = u.id
      WHERE l.status = 'Available'
      ORDER BY l.created_at DESC`
    );

    res.json({ listings });
  } catch (error) {
    console.error("Marketplace listings error:", error);
    res.status(500).json({ message: "Server error loading marketplace" });
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
      "SELECT id, farmer_id FROM livestock_listings WHERE id = ?",
      [listingId]
    );

    if (listingRows.length === 0) {
      return res.status(404).json({ message: "Listing not found" });
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
    const { amount } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "A valid offer amount is required" });
    }

    const [listingRows] = await db.query(
      "SELECT id, farmer_id, livestock_type, price FROM livestock_listings WHERE id = ?",
      [listingId]
    );

    if (listingRows.length === 0) {
      return res.status(404).json({ message: "Listing not found" });
    }

    const farmerId = listingRows[0].farmer_id;
    const listedPrice = Number(listingRows[0].price);
    const minOffer = listedPrice * 0.95;
    const maxOffer = listedPrice * 1.5;

    if (farmerId === buyerId) {
      return res.status(400).json({ message: "You can't make an offer on your own listing" });
    }

    if (Number(amount) < minOffer || Number(amount) > maxOffer) {
      return res.status(400).json({
        message: `Offer must be between ₱${minOffer.toLocaleString()} and ₱${maxOffer.toLocaleString()} (95%-150% of the listed price)`,
      });
    }

    const [result] = await db.query(
      `INSERT INTO transactions (listing_id, buyer_id, farmer_id, amount, workflow_step, status)
       VALUES (?, ?, ?, ?, 'Inquiry', 'Pending')`,
      [listingId, buyerId, farmerId, amount]
    );

    const conversationId = await findOrCreateConversation(listingId, farmerId, buyerId);

    await db.query(
      "INSERT INTO messages (conversation_id, sender_id, message, listing_id) VALUES (?, ?, ?, ?)",
      [
        conversationId,
        buyerId,
        `💰 Made an offer of ₱${Number(amount).toLocaleString()} on your ${listingRows[0].livestock_type} listing.`,
        listingId,
      ]
    );

    await db.query(
      "UPDATE conversations SET farmer_deleted_at = NULL, buyer_deleted_at = NULL WHERE id = ?",
      [conversationId]
    );

    await createNotification(
      "Transaction Alert",
      "New transaction started",
      `A buyer made an offer of ₱${Number(amount).toLocaleString()} on a ${listingRows[0].livestock_type} listing.`,
      result.insertId
    );

    res.status(201).json({ message: "Offer sent successfully", transactionId: result.insertId, conversationId });
  } catch (error) {
    console.error("Create transaction error:", error);
    res.status(500).json({ message: "Server error creating transaction" });
  }
};

module.exports = { getMarketplaceListings, createInquiry, recordListingView, createTransaction };