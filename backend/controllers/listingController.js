const db = require("../config/db");
const { createNotification } = require("../utils/notify");
const { getFileUrl } = require("../middleware/uploadMiddleware");
const { getSystemSettings } = require("../utils/systemSettings");
const {
  getDocumentRequirement,
  formatRequirementMessage,
} = require("../utils/livestockDocRequirements");
const { getCategory, isValidUnit } = require("../utils/productCatalog");

// Shared create/update validation. Live animals need breed, age, weight
// and health status; backyard farm products (eggs, fruits, ...) only need
// the basics, since "age" or "health status" don't apply to a tray of eggs.
// Returns { error } or the cleaned fields.
const validateListingInput = (body) => {
  const livestockType = (body.livestockType || "").trim();
  const category = getCategory(livestockType, body.category);
  const unit = body.unit || (category === "livestock" ? "head" : "kg");
  const { breed, age, weight, price, quantity, healthStatus, location } = body;

  if (!livestockType || !price || !quantity || !location) {
    return { error: "Please fill in all required fields" };
  }

  if (livestockType.length > 50) {
    return { error: "Product type must be 50 characters or fewer" };
  }

  if (category === "livestock" && (!breed || !age || !weight || !healthStatus)) {
    return { error: "Please fill in all required fields" };
  }

  if (!isValidUnit(unit, category)) {
    return {
      error:
        category === "livestock"
          ? "Live animals are sold per head or per kg of live weight — please choose one"
          : "Please choose a valid selling unit",
    };
  }

  // For live animals, weight is the average live weight per head in kg,
  // kept as a plain number so a per-kg price can be turned into an
  // estimate per head. Farm products keep a free-text size ("Large, 60g").
  let weightValue = weight || null;
  if (category === "livestock") {
    const kg = Number(weight);
    if (!Number.isFinite(kg) || kg <= 0 || kg > 5000) {
      return { error: "Please enter the average weight per head in kg" };
    }
    weightValue = String(Math.round(kg * 100) / 100);
  }

  // price is DECIMAL(10,2) and quantity an INT column.
  const priceValue = Number(price);
  if (!Number.isFinite(priceValue) || priceValue <= 0 || priceValue >= 100000000) {
    return { error: "Please enter a valid price" };
  }

  const quantityValue = Number(quantity);
  if (!Number.isInteger(quantityValue) || quantityValue < 1 || quantityValue > 1000000) {
    return { error: "Quantity must be a whole number of at least 1" };
  }

  return {
    livestockType,
    category,
    unit,
    breed: breed || null,
    age: age || null,
    weight: weightValue,
    price: Math.round(priceValue * 100) / 100,
    quantity: quantityValue,
    healthStatus: healthStatus || null,
    location,
  };
};

// Maps the admin's "Default Listing Status" setting (System Settings >
// General System Configuration) to the actual livestock_listings.status
// enum value a new listing should be created with.
const DEFAULT_STATUS_MAP = {
  "Pending Approval": "Pending",
  "Auto Approved": "Available",
  Draft: "Draft",
};

// System Settings > "Require document verification". When it is turned
// off, supporting documents are optional for every listing.
const getActiveDocumentRequirement = async (type, category) => {
  const settings = await getSystemSettings();
  return settings.document_verification === 0 ? null : getDocumentRequirement(type, category);
};

const getDefaultListingStatus = async () => {
  const settings = await getSystemSettings();
  return DEFAULT_STATUS_MAP[settings.default_listing_status] || "Pending";
};

