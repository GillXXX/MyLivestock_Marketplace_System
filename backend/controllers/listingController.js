const db = require("../config/db");
const { createNotification } = require("../utils/notify");
const { getFileUrl } = require("../middleware/uploadMiddleware");

const getMyListings = async (req, res) => {
  try {
    const farmerId = req.user.id;

    const [listings] = await db.query(
      "SELECT * FROM livestock_listings WHERE farmer_id = ? ORDER BY created_at DESC",
      [farmerId]
    );

    const [stats] = await db.query(
      `SELECT
        SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) AS activeListings,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pendingReview,
        COALESCE(SUM(views), 0) AS marketplaceViews,
        COALESCE(SUM(CASE WHEN status != 'Removed' THEN price ELSE 0 END), 0) AS estimatedValue
      FROM livestock_listings
      WHERE farmer_id = ?`,
      [farmerId]
    );

    res.json({
      listings,
      stats: {
        activeListings: stats[0].activeListings,
        pendingReview: stats[0].pendingReview,
        marketplaceViews: stats[0].marketplaceViews,
        estimatedValue: stats[0].estimatedValue,
      },
    });
  } catch (error) {
    console.error("Get listings error:", error);
    res.status(500).json({ message: "Server error loading listings" });
  }
};

const createListing = async (req, res) => {
  try {
    const farmerId = req.user.id;

    const {
      livestockType,
      breed,
      age,
      weight,
      price,
      healthStatus,
      location,
      description,
      imageUrl,
    } = req.body;

    if (!livestockType || !breed || !age || !weight || !price || !healthStatus || !location) {
      return res.status(400).json({ message: "Please fill in all required fields" });
    }

    const [[farmerAccount]] = await db.query(
      "SELECT is_verified FROM users WHERE id = ?",
      [farmerId]
    );

    if (!farmerAccount?.is_verified) {
      return res.status(403).json({
        message:
          "Your account must be verified before you can post a listing. Submit your verification documents in your profile.",
      });
    }

    const uploadedImage = req.files?.image?.[0];
    const finalImageUrl = uploadedImage
      ? getFileUrl(uploadedImage, req)
      : imageUrl || null;

    const uploadedDocuments = req.files?.documents || [];
    const documentsJson = uploadedDocuments.length
      ? JSON.stringify(
          uploadedDocuments.map((file) => getFileUrl(file, req))
        )
      : null;

    const [result] = await db.query(
      `INSERT INTO livestock_listings
      (farmer_id, livestock_type, breed, age, weight, price, health_status, location, description, image_url, documents, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        farmerId,
        livestockType,
        breed,
        age,
        weight,
        price,
        healthStatus,
        location,
        description,
        finalImageUrl,
        documentsJson,
        "Pending",
      ]
    );

    const [[farmer]] = await db.query(
      "SELECT full_name FROM users WHERE id = ?",
      [farmerId]
    );

    await createNotification(
      "Listing Approval",
      "Livestock listing submitted",
      `${farmer.full_name} submitted a ${livestockType} listing for review.`,
      result.insertId
    );

    res.status(201).json({ message: "Listing submitted for review" });
  } catch (error) {
    console.error("Create listing error:", error);
    res.status(500).json({ message: "Server error creating listing" });
  }
};

const getListingById = async (req, res) => {
  try {
    const farmerId = req.user.id;
    const { id } = req.params;

    const [rows] = await db.query(
      "SELECT * FROM livestock_listings WHERE id = ? AND farmer_id = ?",
      [id, farmerId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Listing not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Get listing error:", error);
    res.status(500).json({ message: "Server error loading listing" });
  }
};

const updateListing = async (req, res) => {
  try {
    const farmerId = req.user.id;
    const { id } = req.params;

    const [existingRows] = await db.query(
      "SELECT image_url, documents FROM livestock_listings WHERE id = ? AND farmer_id = ?",
      [id, farmerId]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ message: "Listing not found" });
    }

    const {
      livestockType,
      breed,
      age,
      weight,
      price,
      healthStatus,
      location,
      description,
      imageUrl,
    } = req.body;

    if (!livestockType || !breed || !age || !weight || !price || !healthStatus || !location) {
      return res.status(400).json({ message: "Please fill in all required fields" });
    }

    const uploadedImage = req.files?.image?.[0];
    const finalImageUrl = uploadedImage
      ? getFileUrl(uploadedImage, req)
      : imageUrl || existingRows[0].image_url;

    const uploadedDocuments = req.files?.documents || [];
    const documentsJson = uploadedDocuments.length
      ? JSON.stringify(
          uploadedDocuments.map((file) => getFileUrl(file, req))
        )
      : existingRows[0].documents;

    await db.query(
      `UPDATE livestock_listings
      SET livestock_type = ?, breed = ?, age = ?, weight = ?, price = ?,
          health_status = ?, location = ?, description = ?, image_url = ?, documents = ?
      WHERE id = ? AND farmer_id = ?`,
      [
        livestockType,
        breed,
        age,
        weight,
        price,
        healthStatus,
        location,
        description,
        finalImageUrl,
        documentsJson,
        id,
        farmerId,
      ]
    );

    res.json({ message: "Listing updated successfully" });
  } catch (error) {
    console.error("Update listing error:", error);
    res.status(500).json({ message: "Server error updating listing" });
  }
};

const deleteListing = async (req, res) => {
  try {
    const farmerId = req.user.id;
    const { id } = req.params;

    const [result] = await db.query(
      "UPDATE livestock_listings SET status = 'Removed' WHERE id = ? AND farmer_id = ?",
      [id, farmerId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Listing not found" });
    }

    res.json({ message: "Listing removed successfully" });
  } catch (error) {
    console.error("Delete listing error:", error);
    res.status(500).json({ message: "Server error removing listing" });
  }
};

module.exports = {
  getMyListings,
  createListing,
  getListingById,
  updateListing,
  deleteListing,
};