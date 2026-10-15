const crypto = require("crypto");

// A farm's map pin is usually the farmer's home, so buyers browsing the
// marketplace see it moved 200–500 m in a direction that's fixed per
// farmer. Fixed, so asking again and again can't average it back to the
// real spot; derived from the server secret, so it can't be worked out
// from the farmer id. A buyer who has agreed on a deal with the farmer
// gets the exact pin, since they're about to go there for pickup. The
// farmer and MAO/admin always see the real one.

const MIN_OFFSET_M = 200;
const MAX_OFFSET_M = 500;
const METERS_PER_DEGREE_LAT = 111320;

const approximateFarmLocation = (lat, lng, farmerId) => {
  if (lat == null || lng == null) return { lat: null, lng: null };

  const digest = crypto.createHmac("sha256", process.env.JWT_SECRET).update(`farm-location:${farmerId}`).digest();
  const angle = (digest.readUInt16BE(0) / 0xffff) * 2 * Math.PI;
  const distance = MIN_OFFSET_M + (digest.readUInt16BE(2) / 0xffff) * (MAX_OFFSET_M - MIN_OFFSET_M);

  const latNum = Number(lat);
  const lngNum = Number(lng);
  const dLat = (distance * Math.cos(angle)) / METERS_PER_DEGREE_LAT;
  const dLng = (distance * Math.sin(angle)) / (METERS_PER_DEGREE_LAT * Math.cos((latNum * Math.PI) / 180));

  return {
    lat: Math.round((latNum + dLat) * 1e5) / 1e5,
    lng: Math.round((lngNum + dLng) * 1e5) / 1e5,
  };
};

// Farmers this buyer has a deal with whose terms are settled (the deal has
// reached Confirmation), so the exact pin is needed for pickup.
const farmersWithAgreedDeal = async (db, buyerId) => {
  const [rows] = await db.query(
    "SELECT DISTINCT farmer_id FROM transactions WHERE buyer_id = ? AND status = 'Pending' AND workflow_step = 'Confirmation'",
    [buyerId]
  );
  return new Set(rows.map((row) => row.farmer_id));
};

// Replaces farm_lat/farm_lng on a row with what this viewer may see, and
// says whether it's approximate. `farmerIdKey` names the row's farmer id.
const applyFarmLocationPrivacy = (row, farmerIdKey, exactFor) => {
  const farmerId = row[farmerIdKey];
  if (row.farm_lat == null || row.farm_lng == null || exactFor.has(farmerId)) {
    return { ...row, farm_location_approximate: false };
  }
  const { lat, lng } = approximateFarmLocation(row.farm_lat, row.farm_lng, farmerId);
  return { ...row, farm_lat: lat, farm_lng: lng, farm_location_approximate: true };
};

module.exports = { approximateFarmLocation, farmersWithAgreedDeal, applyFarmLocationPrivacy };
