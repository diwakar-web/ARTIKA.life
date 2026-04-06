const mongoose = require("mongoose");

// ─────────────────────────────────────────────
//  SUB-SCHEMAS  (embedded documents)
// ─────────────────────────────────────────────

/**
 * GrowthData Sub-Schema
 * Used when category is "Kid" or "Newborn".
 * Tracks basic physical growth metrics.
 */
const growthDataSchema = new mongoose.Schema(
  {
    weight: { type: Number, default: null },       // in kg
    height: { type: Number, default: null },       // in cm
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""],
      default: "",
    },
    allergies: { type: String, default: "" },      // comma-separated or free text
  },
  { _id: false } // no separate _id for sub-documents
);

/**
 * VaccineRecord Sub-Schema
 * Used only when category is "Newborn".
 * Each entry tracks one vaccine's status (done / scheduled / not done).
 */
const vaccineRecordSchema = new mongoose.Schema(
  {
    vaccineName: { type: String, required: true }, // e.g. "BCG", "Hepatitis B"
    recommendedTime: { type: String, default: "" }, // e.g. "At Birth", "6-14 Weeks"
    status: {
      type: String,
      enum: ["Done", "Scheduled", "Not Done"],
      default: "Scheduled",
    },
    isDone: { type: Boolean, default: false },     // quick boolean flag for Done check
  },
  { _id: false }
);

/**
 * HealthLockerDocument Sub-Schema
 * Stores a reference (Google Drive link) to a document uploaded by the user.
 * The actual file lives in Google Drive; we only store the shareable link here.
 */
const healthLockerDocSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },         // Display name (file name)
    link: { type: String, required: true },         // Google Drive shareable link
    type: {
      type: String,
      enum: ["prescription", "lab", "insurance"],  // Document category
      required: true,
    },
    uploadedAt: { type: Date, default: Date.now },
  }
);

// ─────────────────────────────────────────────
//  MAIN MEMBER SCHEMA
// ─────────────────────────────────────────────

/**
 * Member Schema
 * ─────────────
 * Stores all family members added through the ARTIKA.life platform.
 *
 * Core fields are common for all categories (Adult / Kid / Newborn).
 * growthData    – populated for Kid & Newborn
 * vaccinations  – populated only for Newborn
 * healthLocker  – available for all; stores document links
 */
const memberSchema = new mongoose.Schema(
  {
    // ── Owner (links member to the logged-in Google user) ──────────────
    userEmail: {
      type: String,
      required: [true, "userEmail is required"],
      trim: true,
      lowercase: true,
      index: true,          // fast per-user queries
    },

    // ── Personal Info ──────────────────────────────────────────────────
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    relation: {
      type: String,
      required: [true, "Relation is required (e.g. SON, MOTHER)"],
      trim: true,
      uppercase: true,
    },

    dob: {
      type: Date,
      required: [true, "Date of Birth is required"],
    },

    age: {
      type: Number,
      required: [true, "Age is required"],
      min: [0, "Age cannot be negative"],
    },

    sex: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: [true, "Sex is required"],
    },

    category: {
      type: String,
      enum: ["Adult", "Kid", "Newborn"],
      required: [true, "Category is required"],
    },

    // ── Contact ────────────────────────────────────────────────────────
    phoneCountryCode: {
      type: String,
      default: "+91",
      trim: true,
    },

    phoneNumber: {
      type: String,
      trim: true,
      default: "",
    },

    address: {
      type: String,
      trim: true,
      default: "",
    },

    // ── Photo ──────────────────────────────────────────────────────────
    // Stores a Google Drive shareable link to the member's photo.
    // The actual image file lives in Google Drive.
    photoLink: {
      type: String,
      default: "",
      trim: true,
    },

    // ── Growth Centre (Kid & Newborn only) ────────────────────────────
    // Will be null/empty for Adults
    growthData: {
      type: growthDataSchema,
      default: null,
    },

    // ── Vaccination Tracker (Newborn only) ───────────────────────────
    vaccinations: {
      type: [vaccineRecordSchema],
      default: [],
    },

    // ── Health Locker Documents ───────────────────────────────────────
    // Array of Google Drive links per document category
    healthLocker: {
      type: [healthLockerDocSchema],
      default: [],
    },

    // ── Telegram Bot Integration ──────────────────────────────────────
    telegramChatId: {
      type: String,
      default: null,
    },
    
    activationCode: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true,         // Adds createdAt and updatedAt automatically
    collection: "members",    // Explicit collection name in MongoDB Atlas
  }
);

const Member = mongoose.model("Member", memberSchema);

module.exports = Member;
