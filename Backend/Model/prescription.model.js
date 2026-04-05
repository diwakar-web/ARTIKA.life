const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema(
  {
    medicineName: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
    dosage: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
    instructions: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  {
    _id: false,
  }
);

const prescriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      trim: true,
      maxlength: 128,
      index: true,
    },
    source: {
      type: String,
      enum: ["upload", "telegram"],
      required: true,
      default: "upload",
      index: true,
    },
    originalFileName: {
      type: String,
      trim: true,
      maxlength: 260,
    },
    mimeType: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    filePath: {
      type: String,
      trim: true,
      maxlength: 1024,
    },
    rawText: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100000,
    },
    medicines: {
      type: [medicineSchema],
      default: [],
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low",
      index: true,
    },
    llmRawOutput: {
      type: String,
      trim: true,
      maxlength: 150000,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

prescriptionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Prescription", prescriptionSchema);
