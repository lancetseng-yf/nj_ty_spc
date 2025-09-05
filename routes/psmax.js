const express = require("express");
const router = express.Router();
const DiecastingEigenvalueData = require("../models/diecasting_eigenvalue_data");
const modelJson = require("../models/psmax_model.json");
const { Op } = require("sequelize");

// --- Utility Functions & Code Mapping ---
const CODE_MAP = {
  LR: "887866302",
  LL: "887866402",
  MR: "886194201",
  ML: "886194301",
  ZP: "886194401",
};

function getLaserCode(label) {
  if (!label || typeof label !== "string") return "";
  return CODE_MAP[label.toUpperCase()] || "";
}

function convertStringToArray(inputString) {
  if (!inputString || typeof inputString !== "string") return [];
  return inputString.split(",").map((num) => Number(num.trim()) || 0);
}

function safeMax(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return 0;
  return Math.max(...arr);
}

function labelType(lasercode) {
  if (!lasercode || typeof lasercode !== "string") return "";
  const codePart = lasercode.slice(2, 11);
  return (
    Object.entries(CODE_MAP).find(([label, code]) => code === codePart)?.[0] ||
    ""
  );
}

function mapDbItemToModel(item, rawModel) {
  const castingPressureArray = convertStringToArray(item.casting_pressure);
  const speedArray = convertStringToArray(item.speed);
  return {
    ...rawModel,
    diecasting_eigenvalue_data_id: item.diecasting_eigenvalue_data_id,
    max_pressure: safeMax(castingPressureArray),
    max_speed: safeMax(speedArray),
    dt: item.dt || rawModel.dt,
    type: labelType(item.lasercode),
  };
}

// --- Page Shell (fast, no DB) ---
router.get("/", (req, res) => {
  const typeSelect = req.query.type || "LL";
  res.render("psmax", { type: typeSelect });
});

// --- Data API (does DB query) ---
router.get("/data", async (req, res) => {
  try {
    const rawModel = modelJson || {};
    const typeSelect = req.query.type || "LL";
    const lasercode = getLaserCode(typeSelect);

    const dataFromDb = await DiecastingEigenvalueData.findAll({
      where: {
        speed: { [Op.ne]: null },
        position: { [Op.ne]: null },
        casting_pressure: { [Op.ne]: null },
        lasercode: { [Op.like]: `%${lasercode}%` },
      },
      limit: 1000,
      order: [["diecasting_eigenvalue_data_id", "DESC"]],
    });

    const modelArray = dataFromDb.map((item) =>
      mapDbItemToModel(item, rawModel)
    );
    res.json({ models: modelArray, type: typeSelect });
  } catch (err) {
    console.error("Error fetching data:", err);
    res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;
