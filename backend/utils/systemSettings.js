const db = require("../config/db");

// Single row of admin-configurable settings (System Settings page). Shared
// helper so every controller that needs to check a setting reads it the
// same way instead of each writing its own SELECT.
const getSystemSettings = async () => {
  const [[row]] = await db.query("SELECT * FROM system_settings WHERE id = 1");
  return row || {};
};

module.exports = { getSystemSettings };
