const db = require("../config/db");

const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    const query =
      role === "farmer"
        ? "c.farmer_id = ?"
        : "c.buyer_id = ?";

    const [conversations] = await db.query(
      `SELECT 
        c.id,
        c.listing_id,
        l.livestock_type,
        l.breed,
        farmer.full_name AS farmer_name,
        buyer.full_name AS buyer_name,
        (
          SELECT m.message 
          FROM messages m 
          WHERE m.conversation_id = c.id 
          ORDER BY m.created_at DESC 
          LIMIT 1
        ) AS last_message,
        (
          SELECT m.created_at 
          FROM messages m 
          WHERE m.conversation_id = c.id 
          ORDER BY m.created_at DESC 
          LIMIT 1
        ) AS last_time
      FROM conversations c
      JOIN livestock_listings l ON c.listing_id = l.id
      JOIN users farmer ON c.farmer_id = farmer.id
      JOIN users buyer ON c.buyer_id = buyer.id
      WHERE ${query}
      ORDER BY last_time DESC`,
      [userId]
    );

    res.json(conversations);
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({ message: "Server error loading conversations" });
  }
};

const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const [messages] = await db.query(
      `SELECT 
        m.id,
        m.sender_id,
        m.message,
        m.created_at,
        u.full_name AS sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at ASC`,
      [conversationId]
    );

    res.json(messages);
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ message: "Server error loading messages" });
  }
};

const sendMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { conversationId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    await db.query(
      "INSERT INTO messages (conversation_id, sender_id, message) VALUES (?, ?, ?)",
      [conversationId, senderId, message]
    );

    res.status(201).json({ message: "Message sent successfully" });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ message: "Server error sending message" });
  }
};

module.exports = {
  getConversations,
  getMessages,
  sendMessage,
};