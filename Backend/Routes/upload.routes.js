const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");

const { uploadPrescriptionController } = require("../Controller/upload.controller");

const router = express.Router();
const uploadDir = path.join(__dirname, "..", "uploads");

fs.mkdirSync(uploadDir, { recursive: true });

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const safeName = String(file.originalname || "upload")
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    cb(null, `${Date.now()}_${safeName}`);
  },
});

const maxFileSizeMb = Number(process.env.UPLOAD_MAX_FILE_SIZE_MB) || 10;

const upload = multer({
  storage,
  limits: {
    fileSize: maxFileSizeMb * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const normalizedMime = String(file.mimetype || "").toLowerCase();
    if (!allowedMimeTypes.has(normalizedMime)) {
      const error = new Error("Only image and PDF files are allowed.");
      error.code = "UPLOAD_FILE_TYPE_NOT_ALLOWED";
      return cb(error);
    }

    return cb(null, true);
  },
});

function uploadSingleFile(req, res, next) {
  upload.single("file")(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          error: {
            code: "UPLOAD_FILE_TOO_LARGE",
            message: `File too large. Max upload size is ${maxFileSizeMb}MB.`,
          },
        });
      }

      return res.status(400).json({
        success: false,
        error: {
          code: "UPLOAD_VALIDATION_ERROR",
          message: error.message,
        },
      });
    }

    if (error.code === "UPLOAD_FILE_TYPE_NOT_ALLOWED") {
      return res.status(415).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    return next(error);
  });
}

router.post("/upload", uploadSingleFile, uploadPrescriptionController);

module.exports = router;
