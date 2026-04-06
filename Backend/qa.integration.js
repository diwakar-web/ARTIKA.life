/* eslint-disable no-console */
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const sharp = require("sharp");

const mongoose = require("mongoose");

const connectDB = require("./config/db");
const Chat = require("./Model/chat.model");
const Prescription = require("./Model/prescription.model");
const { buildPrompt } = require("./Utils/promptBuilder");
const { callLLM } = require("./services/llm.service");

const REQUIRED_ENV_KEYS = ["MONGODB_URI", "OLLAMA_BASE_URL", "OLLAMA_MODEL"];
const QA_PORT = Number(process.env.QA_PORT) || 5055;
const BASE_URL = `http://127.0.0.1:${QA_PORT}`;

const qaUserId = `qa_user_${Date.now()}`;
const tempDir = path.join(__dirname, "uploads", "qa-temp");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) {
    const error = new Error(message);
    error.isAssertion = true;
    throw error;
  }
}

function hrNow() {
  return process.hrtime.bigint();
}

function toMs(start, end) {
  return Number(end - start) / 1_000_000;
}

function summarizeStatus(pass, detail) {
  return {
    pass: Boolean(pass),
    detail: detail || "",
  };
}

async function ensureTempDir() {
  await fs.promises.mkdir(tempDir, { recursive: true });
}

async function writeTinyPng(filePath) {
  const svg = [
    '<svg width="1200" height="500" xmlns="http://www.w3.org/2000/svg">',
    '<rect width="100%" height="100%" fill="white"/>',
    '<text x="70" y="170" font-size="48" font-family="Arial" fill="black">Prescription</text>',
    '<text x="70" y="250" font-size="40" font-family="Arial" fill="black">Paracetamol 500mg</text>',
    '<text x="70" y="320" font-size="36" font-family="Arial" fill="black">1 tablet after food twice daily</text>',
    "</svg>",
  ].join("");

  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  await fs.promises.writeFile(filePath, png);
}

