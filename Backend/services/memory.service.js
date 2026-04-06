const Chat = require("../Model/chat.model");

async function getRecentMessages(userId, limit = 5) {
  const normalizedLimit = Math.min(Math.max(Number(limit) || 5, 3), 5);

  const recentMessages = await Chat.find({ userId })
    .sort({ timestamp: -1 })
    .limit(normalizedLimit)
    .select("role message timestamp severity -_id")
    .lean();

  // Reverse to keep oldest-to-newest order for prompt building.
  return recentMessages.reverse();
}

async function saveMessage({ userId, role, message, severity = "low" }) {
  return Chat.create({
    userId,
    role,
    message,
    severity,
    timestamp: new Date(),
  });
}

async function saveConversation(userId, userMessage, assistantMessage, severity = "low") {
  return Chat.insertMany([
    {
      userId,
      role: "user",
      message: userMessage,
      severity,
      timestamp: new Date(),
    },
    {
      userId,
      role: "assistant",
      message: assistantMessage,
      severity,
      timestamp: new Date(),
    },
  ]);
}

module.exports = {
  getRecentMessages,
  saveMessage,
  saveConversation,
};
