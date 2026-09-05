const db = require("../config/db");

// Local-calendar-day key (not UTC) so it lines up with how a human reads
// "today" regardless of server timezone — mixing this with a UTC-based key
// (e.g. toISOString) can silently shift buckets by a day.
const dayKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

const daysAgo = (n) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
};

const pctChange = (current, previous) => {
  if (previous === 0) return current === 0 ? 0 : null; // null = "new" (no baseline to compare)
  return Math.round(((current - previous) / previous) * 100);
};

// Bucketing is done in JS from raw timestamps (rather than SQL GROUP BY a
// formatted string) so the bucket keys are guaranteed to use the same
// timezone convention as the day-key array below — no risk of the DB
// server's timezone silently disagreeing with Node's.
const buildGrowthTrend = async () => {
  const rangeStart = daysAgo(29);

  const [listingRows] = await db.query(
    "SELECT created_at FROM livestock_listings WHERE created_at >= ?",
    [rangeStart]
  );

  const [userRows] = await db.query(
    "SELECT created_at FROM users WHERE role != 'admin' AND created_at >= ?",
    [rangeStart]
  );

  const listingsByDay = {};
  listingRows.forEach((r) => {
    const key = dayKey(new Date(r.created_at));
    listingsByDay[key] = (listingsByDay[key] || 0) + 1;
  });

  const usersByDay = {};
  userRows.forEach((r) => {
    const key = dayKey(new Date(r.created_at));
    usersByDay[key] = (usersByDay[key] || 0) + 1;
  });

  const trend = [];
  for (let i = 29; i >= 0; i--) {
    const date = daysAgo(i);
    const key = dayKey(date);
    trend.push({
      date: key,
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      listings: listingsByDay[key] || 0,
      users: usersByDay[key] || 0,
    });
  }

  return trend;
};

const buildRevenueTrend = async () => {
  const rangeStart = daysAgo(83); // 12 weeks

  const [trxRows] = await db.query(
    "SELECT updated_at, amount FROM transactions WHERE status = 'Completed' AND updated_at >= ?",
    [rangeStart]
  );

  const byDay = {};
  trxRows.forEach((r) => {
    const key = dayKey(new Date(r.updated_at));
    if (!byDay[key]) byDay[key] = { count: 0, value: 0 };
    byDay[key].count += 1;
    byDay[key].value += Number(r.amount);
  });

  const trend = [];
  for (let week = 11; week >= 0; week--) {
    let count = 0;
    let value = 0;
    const weekStart = daysAgo(week * 7 + 6);

    for (let d = 0; d < 7; d++) {
      const key = dayKey(daysAgo(week * 7 + d));
      if (byDay[key]) {
        count += byDay[key].count;
        value += byDay[key].value;
      }
    }

    trend.push({
      label: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count,
      value,
    });
  }

  return trend;
};

const buildDeltas = async () => {
  const currentStart = daysAgo(29);
  const previousStart = daysAgo(59);

  const [[newUsersCurrent], [newUsersPrev]] = await Promise.all([
    db.query(
      "SELECT COUNT(*) AS total FROM users WHERE role != 'admin' AND created_at >= ?",
      [currentStart]
    ),
    db.query(
      "SELECT COUNT(*) AS total FROM users WHERE role != 'admin' AND created_at >= ? AND created_at < ?",
      [previousStart, currentStart]
    ),
  ]);

  const [[newListingsCurrent], [newListingsPrev]] = await Promise.all([
    db.query("SELECT COUNT(*) AS total FROM livestock_listings WHERE created_at >= ?", [
      currentStart,
    ]),
    db.query(
      "SELECT COUNT(*) AS total FROM livestock_listings WHERE created_at >= ? AND created_at < ?",
      [previousStart, currentStart]
    ),
  ]);

  const [[pendingCurrent], [pendingPrev]] = await Promise.all([
    db.query(
      "SELECT COUNT(*) AS total FROM livestock_listings WHERE status = 'Pending' AND created_at >= ?",
      [currentStart]
    ),
    db.query(
      "SELECT COUNT(*) AS total FROM livestock_listings WHERE status = 'Pending' AND created_at >= ? AND created_at < ?",
      [previousStart, currentStart]
    ),
  ]);

  const [[completedCurrent], [completedPrev]] = await Promise.all([
    db.query(
      "SELECT COUNT(*) AS total FROM transactions WHERE status = 'Completed' AND updated_at >= ?",
      [currentStart]
    ),
    db.query(
      "SELECT COUNT(*) AS total FROM transactions WHERE status = 'Completed' AND updated_at >= ? AND updated_at < ?",
      [previousStart, currentStart]
    ),
  ]);

  return {
    registeredUsers: {
      current: newUsersCurrent[0].total,
      previous: newUsersPrev[0].total,
      pct: pctChange(newUsersCurrent[0].total, newUsersPrev[0].total),
    },
    activeListings: {
      current: newListingsCurrent[0].total,
      previous: newListingsPrev[0].total,
      pct: pctChange(newListingsCurrent[0].total, newListingsPrev[0].total),
    },
    pendingVerification: {
      current: pendingCurrent[0].total,
      previous: pendingPrev[0].total,
      pct: pctChange(pendingCurrent[0].total, pendingPrev[0].total),
    },
    completedTrades: {
      current: completedCurrent[0].total,
      previous: completedPrev[0].total,
      pct: pctChange(completedCurrent[0].total, completedPrev[0].total),
    },
  };
};

