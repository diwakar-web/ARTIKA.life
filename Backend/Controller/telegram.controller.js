const path = require("path");

const User = require("../models/user.model");
const Prescription = require("../models/prescription.model");
const { extractTextFromImage } = require("../services/ocr.service");
const { callLLM } = require("../services/llm.service");
const { downloadTelegramPhotoByFileId, sendTelegramMessage } = require("../services/telegram.service");
const {
  enableReminder,
  markReminderDone,
  setCaretakerForUser,
  upsertReminderSnapshot,
} = require("../services/reminder.service");
const { buildPrescriptionExtractionPrompt } = require("../utils/promptBuilder");

const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

function createControllerError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function detectSeverity(text) {
  const input = String(text || "").toLowerCase();

  const highKeywords = [
    "urgent",
    "immediately",
    "emergency",
    "severe",
    "stat",
    "anaphylaxis",
    "overdose",
    "chest pain",
    "shortness of breath",
  ];

  const mediumKeywords = [
    "antibiotic",
    "insulin",
    "steroid",
    "monitor",
    "pain",
    "fever",
    "infection",
    "twice daily",
    "three times",
  ];

  if (highKeywords.some((keyword) => input.includes(keyword))) {
    return "high";
  }

  if (mediumKeywords.some((keyword) => input.includes(keyword))) {
    return "medium";
  }

  return "low";
}

function parseJsonOnlyResponse(rawResponse) {
  const raw = String(rawResponse || "").trim();
  if (!raw) {
    throw createControllerError("LLM returned empty output.", 502, "LLM_EMPTY");
  }

  const candidate = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(candidate);
  } catch (_error) {
    const objectMatch = candidate.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch (_innerError) {
        // Fall through to normalized parse error.
      }
    }

    console.error("[telegram][llm] Invalid JSON response:", raw);
    throw createControllerError(
      "LLM did not return valid JSON for prescription extraction.",
      502,
      "LLM_INVALID_JSON"
    );
  }
}

function normalizeMedicines(parsedPayload) {
  const sourceArray = Array.isArray(parsedPayload)
    ? parsedPayload
    : Array.isArray(parsedPayload?.medicines)
      ? parsedPayload.medicines
      : [];

  return sourceArray
    .map((entry) => ({
      medicineName: String(entry?.medicine_name ?? entry?.medicineName ?? "").trim(),
      dosage: String(entry?.dosage ?? "").trim(),
      instructions: String(entry?.instructions ?? "").trim(),
    }))
    .filter((entry) => entry.medicineName || entry.dosage || entry.instructions);
}

function formatMedicinesMessage(medicines) {
  if (!Array.isArray(medicines) || !medicines.length) {
    return "I could read the image, but no clear medicines were found. Please send a clearer prescription photo.";
  }

  const medicineLines = medicines
    .map((entry) => {
      const medicineName = entry.medicineName || "Medicine";
      const dosage = entry.dosage ? ` ${entry.dosage}` : "";
      const instructions = entry.instructions || "as prescribed";
      return `- ${medicineName}${dosage} -> ${instructions}`;
    })
    .join("\n");

  return `Medicines found:\n\n${medicineLines}`;
}

function parseCaretakerCommand(text) {
  const match = String(text || "").trim().match(/^(?:caretaker|\/caretaker)\s+(-?\d+)$/i);
  return match ? match[1] : null;
}

function inferMimeTypeFromFilePath(filePath) {
  const extension = path.extname(String(filePath || "")).toLowerCase();

  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";

  return "image/jpeg";
}

