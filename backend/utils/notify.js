const db = require("../config/db");

const createNotification = async (type, title, message, relatedId = null) => {
  try {
    await db.query(
      "INSERT INTO notifications (type, title, message, related_id) VALUES (?, ?, ?, ?)",
      [type, title, message, relatedId]
    );
  } catch (error) {
    console.error("Create notification error:", error);
  }
};

module.exports = { createNotification };
