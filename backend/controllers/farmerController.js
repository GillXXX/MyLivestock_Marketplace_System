const db = require("../config/db");
const bcrypt = require("bcryptjs");
const { createNotification } = require("../utils/notify");
const { getFileUrl } = require("../middleware/uploadMiddleware");
const { isStrongPassword, PASSWORD_REQUIREMENTS_MESSAGE } = require("../utils/validators");

const WORKFLOW_STEPS = ["Inquiry", "Negotiation", "Confirmation", "Completed"];

exports.getFarmerDashboard = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    const [userRows] = await db.query(
      `
      SELECT
        id,
        full_name,
        email,
        phone,
        location,
        farm_location,
        role,
        profile_image,
        is_verified,
        verification_status,
        verification_note
      FROM users
      WHERE id = ?
      `,
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userRows[0];

    if (user.role !== "farmer") {
      return res.status(403).json({ message: "Farmer only" });
    }

    const [listings] = await db.query(
      `
      SELECT
        id,
        livestock_type,
        category,
        unit,
        breed,
        price,
        status,
        image_url
      FROM livestock_listings
      WHERE farmer_id = ? AND status != 'Removed'
      ORDER BY id DESC
      LIMIT 5
      `,
      [userId]
    );

    const [activeRows] = await db.query(
      `
      SELECT COUNT(*) AS activeListings
      FROM livestock_listings
      WHERE farmer_id = ?
      AND LOWER(status) IN ('available', 'active', 'approved')
      `,
      [userId]
    );

    const [listingBreakdownRows] = await db.query(
      `
      SELECT
        COUNT(*) AS totalListings,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pendingReview,
        SUM(CASE WHEN status IN ('Flagged', 'Rejected') THEN 1 ELSE 0 END) AS flaggedCount,
        SUM(CASE WHEN status = 'Sold' THEN 1 ELSE 0 END) AS soldCount,
        SUM(CASE WHEN status = 'Draft' THEN 1 ELSE 0 END) AS draftCount,
        COALESCE(SUM(views), 0) AS marketplaceViews
      FROM livestock_listings
      WHERE farmer_id = ? AND status != 'Removed'
      `,
      [userId]
    );

    const [flaggedListings] = await db.query(
      `
      SELECT id, livestock_type, breed, status, review_note
      FROM livestock_listings
      WHERE farmer_id = ? AND status IN ('Flagged', 'Rejected')
      ORDER BY created_at DESC
      LIMIT 3
      `,
      [userId]
    );

    const [inquiryRows] = await db.query(
      `SELECT COUNT(*) AS buyerInquiries FROM conversations WHERE farmer_id = ?`,
      [userId]
    );

    const [txStatsRows] = await db.query(
      `
      SELECT
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completedSales,
        COALESCE(SUM(CASE WHEN status = 'Completed' THEN amount ELSE 0 END), 0) AS tradeValue
      FROM transactions
      WHERE farmer_id = ?
      `,
      [userId]
    );

    const [workflows] = await db.query(
      `
      SELECT
        t.workflow_step,
        l.livestock_type,
        l.category,
        l.unit,
        l.image_url,
        buyer.full_name AS buyer_name
      FROM transactions t
      JOIN livestock_listings l ON t.listing_id = l.id
      JOIN users buyer ON t.buyer_id = buyer.id
      WHERE t.farmer_id = ? AND t.status != 'Completed'
      ORDER BY t.created_at DESC
      LIMIT 5
      `,
      [userId]
    );

    const [activities] = await db.query(
      `
      (
        SELECT
          CONCAT('New listing posted: ', livestock_type) AS title,
          CONCAT(COALESCE(breed, 'No breed'), ' • ', status) AS text,
          created_at
        FROM livestock_listings
        WHERE farmer_id = ?
      )
      UNION ALL
      (
        SELECT
          'New buyer inquiry' AS title,
          CONCAT(buyer.full_name, ' inquired about ', l.livestock_type) AS text,
          c.created_at
        FROM conversations c
        JOIN livestock_listings l ON c.listing_id = l.id
        JOIN users buyer ON c.buyer_id = buyer.id
        WHERE c.farmer_id = ?
      )
      UNION ALL
      (
        SELECT
          CONCAT('Transaction update: ', t.workflow_step) AS title,
          CONCAT(l.livestock_type, ' with ', buyer.full_name) AS text,
          t.created_at
        FROM transactions t
        JOIN livestock_listings l ON t.listing_id = l.id
        JOIN users buyer ON t.buyer_id = buyer.id
        WHERE t.farmer_id = ?
      )
      ORDER BY created_at DESC
      LIMIT 20
      `,
      [userId, userId, userId]
    );

    res.json({
      user,
      stats: {
        activeListings: activeRows[0].activeListings || 0,
        buyerInquiries: inquiryRows[0].buyerInquiries || 0,
        completedSales: txStatsRows[0].completedSales || 0,
        tradeValue: txStatsRows[0].tradeValue || 0,
        totalListings: listingBreakdownRows[0].totalListings || 0,
        pendingReview: listingBreakdownRows[0].pendingReview || 0,
        flaggedCount: listingBreakdownRows[0].flaggedCount || 0,
        soldCount: listingBreakdownRows[0].soldCount || 0,
        draftCount: listingBreakdownRows[0].draftCount || 0,
        marketplaceViews: listingBreakdownRows[0].marketplaceViews || 0,
      },
      listings,
      activities,
      workflows,
      flaggedListings,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Dashboard server error" });
  }
};

exports.getFarmerProfile = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    const [rows] = await db.query(
      `
      SELECT
        id,
        full_name,
        email,
        phone,
        location,
        farm_location,
        farm_lat,
        farm_lng,
        role,
        about,
        profile_image,
        is_verified,
        verification_document,
        verification_status,
        verification_note,
        verification_submitted_at,
        YEAR(created_at) AS joinedYear
      FROM users
      WHERE id = ?
      `,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Farmer profile not found" });
    }

    const [activeRows] = await db.query(
      `
      SELECT COUNT(*) AS activeListings
      FROM livestock_listings
      WHERE farmer_id = ?
      AND LOWER(status) IN ('available', 'active', 'approved')
      `,
      [userId]
    );

    const [salesRows] = await db.query(
      `
      SELECT COALESCE(SUM(amount), 0) AS totalSales
      FROM transactions
      WHERE farmer_id = ? AND status = 'Completed'
      `,
      [userId]
    );

    res.json({
      ...rows[0],
      activeListings: activeRows[0].activeListings || 0,
      totalSales: salesRows[0].totalSales || 0,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateFarmerProfile = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    const {
      full_name,
      phone,
      location,
      farm_location,
      farm_lat,
      farm_lng,
      about,
    } = req.body;

    const lat = farm_lat === "" || farm_lat === undefined ? null : farm_lat;
    const lng = farm_lng === "" || farm_lng === undefined ? null : farm_lng;

    let profileImage = null;

    if (req.file) {
      profileImage = getFileUrl(req.file, req);
    }

    if (profileImage) {
      await db.query(
        `
        UPDATE users
        SET full_name = ?, phone = ?, location = ?, farm_location = ?, farm_lat = ?, farm_lng = ?, about = ?, profile_image = ?
        WHERE id = ?
        `,
        [full_name, phone, location, farm_location, lat, lng, about, profileImage, userId]
      );
    } else {
      await db.query(
        `
        UPDATE users
        SET full_name = ?, phone = ?, location = ?, farm_location = ?, farm_lat = ?, farm_lng = ?, about = ?
        WHERE id = ?
        `,
        [full_name, phone, location, farm_location, lat, lng, about, userId]
      );
    }

    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Update failed" });
  }
};

exports.getFarmerTransactions = async (req, res) => {
  try {
    const farmerId = req.user.id || req.user.userId;

    const [transactions] = await db.query(
      `
      SELECT
        t.id,
        t.amount,
        t.quantity,
        t.workflow_step,
        t.status,
        t.created_at,
        t.updated_at,
        l.livestock_type,
        l.category,
        l.unit,
        l.breed,
        l.location,
        l.image_url,
        u.full_name AS buyer_name,
        u.created_at AS buyer_joined_at,
        (
          SELECT c.id FROM conversations c
          WHERE c.listing_id = t.listing_id
            AND c.farmer_id = t.farmer_id
            AND c.buyer_id = t.buyer_id
          LIMIT 1
        ) AS conversation_id,
        (
          SELECT COUNT(*) FROM transactions t2 WHERE t2.buyer_id = t.buyer_id
        ) AS buyer_total_deals,
        (
          SELECT COUNT(*) FROM transactions t2
          WHERE t2.buyer_id = t.buyer_id AND t2.status = 'Completed'
        ) AS buyer_completed_deals,
        (
          SELECT COUNT(*) FROM transactions t2
          WHERE t2.buyer_id = t.buyer_id AND t2.status IN ('Declined', 'Cancelled')
        ) AS buyer_fallthrough_deals
      FROM transactions t
      JOIN livestock_listings l ON t.listing_id = l.id
      JOIN users u ON t.buyer_id = u.id
      WHERE t.farmer_id = ?
      ORDER BY t.created_at DESC
      `,
      [farmerId]
    );

    const [statsRows] = await db.query(
      `
      SELECT
        COUNT(*) AS totalTransactions,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pendingDeals,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status IN ('Declined', 'Cancelled') THEN 1 ELSE 0 END) AS declined,
        COALESCE(SUM(CASE WHEN status = 'Completed' THEN amount ELSE 0 END), 0) AS tradeValue
      FROM transactions
      WHERE farmer_id = ?
      `,
      [farmerId]
    );

    res.json({
      transactions,
      stats: {
        totalTransactions: statsRows[0].totalTransactions || 0,
        pendingDeals: statsRows[0].pendingDeals || 0,
        completed: statsRows[0].completed || 0,
        declined: statsRows[0].declined || 0,
        tradeValue: statsRows[0].tradeValue || 0,
      },
    });
  } catch (error) {
    console.error("Farmer transactions error:", error);
    res.status(500).json({ message: "Server error loading transactions" });
  }
};

exports.advanceTransactionStep = async (req, res) => {
  try {
    const farmerId = req.user.id || req.user.userId;
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT t.id, t.farmer_id, t.listing_id, t.workflow_step, t.status,
              l.livestock_type, buyer.full_name AS buyer_name
       FROM transactions t
       JOIN livestock_listings l ON t.listing_id = l.id
       JOIN users buyer ON t.buyer_id = buyer.id
       WHERE t.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const transaction = rows[0];

    if (transaction.farmer_id !== farmerId) {
      return res.status(403).json({ message: "Not authorized for this transaction" });
    }

    if (["Declined", "Cancelled"].includes(transaction.status)) {
      return res.status(400).json({ message: `This transaction is ${transaction.status.toLowerCase()} and cannot be advanced` });
    }

    if (transaction.workflow_step === "Confirmation") {
      return res.status(400).json({ message: "Waiting for the buyer to confirm and complete this transaction" });
    }

    const currentIndex = WORKFLOW_STEPS.indexOf(transaction.workflow_step);
    const nextStep = WORKFLOW_STEPS[currentIndex + 1];

    if (!nextStep) {
      return res.status(400).json({ message: "This transaction is already completed" });
    }

    // Negotiation and confirmation are entirely between the buyer and
    // seller — MAO can monitor every transaction, but doesn't get to block
    // it from advancing.
    await db.query(
      "UPDATE transactions SET workflow_step = ? WHERE id = ?",
      [nextStep, id]
    );

    await createNotification(
      "Transaction Alert",
      "Transaction update",
      `${transaction.livestock_type} deal with ${transaction.buyer_name} moved to "${nextStep}".`,
      id
    );

    res.json({ message: "Transaction advanced successfully", workflow_step: nextStep, status: transaction.status });
  } catch (error) {
    console.error("Advance transaction error:", error);
    res.status(500).json({ message: "Server error advancing transaction" });
  }
};

exports.declineTransaction = async (req, res) => {
  try {
    const farmerId = req.user.id || req.user.userId;
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT t.id, t.farmer_id, t.listing_id, t.quantity, t.status, l.livestock_type, buyer.full_name AS buyer_name
       FROM transactions t
       JOIN livestock_listings l ON t.listing_id = l.id
       JOIN users buyer ON t.buyer_id = buyer.id
       WHERE t.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const transaction = rows[0];

    if (transaction.farmer_id !== farmerId) {
      return res.status(403).json({ message: "Not authorized for this transaction" });
    }

    if (["Completed", "Declined", "Cancelled"].includes(transaction.status)) {
      return res.status(400).json({ message: `This transaction is already ${transaction.status.toLowerCase()}` });
    }

    await db.query("UPDATE transactions SET status = 'Declined' WHERE id = ?", [id]);

    // Return the reserved stock to the listing now that the order fell through.
    await db.query(
      "UPDATE livestock_listings SET quantity = quantity + ?, status = IF(status = 'Sold', 'Available', status) WHERE id = ?",
      [transaction.quantity, transaction.listing_id]
    );

    await createNotification(
      "Transaction Alert",
      "Offer declined",
      `${transaction.livestock_type} offer from ${transaction.buyer_name} was declined by the seller.`,
      id
    );

    res.json({ message: "Offer declined successfully" });
  } catch (error) {
    console.error("Decline transaction error:", error);
    res.status(500).json({ message: "Server error declining transaction" });
  }
};

exports.submitVerification = async (req, res) => {
  try {
    const farmerId = req.user.id || req.user.userId;

    const govId = req.files?.government_id?.[0];
    const barangayCert = req.files?.barangay_certificate?.[0];

    if (!govId || !barangayCert) {
      return res.status(400).json({
        message: "Please attach both a valid government ID and a barangay certificate",
      });
    }

    const documentsJson = JSON.stringify([
      { type: "Government ID", url: getFileUrl(govId, req) },
      { type: "Barangay Certificate", url: getFileUrl(barangayCert, req) },
    ]);

    await db.query(
      `UPDATE users
       SET verification_document = ?, verification_status = 'Pending', verification_note = NULL, verification_submitted_at = NOW()
       WHERE id = ?`,
      [documentsJson, farmerId]
    );

    const [[farmer]] = await db.query("SELECT full_name FROM users WHERE id = ?", [farmerId]);

    await createNotification(
      "Verification Request",
      "Farmer verification submitted",
      `${farmer.full_name} submitted documents for account verification.`,
      farmerId
    );

    res.json({ message: "Verification documents submitted. MAO will review them shortly." });
  } catch (error) {
    console.error("Submit verification error:", error);
    res.status(500).json({ message: "Server error submitting verification" });
  }
};

// Shared by getFarmerNotifications and markAllFarmerNotificationsRead so the
// "which notifications exist" logic can't drift between the two.
async function buildFarmerNotifications(farmerId) {
    const notifications = [];

    const [listings] = await db.query(
      `
      SELECT id, livestock_type, breed, status, review_note, created_at
      FROM livestock_listings
      WHERE farmer_id = ?
      ORDER BY created_at DESC
      LIMIT 10
      `,
      [farmerId]
    );

    listings.forEach((item) => {
      const title =
        item.status === "Available"
          ? "Listing approved"
          : item.status === "Rejected"
          ? "Listing rejected"
          : item.status === "Flagged"
          ? "Listing flagged for review"
          : "Listing submitted";

      const base = `Your ${item.livestock_type} (${item.breed || "No breed"}) listing is ${item.status}.`;

      notifications.push({
        id: `L-${item.id}`,
        type: "Listing Status",
        title,
        message:
          (item.status === "Rejected" || item.status === "Flagged") && item.review_note
            ? `${base} Reason: ${item.review_note}`
            : base,
        time: item.created_at,
        status: item.status === "Pending" ? "Unread" : "Read",
      });
    });

    const [inquiries] = await db.query(
      `
      SELECT c.id, c.created_at, c.farmer_last_read_at, l.livestock_type, buyer.full_name AS buyer_name,
        (SELECT MAX(created_at) FROM messages m WHERE m.conversation_id = c.id) AS last_message_at,
        (SELECT sender_id FROM messages m WHERE m.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_sender_id
      FROM conversations c
      JOIN livestock_listings l ON c.listing_id = l.id
      JOIN users buyer ON c.buyer_id = buyer.id
      WHERE c.farmer_id = ?
      ORDER BY c.created_at DESC
      LIMIT 10
      `,
      [farmerId]
    );

    inquiries.forEach((item) => {
      const lastMessageAt = item.last_message_at || item.created_at;
      // Unread whenever the buyer has the last word and the farmer hasn't
      // opened this conversation since — so a brand-new reply flips this
      // back to Unread even if the thread was read long ago.
      const unread = Boolean(
        item.last_sender_id &&
          item.last_sender_id !== farmerId &&
          (!item.farmer_last_read_at || new Date(lastMessageAt) > new Date(item.farmer_last_read_at))
      );

      notifications.push({
        id: `C-${item.id}`,
        type: "Buyer Inquiry",
        title: unread ? "New buyer message" : "Buyer inquiry",
        message: `${item.buyer_name} inquired about your ${item.livestock_type} listing.`,
        time: lastMessageAt,
        status: unread ? "Unread" : "Read",
      });
    });

    const [transactions] = await db.query(
      `
      SELECT t.id, t.workflow_step, t.status, t.created_at, l.livestock_type, buyer.full_name AS buyer_name
      FROM transactions t
      JOIN livestock_listings l ON t.listing_id = l.id
      JOIN users buyer ON t.buyer_id = buyer.id
      WHERE t.farmer_id = ?
      ORDER BY t.created_at DESC
      LIMIT 10
      `,
      [farmerId]
    );

    transactions.forEach((item) => {
      notifications.push({
        id: `T-${item.id}`,
        type: "Transaction Update",
        title: `Transaction: ${item.workflow_step}`,
        message: `${item.livestock_type} deal with ${item.buyer_name} is now at "${item.workflow_step}".`,
        time: item.created_at,
        status: item.status === "Completed" ? "Read" : "Unread",
      });
    });

    notifications.sort((a, b) => new Date(b.time) - new Date(a.time));

    return notifications;
}

exports.getFarmerNotifications = async (req, res) => {
  try {
    const farmerId = req.user.id || req.user.userId;
    const notifications = await buildFarmerNotifications(farmerId);

    const [readRows] = await db.query(
      "SELECT notification_key FROM farmer_notification_reads WHERE farmer_id = ?",
      [farmerId]
    );
    const readKeys = new Set(readRows.map((row) => row.notification_key));

    notifications.forEach((notif) => {
      // "Buyer Inquiry" derives its read state live from the conversation
      // itself (see buildFarmerNotifications) so a stale read-mark here
      // can't hide a genuinely new message.
      if (notif.type !== "Buyer Inquiry" && readKeys.has(notif.id)) notif.status = "Read";
    });

    const totalAlerts = notifications.length;
    const unreadAlerts = notifications.filter((n) => n.status === "Unread").length;

    res.json({
      notifications,
      stats: {
        totalAlerts,
        unreadAlerts,
        listingUpdates: notifications.filter((n) => n.type === "Listing Status").length,
        buyerInquiries: notifications.filter((n) => n.type === "Buyer Inquiry").length,
      },
    });
  } catch (error) {
    console.error("Farmer notifications error:", error);
    res.status(500).json({ message: "Server error loading notifications" });
  }
};

exports.markFarmerNotificationRead = async (req, res) => {
  try {
    const farmerId = req.user.id || req.user.userId;

    await db.query(
      "INSERT IGNORE INTO farmer_notification_reads (farmer_id, notification_key) VALUES (?, ?)",
      [farmerId, req.params.id]
    );

    res.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Mark farmer notification read error:", error);
    res.status(500).json({ message: "Server error updating notification" });
  }
};

exports.markAllFarmerNotificationsRead = async (req, res) => {
  try {
    const farmerId = req.user.id || req.user.userId;
    const notifications = await buildFarmerNotifications(farmerId);

    if (notifications.length > 0) {
      const values = notifications.map((notif) => [farmerId, notif.id]);
      await db.query(
        "INSERT IGNORE INTO farmer_notification_reads (farmer_id, notification_key) VALUES ?",
        [values]
      );
    }

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Mark all farmer notifications read error:", error);
    res.status(500).json({ message: "Server error updating notifications" });
  }
};

exports.changeFarmerPassword = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "Please fill in all password fields" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New passwords do not match" });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ message: PASSWORD_REQUIREMENTS_MESSAGE });
    }

    const [rows] = await db.query("SELECT password FROM users WHERE id = ?", [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, rows[0].password);

    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Server error updating password" });
  }
};