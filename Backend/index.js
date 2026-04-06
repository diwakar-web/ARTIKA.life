// Load environment variables FIRST before any other import
require("dotenv").config();

const express = require("express");
const cors    = require("cors");

const connectDB    = require("./DB/connect");
const memberRoutes  = require("./Routes/memberRoutes");
const reminderRoutes = require("./Routes/reminderRoutes");
const chatRoutes = require("./Routes/chat.routes");
const uploadRoutes = require("./Routes/upload.routes");
const errorHandler = require("./MiddleWare/errorHandler");

// Start tracking and TG bot
require("./services/telegramBot");
require("./services/reminderCron");

// ─────────────────────────────────────────────────────────────────────────────
//  Connect to MongoDB Atlas
// ─────────────────────────────────────────────────────────────────────────────
connectDB();

// ─────────────────────────────────────────────────────────────────────────────
//  Initialize Express App
// ─────────────────────────────────────────────────────────────────────────────
const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

app.use(express.json({ limit: process.env.FILE_SIZE_LIMIT || "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Health Check Route ────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ success: true, message: "ARTIKA.life API is running 🚀" });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/members",   memberRoutes);   // All member endpoints
app.use("/api/reminders", reminderRoutes); // All reminder endpoints
app.use("/api/chat",      chatRoutes);     // Chatbot endpoints
app.use("/api/upload",    uploadRoutes);   // OCR/Upload endpoints

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ─────────────────────────────────────────────────────────────────────────────
//  Start Server
// ─────────────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || "development"}`);
});
