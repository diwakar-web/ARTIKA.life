const mongoose = require("mongoose");

/**
 * Reminder Schema
 * ───────────────
 * Stores medication reminders set by the user from the frontend.
 *
 * Fields:
 *  - memberId    : Reference to the Member document this reminder belongs to
 *  - medication  : Name of the medicine (e.g. "Paracetamol")
 *  - duration    : Number of days the medication needs to be taken
 *  - frequency   : How many times per day the medication should be taken
 *  - times       : Array of specific times (HH:MM) entered by the user
 *  - createdAt   : Automatically managed by Mongoose timestamps
 */
const reminderSchema = new mongoose.Schema(
  {
    // Which family member this reminder belongs to
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: [true, "memberId is required to link the reminder to a member"],
    },

    // Name of the medication
    medication: {
      type: String,
      required: [true, "Medication name is required"],
      trim: true,
    },

    // Number of days the course lasts
    duration: {
      type: Number,
      required: [true, "Duration (in days) is required"],
      min: [1, "Duration must be at least 1 day"],
    },

    // How many times per day
    frequency: {
      type: Number,
      required: [true, "Frequency (times per day) is required"],
      min: [1, "Frequency must be at least 1"],
    },

    // Specific times set by the user – array length should match frequency
    times: {
      type: [String], // Each entry is "HH:MM" format (e.g. "08:00")
      validate: {
        validator: function (arr) {
          // For new documents, 'this' refers to the document.
          // For updates, the update object might be in this.getUpdate().
          let freq = this.frequency;
          if (freq === undefined && this.getUpdate) {
            const update = this.getUpdate();
            freq = update.frequency || (update.$set && update.$set.frequency);
          }
          if (freq === undefined) return true; // Skip validation if frequency not provided
          return arr.length === Number(freq);
        },
        message: "Number of times must match the frequency",
      },
    },

    // Tracks how many doses have been reported as taken/ignored
    dosesTaken: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
    collection: "reminder", // Explicit collection name in MongoDB Atlas
  }
);

const Reminder = mongoose.model("Reminder", reminderSchema);

module.exports = Reminder;
