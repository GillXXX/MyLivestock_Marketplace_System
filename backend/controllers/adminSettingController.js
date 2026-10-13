const db = require("../config/db");

const LISTING_STATUS_OPTIONS = ["Pending Approval", "Auto Approved", "Draft"];
const WORKFLOW_OPTIONS = ["Strict Workflow", "Flexible Workflow"];

const getAdminSettings = async (req, res) => {
  try {
    const [settings] = await db.query("SELECT * FROM system_settings WHERE id = 1");

    res.json({ settings: settings[0] });
  } catch (error) {
    console.error("Admin settings error:", error);
    res.status(500).json({ message: "Server error loading settings" });
  }
};

const updateAdminSettings = async (req, res) => {
  try {
    const {
      system_name,
      municipality,
      admin_office,
      livestock_types,
      default_listing_status,
      transaction_workflow,
      account_deactivation,
      document_verification,
      admin_notifications,
    } = req.body;

    // Anything else would silently fall back to a default where these
    // settings are read (listingController, buyerTransactionController).
    if (!LISTING_STATUS_OPTIONS.includes(default_listing_status)) {
      return res.status(400).json({ message: "Please choose a valid default listing status" });
    }

    if (!WORKFLOW_OPTIONS.includes(transaction_workflow)) {
      return res.status(400).json({ message: "Please choose a valid transaction workflow" });
    }

    // Sign-in and role separation are always enforced, so the old
    // secure_login / role_based_access columns are no longer written.
    await db.query(
      `UPDATE system_settings SET
        system_name = ?,
        municipality = ?,
        admin_office = ?,
        livestock_types = ?,
        default_listing_status = ?,
        transaction_workflow = ?,
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