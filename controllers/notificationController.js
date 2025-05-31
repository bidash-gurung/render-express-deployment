// controllers/notificationController.js

const db = require("../config/db"); // Adjust the path based on your structure

// Get all notifications
exports.getAllNotifications = async (req, res) => {
  try {
    const [notifications] = await db.query(
      `SELECT id, notification, date, time FROM notification ORDER BY id DESC`
    );
    res.status(200).json({ success: true, data: notifications });
  } catch (err) {
    console.error("Error fetching notifications:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch notifications." });
  }
};
