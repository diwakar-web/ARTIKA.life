const User = require("../models/user.model");
const { getRecentMessages, saveConversation } = require("../services/memory.service");
const { callLLM } = require("../services/llm.service");
const { buildPrompt } = require("../utils/promptBuilder");

// Lightweight keyword-based triage level for UI signaling.
function classifySeverity(text) {
  const input = String(text || "").toLowerCase();

  const highKeywords = [
    "chest pain",
    "cannot breathe",
    "difficulty breathing",
    "fainted",
    "seizure",
    "stroke",
    "severe bleeding",
  ];

  const mediumKeywords = [
    "fever",
    "vomit",
    "infection",
    "dizziness",
    "headache",
    "persistent cough",
    "pain",
  ];

  if (highKeywords.some((keyword) => input.includes(keyword))) {
    return "high";
  }

  if (mediumKeywords.some((keyword) => input.includes(keyword))) {
    return "medium";
  }

  return "low";
}

async function chatController(req, res, next) {
  try {
    const { userId, message } = req.body;

    if (!userId || !String(userId).trim()) {
      return res.status(400).json({
        success: false,
        error: { message: "userId is required." },
      });
    }

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        success: false,
        error: { message: "message is required." },
      });
    }

    const cleanUserId = String(userId).trim();
    const cleanMessage = String(message).trim();

    if (cleanMessage.length > 2000) {
      return res.status(400).json({
        success: false,
        error: { message: "message is too long. Max length is 2000." },
      });
    }

    await User.updateOne(
      { userId: cleanUserId },
      {
        $setOnInsert: { userId: cleanUserId },
        $set: { lastActiveAt: new Date() },
      },
      { upsert: true }
    );

    const memoryWindow = Number(process.env.MEMORY_WINDOW) || 5;
    // Only the latest 3-5 turns are used to keep context focused.
    const history = await getRecentMessages(cleanUserId, memoryWindow);
    const prompt = buildPrompt(history, cleanMessage);
    const assistantReply = await callLLM(prompt);

    const severity = classifySeverity(`${cleanMessage} ${assistantReply}`);
    await saveConversation(cleanUserId, cleanMessage, assistantReply, severity);

    return res.status(200).json({
      success: true,
      data: {
        userId: cleanUserId,
        response: assistantReply,
        severity,
        historyUsed: history.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  chatController,
};
