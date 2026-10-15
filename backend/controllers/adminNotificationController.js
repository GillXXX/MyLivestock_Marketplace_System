const db = require("../config/db");

// Account-provisioning alerts (new farmer/buyer signups) are Super Admin's
// user-management domain, not MAO staff's day-to-day moderation scope.
// Staff never see them, so they can't mark them read or delete them either.
const staffScope = (req) =>
  req.user.role === "mao_staff" ? " AND type != 'User Registration'" : "";

const getAdminNotifications = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM notifications WHERE 1=1${staffScope(req)} ORDER BY created_at DESC LIMIT 100`
    );

    const notifications = rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      time: row.created_at,
      status: row.is_read ? "Read" : "Unread",
      relatedId: row.related_id,
    }));

    const totalAlerts = notifications.length;
    const unreadAlerts = notifications.filter((n) => n.status === "Unread").length;
    const verificationRequests = notifications.filter(
      (n) => n.type === "Verification Request" && n.status === "Unread"
    ).length;
    const resolvedToday = notifications.filter((n) => n.status === "Read").length;

    res.json({
      notifications,
      stats: {
        totalAlerts,
        unreadAlerts,
        verificationRequests,
        resolvedToday,
      },
      categories: {
        listingApprovals: notifications.filter((n) => n.type === "Listing Approval").length,
        documentVerification: notifications.filter((n) => n.type === "Verification Request").length,
        transactionAlerts: notifications.filter((n) => n.type === "Transaction Alert").length,
        userReports: notifications.filter((n) => n.type === "User Registration").length,
      },
    });
  } catch (error) {
    console.error("Admin notifications error:", error);
    res.status(500).json({ message: "Server error loading notifications" });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    await db.query(`UPDATE notifications SET is_read = 1 WHERE id = ?${staffScope(req)}`, [
      req.params.id,
    ]);

    res.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Mark notification read error:", error);
    res.status(500).json({ message: "Server error updating notification" });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    await db.query(`UPDATE notifications SET is_read = 1 WHERE is_read = 0${staffScope(req)}`);

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    res.status(500).json({ message: "Server error updating notifications" });
  }
};

const deleteNotification = async (req, res) => {
  try {
    await db.query(`DELETE FROM notifications WHERE id = ?${staffScope(req)}`, [req.params.id]);

    res.json({ message: "Notification deleted" });
  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({ message: "Server error deleting notification" });
  }
};

module.exports = {
  getAdminNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
};