const getAdminDashboard = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    const [users] = await db.query(
      "SELECT COUNT(*) AS total FROM users WHERE role != 'admin'"
    );

    const [activeListings] = await db.query(
      "SELECT COUNT(*) AS total FROM livestock_listings WHERE status = 'Available'"
    );

    const [pendingVerification] = await db.query(
      "SELECT COUNT(*) AS total FROM livestock_listings WHERE status = 'Pending'"
    );

    const [overdueVerification] = await db.query(
      "SELECT COUNT(*) AS total FROM livestock_listings WHERE status = 'Pending' AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)"
    );

    const [completedTrades] = await db.query(
      "SELECT COUNT(*) AS total FROM transactions WHERE status = 'Completed'"
    );

    const [flaggedTotalRows] = await db.query(
      "SELECT COUNT(*) AS total FROM livestock_listings WHERE status = 'Flagged'"
    );

    const [flaggedListings] = await db.query(
      `SELECT l.id, l.livestock_type, l.breed, l.created_at, u.full_name AS farmer_name
       FROM livestock_listings l
       JOIN users u ON l.farmer_id = u.id
       WHERE l.status = 'Flagged'
       ORDER BY l.created_at DESC
       LIMIT 8`
    );

    // Pending-only, oldest-first — this is the actual triage list an admin
    // works through, not a general "recent activity" feed. Available/Sold/
    // etc. listings don't belong in a verification queue.
    const [verificationQueue] = await db.query(
      `SELECT
        l.id,
        l.livestock_type,
        l.health_status,
        l.status,
        l.created_at,
        u.id AS farmer_id,
        u.full_name AS farmer_name,
        u.email AS farmer_email,
        u.phone AS farmer_phone,
        u.location AS farmer_location,
        u.farm_location AS farmer_farm_location,
        u.is_verified AS farmer_is_verified,
        u.created_at AS farmer_joined_at
      FROM livestock_listings l
      JOIN users u ON l.farmer_id = u.id
      WHERE l.status = 'Pending'
      ORDER BY l.created_at ASC
      LIMIT 8`
    );

    const [sellerLocations] = await db.query(
      "SELECT COUNT(*) AS total FROM users WHERE role = 'farmer' AND farm_location IS NOT NULL"
    );

    // Real totals across every listing (not capped like the widgets above),
    // backing the dashboard's category and status breakdown charts.
    const [listingsByCategory] = await db.query(
      "SELECT livestock_type, COUNT(*) AS total FROM livestock_listings GROUP BY livestock_type"
    );

    const [listingsByStatus] = await db.query(
      "SELECT status, COUNT(*) AS total FROM livestock_listings GROUP BY status"
    );

    const [growthTrend, revenueTrend, deltas] = await Promise.all([
      buildGrowthTrend(),
      buildRevenueTrend(),
      buildDeltas(),
    ]);

    res.json({
      stats: {
        registeredUsers: users[0].total,
        activeListings: activeListings[0].total,
        pendingVerification: pendingVerification[0].total,
        overdueVerification: overdueVerification[0].total,
        completedTrades: completedTrades[0].total,
        sellerLocations: sellerLocations[0].total,
        flaggedTotal: flaggedTotalRows[0].total,
      },
      verificationQueue,
      listingsByCategory,
      listingsByStatus,
      flaggedListings,
      deltas,
      trends: {
        growth: growthTrend,
        revenue: revenueTrend,
      },
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({ message: "Server error loading admin dashboard" });
  }
};

module.exports = { getAdminDashboard };
