const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  getConversations,
  getMessages,
  sendMessage,
  deleteConversation,
  pingTyping,
} = require("../controllers/messageController");

router.get("/conversations", protect, getConversations);
router.get("/:conversationId", protect, getMessages);
router.post("/:conversationId", protect, sendMessage);
router.delete("/:conversationId", protect, deleteConversation);
router.put("/:conversationId/typing", protect, pingTyping);

module.exports = router;