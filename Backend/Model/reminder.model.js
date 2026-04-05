const mongoose = require("mongoose");

const reminderMedicineSchema = new mongoose.Schema(
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

const reminderSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 128,
      index: true,
    },
    chatId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 128,
      index: true,
    },
    caretakerId: {
      type: String,
      trim: true,
      maxlength: 128,
      default: "",
    },
    enabled: {
      type: Boolean,
      default: false,
      index: true,
    },
    intervalMinutes: {
      type: Number,
      default: 480,
      min: 5,
      max: 10080,
    },
    nextReminderAt: {
      type: Date,
      index: true,
    },
    awaitingResponse: {
      type: Boolean,
      default: false,
      index: true,
    },
    awaitingSince: {
      type: Date,
    },
    followUpCount: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },
    lastReminderAt: {
      type: Date,
    },
    lastDoneAt: {
      type: Date,
    },
    medicinesSnapshot: {
      type: [reminderMedicineSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

reminderSchema.index({ enabled: 1, awaitingResponse: 1, nextReminderAt: 1 });

module.exports = mongoose.model("Reminder", reminderSchema);
