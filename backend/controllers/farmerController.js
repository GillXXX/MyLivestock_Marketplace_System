const db = require("../config/db");
const bcrypt = require("bcryptjs");
const { createNotification } = require("../utils/notify");
const { getFileUrl } = require("../middleware/uploadMiddleware");

const WORKFLOW_STEPS = ["Inquiry", "Negotiation", "Verification", "Confirmation", "Completed"];

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
        profile_image
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
        breed,
        price,
        status
      FROM livestock_listings
      WHERE farmer_id = ?
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
      },
      listings,
      activities,
      workflows,
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
        t.workflow_step,
        t.status,
        t.created_at,
        l.livestock_type,
        l.breed,
        l.location,
        u.full_name AS buyer_name
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
      `SELECT t.id, t.farmer_id, t.listing_id, t.workflow_step, t.status, l.livestock_type, buyer.full_name AS buyer_name
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

    if (["Flagged", "Declined", "Cancelled"].includes(transaction.status)) {
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
      `SELECT t.id, t.farmer_id, t.status, l.livestock_type, buyer.full_name AS buyer_name
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

    if (["Completed", "Declined", "Cancelled", "Flagged"].includes(transaction.status)) {
      return res.status(400).json({ message: `This transaction is already ${transaction.status.toLowerCase()}` });
    }

    await db.query("UPDATE transactions SET status = 'Declined' WHERE id = ?", [id]);

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

exports.getFarmerNotifications = async (req, res) => {
  try {
    const farmerId = req.user.id || req.user.userId;
    const notifications = [];

    const [listings] = await db.query(
      `
      SELECT id, livestock_type, breed, status, created_at
      FROM livestock_listings
      WHERE farmer_id = ?
      ORDER BY created_at DESC
      LIMIT 10
      `,
      [farmerId]
    );

    listings.forEach((item) => {
      notifications.push({
        id: `L-${item.id}`,
        type: "Listing Status",
        title:
          item.status === "Available"
            ? "Listing approved"
            : item.status === "Rejected"
            ? "Listing rejected"
            : "Listing submitted",
        message: `Your ${item.livestock_type} (${item.breed || "No breed"}) listing is ${item.status}.`,
        time: item.created_at,
        status: item.status === "Pending" ? "Unread" : "Read",
      });
    });

    const [inquiries] = await db.query(
      `
      SELECT c.id, c.created_at, l.livestock_type, buyer.full_name AS buyer_name
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
      notifications.push({
        id: `C-${item.id}`,
        type: "Buyer Inquiry",
        title: "New buyer inquiry",
        message: `${item.buyer_name} inquired about your ${item.livestock_type} listing.`,
        time: item.created_at,
        status: "Unread",
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

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
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