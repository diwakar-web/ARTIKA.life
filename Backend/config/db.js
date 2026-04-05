const mongoose = require("mongoose");

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI;
  const mongoTimeoutMs = Number(process.env.MONGODB_TIMEOUT_MS) || 10000;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing in environment variables.");
  }

  try {
    // Timeout values avoid long hangs during startup when DB is unavailable.
    await mongoose.connect(mongoUri, {
      dbName: process.env.MONGODB_DB_NAME || undefined,
      serverSelectionTimeoutMS: mongoTimeoutMs,
      connectTimeoutMS: mongoTimeoutMs,
    });

    console.log(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
}

module.exports = connectDB;
