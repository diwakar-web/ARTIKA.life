const fs = require("fs/promises");
const path = require("path");
const Tesseract = require("tesseract.js");
const sharp = require("sharp");
const pdfParse = require("pdf-parse");

function createOcrError(message, code = "OCR_FAILED", statusCode = 422) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function cleanText(input) {
  return String(input || "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function runTesseract(target) {
  const result = await Tesseract.recognize(target, process.env.OCR_LANG || "eng");
  return cleanText(result?.data?.text);
}

async function extractTextFromPdf(filePath) {
  const fileBuffer = await fs.readFile(filePath);

  // Fast path for text-based PDFs before running heavy OCR.
  const parsedPdf = await pdfParse(fileBuffer).catch(() => ({ text: "" }));
  const directText = cleanText(parsedPdf?.text);
  if (directText) {
    return directText;
  }

  let pageCount = 1;
  try {
    const metadata = await sharp(fileBuffer, { pages: -1 }).metadata();
    pageCount = Math.max(Number(metadata?.pages) || 1, 1);
  } catch (_error) {
    throw createOcrError(
      "PDF OCR rendering is not available in this runtime. Use a sharp build with PDF support.",
      "OCR_PDF_RENDER_UNAVAILABLE",
      422
    );
  }

  const pageTexts = [];
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const imageBuffer = await sharp(fileBuffer, {
      density: 300,
      page: pageIndex,
    })
      .png()
      .toBuffer();

    const pageText = await runTesseract(imageBuffer);
    if (pageText) {
      pageTexts.push(`Page ${pageIndex + 1}\n${pageText}`);
    }
  }

  const combinedText = cleanText(pageTexts.join("\n\n"));
  if (!combinedText) {
    throw createOcrError("OCR could not detect readable text from this PDF.", "OCR_EMPTY_TEXT", 422);
  }

  return combinedText;
}

async function extractTextFromImage(filePath) {
  if (!filePath || !String(filePath).trim()) {
    throw createOcrError("filePath is required for OCR.", "OCR_FILEPATH_MISSING", 400);
  }

  const resolvedPath = path.resolve(String(filePath).trim());
  const stat = await fs.stat(resolvedPath).catch(() => null);
  if (!stat || !stat.isFile()) {
    throw createOcrError("Uploaded file was not found on disk.", "OCR_FILE_NOT_FOUND", 400);
  }

  const extension = path.extname(resolvedPath).toLowerCase();

  try {
    const extractedText =
      extension === ".pdf" ? await extractTextFromPdf(resolvedPath) : await runTesseract(resolvedPath);

    if (!extractedText) {
      throw createOcrError(
        "OCR completed but no readable text was found in the file.",
        "OCR_EMPTY_TEXT",
        422
      );
    }

    return extractedText;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    throw createOcrError(`OCR failed: ${error.message}`, "OCR_PROCESSING_FAILED", 422);
  }
}

module.exports = {
  extractTextFromImage,
};
