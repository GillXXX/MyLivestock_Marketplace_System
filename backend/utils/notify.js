const db = require("../config/db");
const { getSystemSettings } = require("./systemSettings");

// The `notifications` table has no recipient column — it's the single
// admin-facing alert feed (System Settings > "Enable admin notification
// alerts" is the on/off switch for it), not a per-user inbox, so gating it
// here at the one insert point covers every caller.
const createNotification = async (type, title, message, relatedId = null) => {
  try {
    const settings = await getSystemSettings();
    if (settings.admin_notifications === 0) return;

    await db.query(
      "INSERT INTO notifications (type, title, message, related_id) VALUES (?, ?, ?, ?)",
      [type, title, message, relatedId]
    );
  } catch (error) {
    console.error("Create notification error:", error);
  }
};

module.exports = { createNotification };
