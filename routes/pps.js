const express = require("express");
const router = express.Router();
const ppsController = require("../controllers/ppsController");

// --- Batch Page Route ---
router.get("/batch", ppsController.getBatchPage);

router.get("/batch/data", ppsController.getBatchData);

// --- Single Data Route ---
router.get("/single/data", ppsController.getSingleData);

// --- Single Page Route ---
router.get("/single", ppsController.getSinglePage);

module.exports = router;