async function handlePhotoMessage(message, userId) {
  const chatId = String(message?.chat?.id || "").trim();
  const photoArray = Array.isArray(message?.photo) ? message.photo : [];

  if (!chatId) {
    throw createControllerError("Telegram chat id is missing.", 400, "TELEGRAM_CHAT_MISSING");
  }

  if (!photoArray.length) {
    await sendTelegramMessage(chatId, "Please send a prescription image.");
    return;
  }

  const largestPhoto = photoArray.reduce((largest, current) => {
    if (!largest) {
      return current;
    }

    return Number(current?.file_size || 0) > Number(largest?.file_size || 0) ? current : largest;
  }, null);

  if (!largestPhoto?.file_id) {
    await sendTelegramMessage(chatId, "Please send a prescription image.");
    return;
  }

  try {
    const downloaded = await downloadTelegramPhotoByFileId(largestPhoto.file_id, UPLOADS_DIR);
    const rawText = await extractTextFromImage(downloaded.localFilePath);

    console.log("[telegram][ocr] Extracted OCR text:", rawText);

    const prompt = buildPrescriptionExtractionPrompt(rawText);
    const llmRawOutput = await callLLM(prompt, {
      jsonOnly: true,
      options: {
        temperature: 0,
        num_predict: 220,
        top_p: 0.1,
      },
    });

    console.log("[telegram][llm] Raw LLM response:", llmRawOutput);

    const parsed = parseJsonOnlyResponse(llmRawOutput);
    const medicines = normalizeMedicines(parsed);

    const severityInput = [
      rawText,
      medicines.map((item) => `${item.medicineName} ${item.dosage} ${item.instructions}`).join(" "),
    ].join(" ");

    const savedPrescription = await Prescription.create({
      userId,
      source: "telegram",
      originalFileName: path.basename(downloaded.localFilePath),
      mimeType: inferMimeTypeFromFilePath(downloaded.localFilePath),
      filePath: downloaded.localFilePath,
      rawText: rawText.slice(0, 100000),
      medicines,
      severity: detectSeverity(severityInput),
      llmRawOutput: String(llmRawOutput || "").slice(0, 150000),
    });

    await upsertReminderSnapshot({
      userId,
      chatId,
      medicines: savedPrescription.medicines,
    });

    await sendTelegramMessage(chatId, formatMedicinesMessage(savedPrescription.medicines));
  } catch (error) {
    console.error("[telegram] Photo processing failed:", error.message);

    if (String(error.code || "").startsWith("OCR_")) {
      await sendTelegramMessage(chatId, "Could not read image. Try clearer photo.");
      return;
    }

    await sendTelegramMessage(chatId, "Unable to process this prescription right now. Please try again.");
  }
}

async function handleTextMessage(message, userId) {
  const chatId = String(message?.chat?.id || "").trim();
  const text = String(message?.text || "").trim();
  const normalized = text.toLowerCase();

  if (!chatId) {
    throw createControllerError("Telegram chat id is missing.", 400, "TELEGRAM_CHAT_MISSING");
  }

  const caretakerId = parseCaretakerCommand(text);
  if (caretakerId) {
    await setCaretakerForUser({ userId, caretakerId });
    await sendTelegramMessage(chatId, "Caretaker linked successfully.");
    return;
  }

  if (normalized === "done" || normalized === "/done") {
    const marked = await markReminderDone({ userId });
    await sendTelegramMessage(
      chatId,
      marked
        ? "Marked as completed. I will send the next reminder on schedule."
        : "No active reminder is waiting for DONE right now."
    );
    return;
  }

  if (normalized === "hi" || normalized === "hello" || normalized === "/start") {
    await sendTelegramMessage(
      chatId,
      "Welcome to ARTIKA Telegram bot. Send a prescription photo to extract medicines, then use 'remind me' to enable reminders."
    );
    return;
  }

  if (normalized === "help" || normalized === "/help") {
    await sendTelegramMessage(
      chatId,
      [
        "How to use:",
        "1) Send a prescription image.",
        "2) Use 'remind me' to start reminders.",
        "3) Reply DONE after medicine.",
        "4) Use 'caretaker <chat_id>' to set caretaker alerts.",
      ].join("\n")
    );
    return;
  }

  if (normalized === "remind me") {
    await enableReminder({ userId, chatId });
    await sendTelegramMessage(
      chatId,
      "Reminder enabled. I will send medication reminders. Reply DONE after taking your medicine."
    );
    return;
  }

  await sendTelegramMessage(chatId, "Please send a prescription image.");
}

async function telegramWebhookController(req, res, next) {
  try {
    const update = req.body || {};
    const message = update?.message;

    if (!message) {
      return res.status(200).json({
        success: true,
        message: "No message payload in update.",
      });
    }

    const chatId = String(message?.chat?.id || "").trim();
    if (!chatId) {
      return res.status(200).json({
        success: false,
        error: {
          code: "TELEGRAM_CHAT_MISSING",
          message: "Telegram chat id is missing.",
        },
      });
    }

    const userId = chatId;

    await User.updateOne(
      { userId },
      {
        $setOnInsert: { userId },
        $set: { lastActiveAt: new Date() },
      },
      { upsert: true }
    );

    if (Array.isArray(message?.photo) && message.photo.length > 0) {
      await handlePhotoMessage(message, userId);
    } else if (typeof message?.text === "string") {
      await handleTextMessage(message, userId);
    } else {
      await sendTelegramMessage(chatId, "Please send a prescription image.");
    }

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  telegramWebhookController,
};
