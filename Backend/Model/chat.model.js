const mongoose = require("mongoose");

// Stores each chat turn (user and assistant) for memory retrieval.
const chatSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 128,
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low",
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

chatSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model("Chat", chatSchema);
