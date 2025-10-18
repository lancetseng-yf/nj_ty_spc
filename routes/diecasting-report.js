const express = require("express");
const router = express.Router();
const diecastingReportController = require("../controllers/diecastingReportController");

// --- Route 1: Render EJS view ---
router.get("/", diecastingReportController.renderDiecastingReportPage);

// --- Route 2: Provide JSON data ---
router.get("/data", diecastingReportController.getDiecastingData);

module.exports = router;