const getMyListings = async (req, res) => {
  try {
    const farmerId = req.user.id;

    const [listings] = await db.query(
      "SELECT * FROM livestock_listings WHERE farmer_id = ? AND status != 'Removed' ORDER BY created_at DESC",
      [farmerId]
    );

    const [stats] = await db.query(
      `SELECT
        SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) AS activeListings,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pendingReview,
        COALESCE(SUM(views), 0) AS marketplaceViews,
        COALESCE(SUM(CASE WHEN status != 'Removed' THEN price * quantity ELSE 0 END), 0) AS estimatedValue
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

    const { description, imageUrl } = req.body;
    const input = validateListingInput(req.body);

    if (input.error) {
      return res.status(400).json({ message: input.error });
    }

    const {
      livestockType,
      category,
      unit,
      breed,
      age,
      weight,
      price,
      quantity,
      healthStatus,
      location,
    } = input;

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

    const requirement = await getActiveDocumentRequirement(livestockType, category);
    if (requirement && uploadedDocuments.length < requirement.minDocuments) {
      return res.status(400).json({ message: formatRequirementMessage(livestockType, category) });
    }

    const documentsJson = uploadedDocuments.length
      ? JSON.stringify(
          uploadedDocuments.map((file) => getFileUrl(file, req))
        )
      : null;

    const listingStatus = await getDefaultListingStatus();

    const [result] = await db.query(
      `INSERT INTO livestock_listings
      (farmer_id, livestock_type, category, breed, age, weight, price, quantity, unit, health_status, location, description, image_url, documents, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        farmerId,
        livestockType,
        category,
        breed,
        age,
        weight,
        price,
        quantity,
        unit,
        healthStatus,
        location,
        description,
        finalImageUrl,
        documentsJson,
        listingStatus,
      ]
    );

    // A draft has nothing for MAO to review yet, and an auto-approved
    // listing skipped review entirely — only a Pending listing actually
    // needs the admin's attention.
    if (listingStatus === "Pending") {
      const [[farmer]] = await db.query(
        "SELECT full_name FROM users WHERE id = ?",
        [farmerId]
      );

      await createNotification(
        "Listing Approval",
        "Listing submitted",
        `${farmer.full_name} submitted a ${livestockType} listing for review.`,
        result.insertId
      );
    }

    const responseMessage =
      listingStatus === "Available"
        ? "Listing published"
        : listingStatus === "Draft"
        ? "Listing saved as draft"
        : "Listing submitted for review";

    res.status(201).json({ message: responseMessage });
  } catch (error) {
    console.error("Create listing error:", error);
    res.status(500).json({ message: "Server error creating listing" });
  }
};

const countOpenDeals = async (listingId) => {
  const [[row]] = await db.query(
    "SELECT COUNT(*) AS n FROM transactions WHERE listing_id = ? AND status = 'Pending'",
    [listingId]
  );
  return Number(row.n) || 0;
};

