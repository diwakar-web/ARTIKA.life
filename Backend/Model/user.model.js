const mongoose = require("mongoose");

// Lightweight profile keyed by external userId.
const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 128,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    caretakerId: {
      type: String,
      trim: true,
      maxlength: 128,
      default: "",
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("User", userSchema);
