const express = require("express");
const { chatController } = require("../controllers/chat.controller");

const router = express.Router();

// Main chatbot endpoint.
router.post("/chat", chatController);

module.exports = router;
