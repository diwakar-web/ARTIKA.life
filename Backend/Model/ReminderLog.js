const mongoose = require("mongoose");

const reminderLogSchema = new mongoose.Schema(
  {
    reminderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reminder",
      required: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    time: {
      type: String, // HH:MM
      required: true,
    },
    pollMessageId: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["Sent", "Yes", "No", "Ignored"],
      default: "Sent",
    },
  },
  { timestamps: true }
);

// Prevent duplicate logs for the same reminder + date + time
reminderLogSchema.index({ reminderId: 1, date: 1, time: 1 }, { unique: true });

module.exports = mongoose.model("ReminderLog", reminderLogSchema);
