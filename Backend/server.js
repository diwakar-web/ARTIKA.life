require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const connectDB = require("./config/db");
const chatRoutes = require("./routes/chat.routes");
const uploadRoutes = require("./routes/upload.routes");

const app = express();
const PORT = Number(process.env.PORT) || 5000;

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  : ["*"];

app.use(helmet());
// Core security + observability middleware.
app.use(
  cors({
    origin: allowedOrigins.includes("*") ? true : allowedOrigins,
    methods: ["GET", "POST"],
  })
);
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  return res.status(200).json({
    success: true,
    message: "Backend is healthy.",
  });
});

app.use("/", chatRoutes);
app.use("/", uploadRoutes);

app.use((_req, res) => {
  return res.status(404).json({
    success: false,
    error: { message: "Route not found." },
  });
});

// Centralized error handler to keep response format consistent.
app.use((err, _req, res, _next) => {
  const statusCode = Number(err.statusCode) || 500;
  const response = {
    success: false,
    error: {
      code: err.code || "INTERNAL_SERVER_ERROR",
      message:
        statusCode === 500
          ? "Something went wrong. Please try again later."
          : err.message,
    },
  };

  if (process.env.NODE_ENV !== "production") {
    response.error.debug = err.message;
  }

  return res.status(statusCode).json(response);
});

async function startServer() {
  try {
    // Ensure DB is ready before accepting traffic.
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;
