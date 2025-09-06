const express = require("express");
const router = express.Router();
const biscuitController = require("../controllers/biscuitController");

// --- Route 1: Render EJS view ---
router.get("/", biscuitController.renderBiscuitPage);

// --- Route 2: Provide JSON data ---
router.get("/data", biscuitController.getBiscuitData);

module.exports = router;
