const Prescription = require("../Model/prescription.model");
const { extractTextFromImage } = require("../services/ocr.service");
const { callLLM, callLLMStream } = require("../services/llm.service");
const { buildPrescriptionExtractionPrompt } = require("../Utils/promptBuilder");

const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

function createHttpError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function normalizeBoolean(value) {
  return String(value || "")
    .trim()
    .toLowerCase() === "true";
}

function ensureAllowedMimeType(mimeType) {
  if (!ALLOWED_UPLOAD_MIME_TYPES.has(String(mimeType || "").toLowerCase())) {
    throw createHttpError(
      "Unsupported file type. Only images (jpeg/png/webp/heic) and PDF are allowed.",
      415,
      "UPLOAD_FILE_TYPE_NOT_ALLOWED"
    );
  }
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
    throw createHttpError("LLM returned an empty response for prescription extraction.", 502, "LLM_EMPTY");
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
        // Fall through to structured error below.
      }
    }

    console.error("[upload][llm] Failed to parse JSON. Raw LLM response:", raw);

    const parsingError = createHttpError(
      "LLM did not return valid JSON for prescription extraction.",
      502,
      "LLM_INVALID_JSON"
    );

    parsingError.details = {
      llmRawResponse: raw,
    };

    throw parsingError;
  }
}

function normalizeMedicines(parsedPayload) {
  const sourceArray = Array.isArray(parsedPayload)
    ? parsedPayload
    : Array.isArray(parsedPayload?.medicines)
      ? parsedPayload.medicines
      : [];

  const normalized = sourceArray
    .map((entry) => ({
      medicineName: String(entry?.medicine_name ?? entry?.medicineName ?? "").trim(),
      dosage: String(entry?.dosage ?? "").trim(),
      instructions: String(entry?.instructions ?? "").trim(),
    }))
    .filter((entry) => entry.medicineName || entry.dosage || entry.instructions);

  return normalized;
}

function initSseResponse(res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }
}

function sendSseEvent(res, event, payload) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

async function structurePrescriptionWithLlm(rawText, options = {}) {
  const prompt = buildPrescriptionExtractionPrompt(rawText);
  const useStreaming = Boolean(options.stream);
  const onToken = typeof options.onToken === "function" ? options.onToken : null;
  const llmRequestConfig = {
    jsonOnly: true,
    options: {
      temperature: 0,
      num_predict: 220,
      top_p: 0.1,
    },
  };

  const llmRawOutput = useStreaming
    ? await callLLMStream(prompt, {
      ...llmRequestConfig,
      onToken,
    })
    : await callLLM(prompt, llmRequestConfig);

  console.log("[upload][llm] Raw LLM response:", llmRawOutput);

  const parsedPayload = parseJsonOnlyResponse(llmRawOutput);
  const medicines = normalizeMedicines(parsedPayload);

  return {
    medicines,
    llmRawOutput,
  };
}

async function processPrescriptionPipeline({
  filePath,
  originalFileName,
  mimeType,
  source,
  userId,
  stream,
  onToken,
}) {
  const rawText = await extractTextFromImage(filePath);
  console.log("[upload][ocr] Extracted OCR text:", rawText);

  const { medicines, llmRawOutput } = await structurePrescriptionWithLlm(rawText, {
    stream,
    onToken,
  });

  const severityInput = [
    rawText,
    medicines.map((item) => `${item.medicineName} ${item.dosage} ${item.instructions}`).join(" "),
  ].join(" ");

  const severity = detectSeverity(severityInput);

  const savedPrescription = await Prescription.create({
    userId,
    source,
    originalFileName,
    mimeType,
    filePath,
    rawText: rawText.slice(0, 100000),
    medicines,
    severity,
    llmRawOutput: String(llmRawOutput || "").slice(0, 150000),
  });

  return {
    id: savedPrescription._id,
    userId: savedPrescription.userId,
    source: savedPrescription.source,
    severity: savedPrescription.severity,
    medicines: savedPrescription.medicines,
    createdAt: savedPrescription.createdAt,
  };
}

async function uploadPrescriptionController(req, res, next) {
  try {
    if (!req.file) {
      throw createHttpError(
        "No file uploaded. Send multipart/form-data with field name 'file'.",
        400,
        "UPLOAD_FILE_MISSING"
      );
    }

    ensureAllowedMimeType(req.file.mimetype);

    const useStreaming = normalizeBoolean(req.query.stream)
      || normalizeBoolean(process.env.PRESCRIPTION_LLM_STREAM);

    if (useStreaming) {
      initSseResponse(res);
      sendSseEvent(res, "status", { message: "OCR started" });
    }

    const userId = req.body?.userId ? String(req.body.userId).trim() : undefined;

    const result = await processPrescriptionPipeline({
      filePath: req.file.path,
      originalFileName: req.file.originalname,
      mimeType: req.file.mimetype,
      source: "upload",
      userId,
      stream: useStreaming,
      onToken: useStreaming
        ? (token) => sendSseEvent(res, "token", { token })
        : null,
    });

    if (useStreaming) {
      sendSseEvent(res, "done", { success: true, data: result });
      return res.end();
    }

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (res.headersSent) {
      sendSseEvent(res, "error", {
        success: false,
        error: {
          code: error.code || "PRESCRIPTION_PROCESSING_FAILED",
          message: error.message,
        },
      });
      return res.end();
    }

    return next(error);
  }
}

module.exports = {
  uploadPrescriptionController,
};
