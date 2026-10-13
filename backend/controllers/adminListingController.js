const db = require("../config/db");

const getAdminListings = async (req, res) => {
  try {
    const [listings] = await db.query(`
      SELECT
        l.id,
        l.livestock_type,
        l.category,
        l.unit,
        l.breed,
        l.price,
        l.location,
        l.status,
        l.image_url,
        l.review_note,
        l.reviewed_at,
        l.created_at,
        u.full_name AS farmer_name,
        reviewer.full_name AS reviewed_by_name,
        reviewer.role AS reviewed_by_role
      FROM livestock_listings l
      JOIN users u ON l.farmer_id = u.id
      LEFT JOIN users reviewer ON l.reviewed_by = reviewer.id
      ORDER BY l.created_at DESC
    `);

    const [stats] = await db.query(`
      SELECT
        COUNT(*) AS totalListings,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pendingReview,
        SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN status = 'Flagged' THEN 1 ELSE 0 END) AS flagged
      FROM livestock_listings
    `);

    res.json({
      listings,
      stats: {
        totalListings: stats[0].totalListings || 0,
        pendingReview: stats[0].pendingReview || 0,
        approved: stats[0].approved || 0,
        flagged: stats[0].flagged || 0,
      },
    });
  } catch (error) {
    console.error("Admin listings error:", error);
    res.status(500).json({ message: "Server error loading listings" });
  }
};

// Statuses MAO can set, and the only ones it can change a listing from.
// A farmer's draft, a listing the farmer removed, and a sold-out one are
// not MAO's to put on the marketplace — approving any of those would
// bring it back with no stock or against the farmer's wishes.
const REVIEW_STATUSES = ["Available", "Pending", "Flagged", "Rejected"];

// Shared by the Listings and Verification pages. Returns an error
// { status, message } when the change isn't allowed. reviewNote undefined
// leaves the existing note as it is. Records which admin / MAO staff made
// the change, and when.
const setListingReviewStatus = async (listingId, status, reviewNote, reviewerId) => {
  if (!REVIEW_STATUSES.includes(status)) {
    return { status: 400, message: "Invalid listing status" };
  }

  const [result] =
    reviewNote === undefined
      ? await db.query(
          "UPDATE livestock_listings SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ? AND status IN (?)",
          [status, reviewerId, listingId, REVIEW_STATUSES]
        )
      : await db.query(
          "UPDATE livestock_listings SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ? AND status IN (?)",
          [status, reviewNote, reviewerId, listingId, REVIEW_STATUSES]
        );

  if (result.affectedRows === 0) {
    const [[listing]] = await db.query("SELECT status FROM livestock_listings WHERE id = ?", [listingId]);
    return listing
      ? { status: 409, message: `This listing is ${listing.status.toLowerCase()} and can't be reviewed` }
      : { status: 404, message: "Listing not found" };
  }

  return null;
};

const updateListingStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;

    const isReviewOutcome = status === "Flagged" || status === "Rejected";

    const error = await setListingReviewStatus(
      req.params.id,
      status,
      isReviewOutcome && reason ? reason : null,
      req.user.id
    );

    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    res.json({ message: "Listing status updated successfully" });
  } catch (error) {
    console.error("Update listing status error:", error);
    res.status(500).json({ message: "Server error updating listing" });
  }
};

const deleteListing = async (req, res) => {
  try {
    try {
      const [result] = await db.query("DELETE FROM livestock_listings WHERE id = ?", [req.params.id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Listing not found" });
      }
    } catch (error) {
      if (error.code === "ER_ROW_IS_REFERENCED_2" || error.code === "ER_ROW_IS_REFERENCED") {
        return res.status(409).json({
          message:
            "Can't delete this listing — it has orders, inquiries, chats or favorites on record. Reject or flag it instead.",
        });
      }
      throw error;
    }

    res.json({ message: "Listing deleted successfully" });
  } catch (error) {
    console.error("Delete listing error:", error);
    res.status(500).json({ message: "Server error deleting listing" });
  }
};

module.exports = {
  getAdminListings,
  updateListingStatus,
  deleteListing,
  setListingReviewStatus,
};