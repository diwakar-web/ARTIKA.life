const express = require("express");
const { chatController } = require("../Controller/chat.controller");

const router = express.Router();

// Main chatbot endpoint.
router.post("/chat", chatController);

module.exports = router;
