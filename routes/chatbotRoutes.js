const express = require("express");
const { chatbot } = require("../controllers/chatbotController");

const router = express.Router();

router.post("/chatbot", chatbot);

module.exports = router;
