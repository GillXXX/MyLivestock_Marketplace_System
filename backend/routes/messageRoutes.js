const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  getConversations,
  getMessages,
  sendMessage,
} = require("../controllers/messageController");

router.get("/conversations", protect, getConversations);
router.get("/:conversationId", protect, getMessages);
router.post("/:conversationId", protect, sendMessage);

module.exports = router;