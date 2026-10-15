const db = require("../config/db");
const { getCategory } = require("../utils/productCatalog");
const { VERUELA_BARANGAY_NAMES } = require("../utils/veruelaPlaces");

const getPeriodRange = (period) => {
  const now = new Date();

  if (period === "year") {
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear() + 1, 0, 1),
    };
  }

  if (period !== "current" && period !== "previous") return null;

  const offset = period === "previous" ? -1 : 0;
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);

  return { start, end };
};

// The span immediately before `range`, same length as `range` itself, for
// period-over-period comparison — works for a calendar month or a full year.
const getPriorRange = (range) => {
  if (!range) return null;
  const durationMs = range.end.getTime() - range.start.getTime();
  return {
    start: new Date(range.start.getTime() - durationMs),
    end: range.start,
  };
};

const pctChange = (current, previous) => {
  if (previous === 0) return current === 0 ? 0 : null; // null = "new" (no baseline to compare)
  return Math.round(((current - previous) / previous) * 100);
};

// Core headline metrics (farmers/buyers registered, livestock sold, trade
// value) for one date range + livestock-type filter — used for both the
// selected period and the prior period, so deltas compare like for like.
const fetchCoreMetrics = async (range, typeFilter) => {
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

  const userWhere = ["role = ?"];
  const userParamsBase = [];

  if (range) {
    userWhere.push("created_at >= ? AND created_at < ?");
    userParamsBase.push(range.start, range.end);
  }

  const [farmers] = await db.query(
    `SELECT COUNT(*) AS total FROM users WHERE ${userWhere.join(" AND ")}`,
    ["farmer", ...userParamsBase]
  );

  const [buyers] = await db.query(
    `SELECT COUNT(*) AS total FROM users WHERE ${userWhere.join(" AND ")}`,
    ["buyer", ...userParamsBase]
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

  return {
    totalFarmers: farmers[0].total,
    totalBuyers: buyers[0].total,
    livestockSold: sold[0].total,
    tradeValue: tradeValue[0].total,
  };
};

const buildDelta = (current, previous) => ({
  current,
  previous,
  pct: pctChange(current, previous),
});

// Livestock listing counts/value grouped by type, for one date range.
const fetchLivestockData = async (listingWhere, listingParams) => {
  const [rows] = await db.query(
    `SELECT
      l.livestock_type AS type,
      MAX(l.category) AS category,
      COUNT(l.id) AS total,
      COALESCE(SUM(l.price), 0) AS value
    FROM livestock_listings l
    WHERE ${listingWhere.join(" AND ")}
    GROUP BY l.livestock_type`,
    listingParams
  );
  return rows;
};

// Transaction outcome counts + value grouped by livestock type, for one
// date range.
const fetchMonthlyTransactions = async (trxWhere, trxParams) => {
  const [rows] = await db.query(
    `SELECT
      l.livestock_type,
      MAX(l.category) AS category,
      SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN t.status = 'Pending' THEN 1 ELSE 0 END) AS pending,
      COALESCE(SUM(CASE WHEN t.status = 'Completed' THEN t.amount ELSE 0 END), 0) AS totalValue
    FROM transactions t
    JOIN livestock_listings l ON t.listing_id = l.id
    WHERE ${trxWhere.join(" AND ")}
    GROUP BY l.livestock_type`,
    trxParams
  );
  return rows;
};

// Trade value + completed-transaction count for each of the last 6 calendar
// months (independent of the period filter, since a trend needs a fixed
// multi-month window) — zero-filled so months with no activity still show.
const fetchMonthlyTrend = async (typeFilter) => {
  const now = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const trxWhere = ["t.created_at >= ?", "t.status = 'Completed'"];
  const trxParams = [rangeStart];

  if (typeFilter) {
    trxWhere.push("l.livestock_type = ?");
    trxParams.push(typeFilter);
  }

  const [rows] = await db.query(
    `SELECT
      DATE_FORMAT(t.created_at, '%Y-%m') AS month,
      COALESCE(SUM(t.amount), 0) AS tradeValue,
      COUNT(*) AS completed
    FROM transactions t
    JOIN livestock_listings l ON t.listing_id = l.id
    WHERE ${trxWhere.join(" AND ")}
    GROUP BY month`,
    trxParams
  );

  const byMonth = new Map(rows.map((row) => [row.month, row]));

  return Array.from({ length: 6 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const found = byMonth.get(key);

    return {
      month: date.toLocaleDateString(undefined, { month: "short" }),
      tradeValue: found ? Number(found.tradeValue) : 0,
      completed: found ? Number(found.completed) : 0,
    };
  });
};

// Attach a period-over-period % delta to each row of a current-period
// dataset by matching against the same rows from the prior period.
const withRowDeltas = (currentRows, priorRows, key, field) => {
  const priorByKey = new Map(priorRows.map((row) => [row[key], row]));

  return currentRows.map((row) => {
    const prior = priorByKey.get(row[key]);
    const previous = prior ? Number(prior[field]) : 0;
    return {
      ...row,
      delta: buildDelta(Number(row[field]), previous),
    };
  });
};

const getAdminReports = async (req, res) => {
  try {
    const { period, livestockType } = req.query;
    const range = getPeriodRange(period);
    const priorRange = getPriorRange(range);
    const typeFilter = livestockType && livestockType !== "All Livestock" ? livestockType : null;

    const buildListingWhere = (r) => {
      const where = ["1=1"];
      const params = [];
      if (r) {
        where.push("l.created_at >= ? AND l.created_at < ?");
        params.push(r.start, r.end);
      }
      if (typeFilter) {
        where.push("l.livestock_type = ?");
        params.push(typeFilter);
      }
      return { where, params };
    };

    // Livestock Performance should reflect standing inventory only —
    // unlike the verification summary (which counts every outcome,
    // rejected included), removed/rejected listings don't belong here.
    const buildPerformanceWhere = (r) => {
      const base = buildListingWhere(r);
      return {
        where: [...base.where, "l.status NOT IN ('Removed', 'Rejected')"],
        params: base.params,
      };
    };

    const buildTrxWhere = (r) => {
      const where = ["1=1"];
      const params = [];
      if (r) {
        where.push("t.created_at >= ? AND t.created_at < ?");
        params.push(r.start, r.end);
      }
      if (typeFilter) {
        where.push("l.livestock_type = ?");
        params.push(typeFilter);
      }
      return { where, params };
    };

    const listingCurrent = buildListingWhere(range);
    const listingPrior = buildListingWhere(priorRange);
    const performanceCurrent = buildPerformanceWhere(range);
    const performancePrior = buildPerformanceWhere(priorRange);
    const trxCurrent = buildTrxWhere(range);
    const trxPrior = buildTrxWhere(priorRange);

    const [
      currentMetrics,
      priorMetrics,
      livestockDataCurrent,
      livestockDataPrior,
      verification,
      monthlyTransactionsCurrent,
      monthlyTransactionsPrior,
      monthlyTrend,
    ] = await Promise.all([
      fetchCoreMetrics(range, typeFilter),
      fetchCoreMetrics(priorRange, typeFilter),
      fetchLivestockData(performanceCurrent.where, performanceCurrent.params),
      fetchLivestockData(performancePrior.where, performancePrior.params),
      db.query(
        `SELECT
          SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) AS approved,
          SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
          SUM(CASE WHEN status IN ('Rejected', 'Flagged') THEN 1 ELSE 0 END) AS rejected
        FROM livestock_listings l
        WHERE ${listingCurrent.where.join(" AND ")}`,
        listingCurrent.params
      ).then(([rows]) => rows),
      fetchMonthlyTransactions(trxCurrent.where, trxCurrent.params),
      fetchMonthlyTransactions(trxPrior.where, trxPrior.params),
      fetchMonthlyTrend(typeFilter),
    ]);

    const totalLivestock = livestockDataCurrent.reduce(
      (sum, item) => sum + Number(item.total),
      0
    );

    const livestockDataWithDelta = withRowDeltas(
      livestockDataCurrent,
      livestockDataPrior,
      "type",
      "value"
    );

    const formattedLivestockData = livestockDataWithDelta.map((item) => ({
      type: item.type,
      total: item.total,
      percent:
        totalLivestock > 0
          ? `${Math.round((Number(item.total) / totalLivestock) * 100)}%`
          : "0%",
      value: item.value,
      delta: item.delta,
    }));

    const monthlyTransactionsWithDelta = withRowDeltas(
      monthlyTransactionsCurrent,
      monthlyTransactionsPrior,
      "livestock_type",
      "totalValue"
    );

    res.json({
      metrics: currentMetrics,
      deltas: {
        totalFarmers: buildDelta(currentMetrics.totalFarmers, priorMetrics.totalFarmers),
        totalBuyers: buildDelta(currentMetrics.totalBuyers, priorMetrics.totalBuyers),
        livestockSold: buildDelta(currentMetrics.livestockSold, priorMetrics.livestockSold),
        tradeValue: buildDelta(currentMetrics.tradeValue, priorMetrics.tradeValue),
      },
      livestockData: formattedLivestockData,
      verification: {
        approved: verification[0].approved || 0,
        pending: verification[0].pending || 0,
        rejected: verification[0].rejected || 0,
      },
      monthlyTransactions: monthlyTransactionsWithDelta,
      monthlyTrend,
      generatedAt: new Date(),
    });
  } catch (error) {
    console.error("Admin reports error:", error);
    res.status(500).json({ message: "Server error loading reports" });
  }
};

// Every farmer with their barangay and purok, for the "Farmers by
// Barangay" report. The page groups, filters and exports them; farmers
// who haven't picked a barangay yet come back with barangay NULL.
const getFarmersByBarangay = async (req, res) => {
  try {
    const [farmers] = await db.query(`
      SELECT
        id,
        full_name,
        phone,
        barangay,
        purok,
        sitio,
        is_verified,
        verification_status,
        is_active,
        created_at
      FROM users
      WHERE role = 'farmer'
      ORDER BY full_name
    `);

    const [listings] = await db.query(`
      SELECT farmer_id, livestock_type, category, quantity, unit
      FROM livestock_listings
      WHERE status = 'Available'
    `);

    const listingTotals = new Map();
    for (const listing of listings) {
      const totals = listingTotals.get(listing.farmer_id) || { activeListings: 0, livestockHead: 0 };
      totals.activeListings += 1;
      if (getCategory(listing.livestock_type, listing.category) === "livestock" && listing.unit !== "kg") {
        totals.livestockHead += Number(listing.quantity) || 0;
      }
      listingTotals.set(listing.farmer_id, totals);
    }

    res.json({
      barangays: VERUELA_BARANGAY_NAMES,
      farmers: farmers.map((farmer) => ({
        ...farmer,
        ...(listingTotals.get(farmer.id) || { activeListings: 0, livestockHead: 0 }),
      })),
    });
  } catch (error) {
    console.error("Farmers by barangay report error:", error);
    res.status(500).json({ message: "Server error loading farmers by barangay" });
  }
};

module.exports = { getAdminReports, getFarmersByBarangay };
