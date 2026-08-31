const db = require("../config/db");

const getPeriodRange = (period) => {
  if (period !== "current" && period !== "previous") return null;

  const now = new Date();
  const offset = period === "previous" ? -1 : 0;
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);

  return { start, end };
};

const getAdminReports = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    const { period, livestockType } = req.query;
    const range = getPeriodRange(period);
    const typeFilter = livestockType && livestockType !== "All Livestock" ? livestockType : null;

    const listingWhere = ["1=1"];
    const listingParams = [];

    if (range) {
      listingWhere.push("l.created_at >= ? AND l.created_at < ?");
      listingParams.push(range.start, range.end);
    }
    if (typeFilter) {
      listingWhere.push("l.livestock_type = ?");
      listingParams.push(typeFilter);
    }

    const trxWhere = ["1=1"];
    const trxParams = [];

    if (range) {
      trxWhere.push("t.created_at >= ? AND t.created_at < ?");
      trxParams.push(range.start, range.end);
    }
    if (typeFilter) {
      trxWhere.push("l.livestock_type = ?");
      trxParams.push(typeFilter);
    }

    const [farmers] = await db.query(
      "SELECT COUNT(*) AS total FROM users WHERE role = 'farmer'"
    );

    const [buyers] = await db.query(
      "SELECT COUNT(*) AS total FROM users WHERE role = 'buyer'"
    );

    const [sold] = await db.query(
      `SELECT COUNT(*) AS total
       FROM transactions t
       JOIN livestock_listings l ON t.listing_id = l.id
       WHERE t.status = 'Completed' AND ${trxWhere.join(" AND ")}`,
      trxParams
    );

    const [tradeValue] = await db.query(
      `SELECT COALESCE(SUM(t.amount), 0) AS total
       FROM transactions t
       JOIN livestock_listings l ON t.listing_id = l.id
       WHERE t.status = 'Completed' AND ${trxWhere.join(" AND ")}`,
      trxParams
    );

    const [livestockData] = await db.query(
      `SELECT
        l.livestock_type AS type,
        COUNT(l.id) AS total,
        COALESCE(SUM(l.price), 0) AS value
      FROM livestock_listings l
      WHERE ${listingWhere.join(" AND ")}
      GROUP BY l.livestock_type`,
      listingParams
    );

    const [verification] = await db.query(
      `SELECT
        SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status IN ('Rejected', 'Flagged') THEN 1 ELSE 0 END) AS rejected
      FROM livestock_listings l
      WHERE ${listingWhere.join(" AND ")}`,
      listingParams
    );

    const [monthlyTransactions] = await db.query(
      `SELECT
        l.livestock_type,
        SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN t.status = 'Pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN t.status = 'Flagged' THEN 1 ELSE 0 END) AS flagged,
        COALESCE(SUM(CASE WHEN t.status = 'Completed' THEN t.amount ELSE 0 END), 0) AS totalValue
      FROM transactions t
      JOIN livestock_listings l ON t.listing_id = l.id
      WHERE ${trxWhere.join(" AND ")}
      GROUP BY l.livestock_type`,
      trxParams
    );

    const totalLivestock = livestockData.reduce(
      (sum, item) => sum + Number(item.total),
      0
    );

    const formattedLivestockData = livestockData.map((item) => ({
      type: item.type,
      total: item.total,
      percent:
        totalLivestock > 0
          ? `${Math.round((Number(item.total) / totalLivestock) * 100)}%`
          : "0%",
      value: item.value,
    }));

    res.json({
      metrics: {
        totalFarmers: farmers[0].total,
        totalBuyers: buyers[0].total,
        livestockSold: sold[0].total,
        tradeValue: tradeValue[0].total,
      },
      livestockData: formattedLivestockData,
      verification: {
        approved: verification[0].approved || 0,
        pending: verification[0].pending || 0,
        rejected: verification[0].rejected || 0,
      },
      monthlyTransactions,
    });
  } catch (error) {
    console.error("Admin reports error:", error);
    res.status(500).json({ message: "Server error loading reports" });
  }
};

module.exports = { getAdminReports };
