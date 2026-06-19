const db = require("../config/db");

const getAdminSettings = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    const [settings] = await db.query("SELECT * FROM system_settings WHERE id = 1");

    res.json({ settings: settings[0] });
  } catch (error) {
    console.error("Admin settings error:", error);
    res.status(500).json({ message: "Server error loading settings" });
  }
};

const updateAdminSettings = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    const {
      system_name,
      municipality,
      admin_office,
      livestock_types,
      default_listing_status,
      transaction_workflow,
      secure_login,
      role_based_access,
      account_deactivation,
      document_verification,
      admin_notifications,
    } = req.body;

    await db.query(
      `UPDATE system_settings SET
        system_name = ?,
        municipality = ?,
        admin_office = ?,
        livestock_types = ?,
        default_listing_status = ?,
        transaction_workflow = ?,
        secure_login = ?,
        role_based_access = ?,
        account_deactivation = ?,
        document_verification = ?,
        admin_notifications = ?
      WHERE id = 1`,
      [
        system_name,
        municipality,
        admin_office,
        livestock_types,
        default_listing_status,
        transaction_workflow,
        secure_login ? 1 : 0,
        role_based_access ? 1 : 0,
        account_deactivation ? 1 : 0,
        document_verification ? 1 : 0,
        admin_notifications ? 1 : 0,
      ]
    );

    res.json({ message: "Settings saved successfully" });
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({ message: "Server error saving settings" });
  }
};

module.exports = { getAdminSettings, updateAdminSettings };