const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const { chatUpload } = require("../middleware/uploadMiddleware");

const {
  getConversations,
  getMessages,
  sendMessage,
  deleteMessage,
  forwardMessage,
  deleteConversation,
  pingTyping,
} = require("../controllers/messageController");

router.get("/conversations", protect, getConversations);
router.get("/:conversationId", protect, getMessages);
router.post("/:conversationId", protect, chatUpload.single("attachment"), sendMessage);
router.delete("/:conversationId", protect, deleteConversation);
router.delete("/:conversationId/:messageId", protect, deleteMessage);
router.post("/:conversationId/:messageId/forward", protect, forwardMessage);
router.put("/:conversationId/typing", protect, pingTyping);

module.exports = router;