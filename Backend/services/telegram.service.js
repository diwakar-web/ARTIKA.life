const fs = require("fs/promises");
const path = require("path");
const axios = require("axios");

function createTelegramError(message, statusCode = 502, code = "TELEGRAM_ERROR") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function getTelegramConfig() {
  const token = String(process.env.TELEGRAM_BOT_TOKEN || "").trim();
  if (!token) {
    throw createTelegramError("TELEGRAM_BOT_TOKEN is missing.", 500, "TELEGRAM_TOKEN_MISSING");
  }

  const apiBase = String(process.env.TELEGRAM_API_BASE || "https://api.telegram.org")
    .trim()
    .replace(/\/+$/, "");

  return {
    token,
    apiBase,
  };
}

function normalizeTelegramError(error, fallbackMessage) {
  if (error.statusCode) {
    throw error;
  }

  if (error.code === "ECONNABORTED") {
    throw createTelegramError("Telegram request timed out.", 504, "TELEGRAM_TIMEOUT");
  }

  if (error.response) {
    throw createTelegramError(
      `${fallbackMessage} Telegram status ${error.response.status}.`,
      502,
      "TELEGRAM_UPSTREAM_ERROR"
    );
  }

  throw createTelegramError("Unable to reach Telegram API.", 502, "TELEGRAM_UNREACHABLE");
}

function inferExtension(filePath) {
  const extension = path.extname(String(filePath || "")).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg" || extension === ".png" || extension === ".webp") {
    return extension;
  }

  return ".jpg";
}

async function getTelegramFilePath(fileId) {
  const { token, apiBase } = getTelegramConfig();

  try {
    const response = await axios.get(`${apiBase}/bot${token}/getFile`, {
      timeout: Number(process.env.TELEGRAM_TIMEOUT_MS) || 20000,
      params: {
        file_id: fileId,
      },
    });

    const filePath = response?.data?.result?.file_path;
    if (!filePath) {
      throw createTelegramError("Telegram did not return file_path.", 502, "TELEGRAM_FILE_PATH_MISSING");
    }

    return filePath;
  } catch (error) {
    normalizeTelegramError(error, "Failed to fetch Telegram file metadata.");
  }
}

async function downloadTelegramPhotoByFileId(fileId, targetDirectory) {
  const { token, apiBase } = getTelegramConfig();
  const remoteFilePath = await getTelegramFilePath(fileId);

  const extension = inferExtension(remoteFilePath);
  const localFileName = `tg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}${extension}`;
  const localFilePath = path.join(targetDirectory, localFileName);

  try {
    await fs.mkdir(targetDirectory, { recursive: true });

    const response = await axios.get(`${apiBase}/file/bot${token}/${remoteFilePath}`, {
      timeout: Number(process.env.TELEGRAM_TIMEOUT_MS) || 20000,
      responseType: "arraybuffer",
    });

    await fs.writeFile(localFilePath, Buffer.from(response.data));

    return {
      localFilePath,
      remoteFilePath,
    };
  } catch (error) {
    normalizeTelegramError(error, "Failed to download Telegram photo.");
  }
}

async function sendTelegramMessage(chatId, text) {
  const { token, apiBase } = getTelegramConfig();

  try {
    await axios.post(
      `${apiBase}/bot${token}/sendMessage`,
      {
        chat_id: String(chatId),
        text: String(text || ""),
        disable_web_page_preview: true,
      },
      {
        timeout: Number(process.env.TELEGRAM_TIMEOUT_MS) || 20000,
      }
    );
  } catch (error) {
    normalizeTelegramError(error, "Failed to send Telegram message.");
  }
}

module.exports = {
  downloadTelegramPhotoByFileId,
  sendTelegramMessage,
};
