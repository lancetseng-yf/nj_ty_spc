const express = require("express");
const router = express.Router();
const psmaxController = require("../controllers/psmaxController");

// --- Page Shell (fast, no DB) ---
router.get("/", psmaxController.getPsmaxPage);

// --- Data API (does DB query) ---
router.get("/data", psmaxController.getPsmaxData);

module.exports = router;
