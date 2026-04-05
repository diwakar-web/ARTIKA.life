const express = require("express");

const { telegramWebhookController } = require("../controllers/telegram.controller");

const router = express.Router();

router.post("/", telegramWebhookController);

module.exports = router;
