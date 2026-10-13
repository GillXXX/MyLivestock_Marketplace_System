const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
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

router.get("/conversations", protect, requireRole("farmer", "buyer"), getConversations);
router.get("/:conversationId", protect, requireRole("farmer", "buyer"), getMessages);
router.post("/:conversationId", protect, requireRole("farmer", "buyer"), chatUpload.single("attachment"), sendMessage);
router.delete("/:conversationId", protect, requireRole("farmer", "buyer"), deleteConversation);
router.delete("/:conversationId/:messageId", protect, requireRole("farmer", "buyer"), deleteMessage);
router.post("/:conversationId/:messageId/forward", protect, requireRole("farmer", "buyer"), forwardMessage);
router.put("/:conversationId/typing", protect, requireRole("farmer", "buyer"), pingTyping);

module.exports = router;