function buildSimplePdf(textLines) {
  const printableText = textLines
    .map((line, index) => {
      const escaped = String(line).replace(/([()\\])/g, "\\$1");
      const y = 720 - index * 28;
      return `BT\n/F1 16 Tf\n72 ${y} Td\n(${escaped}) Tj\nET`;
    })
    .join("\n");

  const objects = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    4: `<< /Length ${Buffer.byteLength(printableText, "utf8")} >>\nstream\n${printableText}\nendstream`,
    5: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  };

  let output = "%PDF-1.4\n";
  const offsets = [0];

  for (let index = 1; index <= 5; index += 1) {
    offsets[index] = Buffer.byteLength(output, "utf8");
    output += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(output, "utf8");
  output += "xref\n0 6\n0000000000 65535 f \n";

  for (let index = 1; index <= 5; index += 1) {
    output += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  output += "trailer\n<< /Size 6 /Root 1 0 R >>\n";
  output += `startxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(output, "utf8");
}

async function startServer() {
  console.log(`[QA] Starting isolated server on port ${QA_PORT}...`);
  const child = spawn(process.execPath, ["server.js"], {
    cwd: __dirname,
    env: {
      ...process.env,
      PORT: String(QA_PORT),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  let started = false;

  child.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    stdout += text;
    if (text.includes("Server is running on port")) {
      started = true;
    }
  });

  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const startDeadlineMs = 30_000;
  const startAt = Date.now();

  while (!started && Date.now() - startAt < startDeadlineMs) {
    if (child.exitCode !== null) {
      throw new Error(`Server exited early. stdout=${stdout} stderr=${stderr}`);
    }
    // Poll for startup completion.
    // eslint-disable-next-line no-await-in-loop
    await sleep(200);
  }

  if (!started) {
    child.kill("SIGTERM");
    throw new Error(`Server did not start within timeout. stdout=${stdout} stderr=${stderr}`);
  }

  return {
    child,
    getLogs: () => ({ stdout, stderr }),
  };
}

async function stopServer(child) {
  if (!child || child.exitCode !== null) {
    return;
  }

  child.kill("SIGTERM");
  const deadline = Date.now() + 5000;

  while (child.exitCode === null && Date.now() < deadline) {
    // eslint-disable-next-line no-await-in-loop
    await sleep(100);
  }

  if (child.exitCode === null) {
    child.kill("SIGKILL");
  }
}

function buildJsonRequest(pathname, body) {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    redirect: "manual",
    signal: AbortSignal.timeout(60_000),
  };
}

async function postJson(pathname, body) {
  const response = await fetch(`${BASE_URL}${pathname}`, buildJsonRequest(pathname, body));
  const text = await response.text();

  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch (_error) {
    parsed = text;
  }

  return {
    status: response.status,
    data: parsed,
    raw: text,
  };
}

async function postMultipart(pathname, filePath, fileMime, fields = {}) {
  const form = new FormData();

  const fileBuffer = await fs.promises.readFile(filePath);
  const blob = new Blob([fileBuffer], { type: fileMime });
  form.append("file", blob, path.basename(filePath));

  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      form.append(key, String(value));
    }
  });

  const response = await fetch(`${BASE_URL}${pathname}`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(120_000),
  });

  const text = await response.text();
  let parsed;

  try {
    parsed = text ? JSON.parse(text) : null;
  } catch (_error) {
    parsed = text;
  }

  return {
    status: response.status,
    data: parsed,
    raw: text,
  };
}

async function runEnvValidation() {
  console.log("[QA] Running env validation...");
  const missing = [];
  const empty = [];

  REQUIRED_ENV_KEYS.forEach((key) => {
    if (!(key in process.env)) {
      missing.push(key);
      return;
    }

    if (!String(process.env[key] || "").trim()) {
      empty.push(key);
    }
  });

  return {
    check: "ENV_VALIDATION",
    result: summarizeStatus(missing.length === 0 && empty.length === 0, {
      required: REQUIRED_ENV_KEYS,
      missing,
      empty,
      values: {
        MONGODB_URI: process.env.MONGODB_URI ? "[set]" : "[missing]",
        OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || "[missing]",
        OLLAMA_MODEL: process.env.OLLAMA_MODEL || "[missing]",
      },
    }),
  };
}

async function runDatabaseValidation() {
  console.log("[QA] Running database validation...");
  const dbResult = {
    connected: false,
    writeChat: false,
    writePrescription: false,
    readChat: false,
    readPrescription: false,
  };

  await connectDB();
  dbResult.connected = mongoose.connection.readyState === 1;

  const chat = await Chat.create({
    userId: qaUserId,
    role: "user",
    message: "QA db message",
    severity: "low",
  });

  dbResult.writeChat = Boolean(chat?._id);

  const prescription = await Prescription.create({
    userId: qaUserId,
    source: "upload",
    originalFileName: "qa.txt",
    mimeType: "image/png",
    filePath: path.join(tempDir, "qa.png"),
    rawText: "Paracetamol 500mg",
    medicines: [
      {
        medicineName: "Paracetamol",
        dosage: "500mg",
        instructions: "After meals",
      },
    ],
    severity: "low",
    llmRawOutput:
      '{"medicines":[{"medicine_name":"Paracetamol","dosage":"500mg","instructions":"After meals"}]}',
  });

  dbResult.writePrescription = Boolean(prescription?._id);

  const readChat = await Chat.findOne({ _id: chat._id }).lean();
  const readPrescription = await Prescription.findOne({ _id: prescription._id }).lean();

  dbResult.readChat = Boolean(readChat?.message === "QA db message");
  dbResult.readPrescription = Boolean(readPrescription?.medicines?.length === 1);

  return {
    check: "DATABASE_TEST",
    result: summarizeStatus(
      Object.values(dbResult).every(Boolean),
      {
        ...dbResult,
        chatId: String(chat._id),
        prescriptionId: String(prescription._id),
      }
    ),
  };
}

async function runChatValidation() {
  console.log("[QA] Running chat endpoint validation...");
  const cases = [];

  const normalStart = hrNow();
  const normal = await postJson("/chat", {
    userId: qaUserId,
    message: "I have mild headache since yesterday. What should I do?",
  });
  const normalEnd = hrNow();

  cases.push({
    name: "normal_message",
    status: normal.status,
    pass:
      normal.status === 200
      && normal.data?.success === true
      && typeof normal.data?.data?.response === "string"
      && Number.isInteger(normal.data?.data?.historyUsed),
    latencyMs: Math.round(toMs(normalStart, normalEnd)),
    responsePreview: String(normal.data?.data?.response || "").slice(0, 200),
    historyUsed: normal.data?.data?.historyUsed,
  });

  const second = await postJson("/chat", {
    userId: qaUserId,
    message: "Now I also have light fever.",
  });

  cases.push({
    name: "memory_window_progression",
    status: second.status,
    pass:
      second.status === 200
      && second.data?.success === true
      && Number(second.data?.data?.historyUsed) >= 1
      && Number(second.data?.data?.historyUsed) <= 5,
    historyUsed: second.data?.data?.historyUsed,
  });

  const emptyMessage = await postJson("/chat", {
    userId: qaUserId,
    message: "   ",
  });

  cases.push({
    name: "empty_message",
    status: emptyMessage.status,
    pass: emptyMessage.status === 400,
    body: emptyMessage.data,
  });

  const longMessage = await postJson("/chat", {
    userId: qaUserId,
    message: "x".repeat(2200),
  });

  cases.push({
    name: "long_message",
    status: longMessage.status,
    pass: longMessage.status === 400,
    body: longMessage.data,
  });

  const invalidUser = await postJson("/chat", {
    userId: "   ",
    message: "hello",
  });

  cases.push({
    name: "invalid_userId",
    status: invalidUser.status,
    pass: invalidUser.status === 400,
    body: invalidUser.data,
  });

  const allPass = cases.every((item) => item.pass);

  return {
    check: "CHAT_ENDPOINT_TEST",
    result: summarizeStatus(allPass, cases),
  };
}

async function runUploadValidation() {
  console.log("[QA] Running upload/OCR validation...");
  await ensureTempDir();

  const tinyPngPath = path.join(tempDir, "qa-tiny.png");
  const pdfPath = path.join(tempDir, "qa-prescription.pdf");
  const txtPath = path.join(tempDir, "qa-invalid.txt");
  const largePath = path.join(tempDir, "qa-large.bin");

  await writeTinyPng(tinyPngPath);
  await fs.promises.writeFile(
    pdfPath,
    buildSimplePdf([
      "Prescription",
      "Paracetamol 500mg",
      "1 tablet after food twice daily",
    ])
  );
  await fs.promises.writeFile(txtPath, "not an image");

  const largeBuffer = Buffer.alloc(11 * 1024 * 1024, 1);
  await fs.promises.writeFile(largePath, largeBuffer);

  const imageUpload = await postMultipart("/upload", tinyPngPath, "image/png", {
    userId: qaUserId,
  });

  const pdfUpload = await postMultipart("/upload", pdfPath, "application/pdf", {
    userId: qaUserId,
  });

  const invalidType = await postMultipart("/upload", txtPath, "text/plain", {
    userId: qaUserId,
  });

  const largeFile = await postMultipart("/upload", largePath, "image/png", {
    userId: qaUserId,
  });

  const resultCases = [
    {
      name: "upload_image",
      status: imageUpload.status,
      pass:
        imageUpload.status === 201
        && imageUpload.data?.success === true
        && Array.isArray(imageUpload.data?.data?.medicines),
      body: imageUpload.data,
    },
    {
      name: "upload_pdf",
      status: pdfUpload.status,
      pass:
        pdfUpload.status === 201
        && pdfUpload.data?.success === true
        && Array.isArray(pdfUpload.data?.data?.medicines),
      body: pdfUpload.data,
    },
    {
      name: "invalid_file_type",
      status: invalidType.status,
      pass: invalidType.status === 415,
      body: invalidType.data,
    },
    {
      name: "oversized_file",
      status: largeFile.status,
      pass: largeFile.status === 400,
      body: largeFile.data,
    },
  ];

  const allPass = resultCases.every((item) => item.pass);

  return {
    check: "OCR_UPLOAD_TEST",
    result: summarizeStatus(allPass, resultCases),
  };
}

async function runLlmValidation() {
  console.log("[QA] Running LLM integration validation...");
  const results = [];

  const start = hrNow();
  const prompt = buildPrompt([], "I have mild cough");
  const response = await callLLM(prompt);
  const end = hrNow();

  results.push({
    name: "ollama_call",
    pass: typeof response === "string" && response.trim().length > 0,
    latencyMs: Math.round(toMs(start, end)),
    preview: response.slice(0, 200),
  });

  const oldTimeout = process.env.OLLAMA_TIMEOUT_MS;
  process.env.OLLAMA_TIMEOUT_MS = "1";

  // Force a fresh module init with the tiny timeout.
  delete require.cache[require.resolve("./services/llm.service")];
  // eslint-disable-next-line global-require
  const tinyTimeoutService = require("./services/llm.service");

  try {
    await tinyTimeoutService.callLLM("Short test prompt");
    results.push({
      name: "timeout_handling",
      pass: false,
      detail: "Expected timeout error but call succeeded.",
    });
  } catch (error) {
    results.push({
      name: "timeout_handling",
      pass: error.code === "LLM_TIMEOUT" && Number(error.statusCode) === 504,
      detail: {
        code: error.code,
        statusCode: error.statusCode,
        message: error.message,
      },
    });
  } finally {
    if (oldTimeout === undefined) {
      delete process.env.OLLAMA_TIMEOUT_MS;
    } else {
      process.env.OLLAMA_TIMEOUT_MS = oldTimeout;
    }

    delete require.cache[require.resolve("./services/llm.service")];
  }

  return {
    check: "LLM_INTEGRATION_TEST",
    result: summarizeStatus(results.every((item) => item.pass), results),
  };
}

async function runErrorHandlingValidation() {
  console.log("[QA] Running error-handling validation...");
  const checks = [];

  // Invalid route check.
  const notFoundResponse = await fetch(`${BASE_URL}/missing-route`, {
    method: "GET",
    signal: AbortSignal.timeout(15_000),
  });
  const notFoundBody = await notFoundResponse.json();

  checks.push({
    name: "invalid_route",
    pass: notFoundResponse.status === 404 && notFoundBody?.success === false,
    status: notFoundResponse.status,
    body: notFoundBody,
  });

  // Simulate Ollama down with unreachable URL through a fresh module.
  const oldBaseUrl = process.env.OLLAMA_BASE_URL;
  process.env.OLLAMA_BASE_URL = "http://127.0.0.1:65535";
  delete require.cache[require.resolve("./services/llm.service")];
  // eslint-disable-next-line global-require
  const failingService = require("./services/llm.service");

  try {
    await failingService.callLLM("test prompt");
    checks.push({
      name: "ollama_down_service",
      pass: false,
      detail: "Expected LLM_UNREACHABLE but request succeeded.",
    });
  } catch (error) {
    checks.push({
      name: "ollama_down_service",
      pass: error.code === "LLM_UNREACHABLE" || error.code === "LLM_TIMEOUT",
      detail: {
        code: error.code,
        statusCode: error.statusCode,
        message: error.message,
      },
    });
  } finally {
    if (oldBaseUrl === undefined) {
      delete process.env.OLLAMA_BASE_URL;
    } else {
      process.env.OLLAMA_BASE_URL = oldBaseUrl;
    }
    delete require.cache[require.resolve("./services/llm.service")];
  }

  // Simulate Mongo down with invalid URI.
  const oldMongoUri = process.env.MONGODB_URI;
  process.env.MONGODB_URI = "mongodb://127.0.0.1:27099/nonexistent";
  delete require.cache[require.resolve("./config/db")];
  // eslint-disable-next-line global-require
  const failingDbConnect = require("./config/db");

  try {
    await failingDbConnect();
    checks.push({
      name: "mongodb_down_connect",
      pass: false,
      detail: "Expected DB connection failure but connection succeeded.",
    });
  } catch (error) {
    checks.push({
      name: "mongodb_down_connect",
      pass: true,
      detail: {
        message: error.message,
      },
    });
  } finally {
    if (oldMongoUri === undefined) {
      delete process.env.MONGODB_URI;
    } else {
      process.env.MONGODB_URI = oldMongoUri;
    }
    delete require.cache[require.resolve("./config/db")];
  }

  return {
    check: "ERROR_HANDLING_TEST",
    result: summarizeStatus(checks.every((item) => item.pass), checks),
  };
}

async function runPerformanceValidation() {
  console.log("[QA] Running performance validation...");
  const history = [
    { role: "user", message: "a".repeat(300) },
    { role: "assistant", message: "b".repeat(300) },
    { role: "user", message: "c".repeat(300) },
    { role: "assistant", message: "d".repeat(300) },
    { role: "user", message: "e".repeat(300) },
  ];

  const prompt = buildPrompt(history, "Hello there");
  const promptLength = prompt.length;

  const start = hrNow();
  await callLLM(buildPrompt([], "Quick response test"));
  const end = hrNow();

  return {
    check: "PERFORMANCE_TEST",
    result: summarizeStatus(promptLength < 4000 && toMs(start, end) < 30_000, {
      promptLength,
      llmLatencyMs: Math.round(toMs(start, end)),
      notes: {
        memoryWindowConfig: Number(process.env.MEMORY_WINDOW) || 5,
        llmTokenLimit: 120,
      },
    }),
  };
}

async function runSecurityValidation() {
  console.log("[QA] Running security validation...");
  const checks = [];

  const maliciousPayload = await postJson("/chat", {
    userId: qaUserId,
    message: "<script>alert('x')</script> ; DROP TABLE users;",
  });

  checks.push({
    name: "malicious_input_no_crash",
    pass: maliciousPayload.status === 200 || maliciousPayload.status === 400,
    status: maliciousPayload.status,
  });

  const emptyUserId = await postJson("/chat", {
    userId: "",
    message: "hello",
  });

  checks.push({
    name: "empty_user_rejected",
    pass: emptyUserId.status === 400,
    status: emptyUserId.status,
    body: emptyUserId.data,
  });

  return {
    check: "SECURITY_TEST",
    result: summarizeStatus(checks.every((item) => item.pass), checks),
  };
}

async function cleanupQaData() {
  await Chat.deleteMany({ userId: qaUserId });
  await Prescription.deleteMany({ userId: qaUserId });

  if (fs.existsSync(tempDir)) {
    const files = await fs.promises.readdir(tempDir);
    await Promise.all(
      files.map((fileName) => fs.promises.unlink(path.join(tempDir, fileName)).catch(() => null))
    );
  }
}

async function main() {
  const report = {
    runAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    checks: [],
    summary: {
      passed: 0,
      failed: 0,
    },
  };

  let server;

  try {
    const envResult = await runEnvValidation();
    report.checks.push(envResult);

    server = await startServer();

    report.checks.push(await runDatabaseValidation());
    report.checks.push(await runChatValidation());
    report.checks.push(await runUploadValidation());
    report.checks.push(await runLlmValidation());
    report.checks.push(await runErrorHandlingValidation());
    report.checks.push(await runPerformanceValidation());
    report.checks.push(await runSecurityValidation());
  } finally {
    await cleanupQaData().catch(() => null);
    await mongoose.disconnect().catch(() => null);
    if (server?.child) {
      await stopServer(server.child);
    }
  }

  report.checks.forEach((entry) => {
    if (entry.result.pass) {
      report.summary.passed += 1;
    } else {
      report.summary.failed += 1;
    }
  });

  const reportPath = path.join(__dirname, "qa-report.json");
  await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2));

  console.log(`[QA] Report written to ${reportPath}`);
  console.log(JSON.stringify(report, null, 2));

  if (report.summary.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("QA runner failed:", error);
  process.exitCode = 1;
});