// What a buyer and seller are negotiating on: an open deal's price and
// amount are worked out from these, so they can't change under it. Returns
// the first one that differs, or null. Weights are compared as numbers so
// an older free-text weight ("25kg") resaved as 25 doesn't count.
const changedDealField = (existing, input) => {
  if (existing.livestock_type !== input.livestockType) return "animal type";
  if ((existing.unit || "head") !== input.unit) return "selling unit";
  if (Number(existing.price) !== Number(input.price)) return "price";
  const existingKg = parseFloat(existing.weight);
  if (input.category === "livestock" && Number.isFinite(existingKg) && existingKg !== parseFloat(input.weight)) {
    return "weight";
  }
  return null;
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

    // So the edit form can lock the fields open deals depend on.
    const openDeals = await countOpenDeals(id);

    res.json({ ...rows[0], open_deals: openDeals });
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
      `SELECT image_url, documents, status, livestock_type, unit, price, weight
       FROM livestock_listings WHERE id = ? AND farmer_id = ?`,
      [id, farmerId]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ message: "Listing not found" });
    }

    const { description, imageUrl } = req.body;
    const input = validateListingInput(req.body);

    if (input.error) {
      return res.status(400).json({ message: input.error });
    }

    const changed = changedDealField(existingRows[0], input);
    if (changed && (await countOpenDeals(id)) > 0) {
      return res.status(409).json({
        message: `This listing has an open deal, so its ${changed} can't be changed until the deal is completed or cancelled.`,
      });
    }

    const {
      livestockType,
      category,
      unit,
      breed,
      age,
      weight,
      price,
      quantity,
      healthStatus,
      location,
    } = input;

    const uploadedImage = req.files?.image?.[0];
    const finalImageUrl = uploadedImage
      ? getFileUrl(uploadedImage, req)
      : imageUrl || existingRows[0].image_url;

    const uploadedDocuments = req.files?.documents || [];

    let finalDocumentCount = uploadedDocuments.length;
    if (!uploadedDocuments.length) {
      try {
        const existingDocs = existingRows[0].documents
          ? JSON.parse(existingRows[0].documents)
          : [];
        finalDocumentCount = Array.isArray(existingDocs) ? existingDocs.length : 0;
      } catch (error) {
        finalDocumentCount = 0;
      }
    }

    const requirement = await getActiveDocumentRequirement(livestockType, category);
    if (requirement && finalDocumentCount < requirement.minDocuments) {
      return res.status(400).json({ message: formatRequirementMessage(livestockType, category) });
    }

    const documentsJson = uploadedDocuments.length
      ? JSON.stringify(
          uploadedDocuments.map((file) => getFileUrl(file, req))
        )
      : existingRows[0].documents;

    // An approved listing that gets edited goes back to MAO for review —
    // otherwise approval could be used once and then the product, price or
    // documents swapped for anything. Skipped when the admin has set new
    // listings to be auto-approved, since nothing is reviewed then anyway.
    const needsReReview =
      existingRows[0].status === "Available" &&
      (await getDefaultListingStatus()) !== "Available";
    const newStatus = needsReReview ? "Pending" : existingRows[0].status;

    await db.query(
      `UPDATE livestock_listings
      SET livestock_type = ?, category = ?, breed = ?, age = ?, weight = ?, price = ?, quantity = ?,
          unit = ?, health_status = ?, location = ?, description = ?, image_url = ?, documents = ?, status = ?
      WHERE id = ? AND farmer_id = ?`,
      [
        livestockType,
        category,
        breed,
        age,
        weight,
        price,
        quantity,
        unit,
        healthStatus,
        location,
        description,
        finalImageUrl,
        documentsJson,
        newStatus,
        id,
        farmerId,
      ]
    );

    if (needsReReview) {
      const [[farmer]] = await db.query(
        "SELECT full_name FROM users WHERE id = ?",
        [farmerId]
      );

      await createNotification(
        "Listing Approval",
        "Listing edited",
        `${farmer.full_name} edited an approved ${livestockType} listing — it needs review again.`,
        id
      );

      return res.json({ message: "Listing updated and sent back for review" });
    }

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

const publishListing = async (req, res) => {
  try {
    const farmerId = req.user.id;
    const { id } = req.params;

    const [[listing]] = await db.query(
      "SELECT livestock_type, category, status FROM livestock_listings WHERE id = ? AND farmer_id = ?",
      [id, farmerId]
    );

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    if (listing.status !== "Draft") {
      return res.status(400).json({ message: "Only draft listings can be published" });
    }

    const requirement = await getActiveDocumentRequirement(listing.livestock_type, listing.category);
    if (requirement) {
      const [[withDocs]] = await db.query(
        "SELECT documents FROM livestock_listings WHERE id = ?",
        [id]
      );
      const documentCount = withDocs.documents
        ? JSON.parse(withDocs.documents).length
        : 0;

      if (documentCount < requirement.minDocuments) {
        return res.status(400).json({ message: formatRequirementMessage(listing.livestock_type, listing.category) });
      }
    }

    await db.query(
      "UPDATE livestock_listings SET status = 'Pending' WHERE id = ? AND farmer_id = ?",
      [id, farmerId]
    );

    const [[farmer]] = await db.query(
      "SELECT full_name FROM users WHERE id = ?",
      [farmerId]
    );

    await createNotification(
      "Listing Approval",
      "Listing submitted",
      `${farmer.full_name} submitted a ${listing.livestock_type} listing for review.`,
      id
    );

    res.json({ message: "Listing submitted for review" });
  } catch (error) {
    console.error("Publish listing error:", error);
    res.status(500).json({ message: "Server error publishing listing" });
  }
};

module.exports = {
  getMyListings,
  createListing,
  getListingById,
  updateListing,
  deleteListing,
  publishListing,
};