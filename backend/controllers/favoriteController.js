const db = require("../config/db");

const getFavorites = async (req, res) => {
  try {
    const buyerId = req.user.id;

    const [favorites] = await db.query(
      `SELECT 
        f.id AS favorite_id,
        f.created_at AS saved_at,
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
        u.full_name AS seller_name,
        u.is_verified AS seller_verified
      FROM favorites f
      JOIN livestock_listings l ON f.listing_id = l.id
      JOIN users u ON l.farmer_id = u.id
      WHERE f.buyer_id = ?
      ORDER BY f.created_at DESC`,
      [buyerId]
    );

    const totalValue = favorites.reduce(
      (sum, item) => sum + Number(item.price || 0),
      0
    );

    res.json({
      favorites,
      stats: {
        savedListings: favorites.length,
        verifiedSellers: favorites.filter((item) => item.seller_verified).length,
        savedValue: totalValue,
        activeInquiries: 0,
      },
    });
  } catch (error) {
    console.error("Favorites error:", error);
    res.status(500).json({ message: "Server error loading favorites" });
  }
};

const addFavorite = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const { listingId } = req.body;

    if (!listingId) {
      return res.status(400).json({ message: "Listing ID is required" });
    }

    await db.query(
      "INSERT IGNORE INTO favorites (buyer_id, listing_id) VALUES (?, ?)",
      [buyerId, listingId]
    );

    res.status(201).json({ message: "Listing saved successfully" });
  } catch (error) {
    console.error("Add favorite error:", error);
    res.status(500).json({ message: "Server error saving favorite" });
  }
};

const removeFavorite = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const { listingId } = req.params;

    await db.query(
      "DELETE FROM favorites WHERE buyer_id = ? AND listing_id = ?",
      [buyerId, listingId]
    );

    res.json({ message: "Favorite removed successfully" });
  } catch (error) {
    console.error("Remove favorite error:", error);
    res.status(500).json({ message: "Server error removing favorite" });
  }
};

module.exports = { getFavorites, addFavorite, removeFavorite };