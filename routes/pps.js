const express = require("express");
const router = express.Router();
const DiecastingEigenvalueData = require("../models/diecasting_eigenvalue_data");
const modelJson = require("../models/pps_model.json");
const { Op } = require("sequelize");

// --- Utility Functions ---
const CODE_MAP = {
  LR: "887866302",
  LL: "887866402",
  MR: "886194201",
  ML: "886194301",
  ZP: "886194401",
};

function convertStringToArray(inputString) {
  if (!inputString || typeof inputString !== "string") return [];
  return inputString.split(",").map((num) => Number(num.trim()) || 0);
}

function normalizeArray(arr, multiplier = 1) {
  return arr.map((val) => val * multiplier);
}

function labelType(lasercode) {
  if (!lasercode || typeof lasercode !== "string") return "";
  const codePart = lasercode.slice(2, 11);
  return Object.entries(CODE_MAP).find(([label, code]) => code === codePart)?.[0] || "";
}

function getLaserCode(label) {
  if (!label || typeof label !== "string") return "";
  return CODE_MAP[label.toUpperCase()] || "";
}

function mapDbItemToModel(item, rawModel) {
  const rawPressure = Array.isArray(item.casting_pressure)
    ? item.casting_pressure
    : convertStringToArray(item.casting_pressure);
  const rawSpeed = Array.isArray(item.speed)
    ? item.speed
    : convertStringToArray(item.speed);
  const rawPosition = Array.isArray(item.position)
    ? item.position
    : convertStringToArray(item.position);
  const typeLabel = labelType(item.lasercode);
  return {
    ...rawModel,
    diecasting_eigenvalue_data_id: item.diecasting_eigenvalue_data_id,
    pressure: normalizeArray(rawPressure, 1),
    position: rawPosition,
    speed: normalizeArray(rawSpeed, 1),
    sm: item.sm ?? 0,
    dt: item.dt || rawModel.dt,
    type: typeLabel,
  };
}

// --- Batch Route ---
router.get("/batch", async (req, res) => {
  const rawModel = modelJson || {};
  try {
    const dataFromDb = await DiecastingEigenvalueData.findAll({
      where: {
        speed: { [Op.ne]: null },
        position: { [Op.ne]: null },
        casting_pressure: { [Op.ne]: null },
      },
      limit: 7,
      order: [["diecasting_eigenvalue_data_id", "DESC"]],
    });
    const modelArray = dataFromDb.map((item) => mapDbItemToModel(item, rawModel));
    res.render("pps-batch", { models: modelArray });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Server Error");
  }
});

// --- Single Route ---
router.get("/single", async (req, res) => {
  const rawModel = modelJson || {};
  const typeSelect = req.query.type || "LL";
  const lasercode = getLaserCode(typeSelect);
  try {
    const dataFromDbDesc = await DiecastingEigenvalueData.findAll({
      where: {
        speed: { [Op.ne]: null },
        position: { [Op.ne]: null },
        casting_pressure: { [Op.ne]: null },
        lasercode: { [Op.like]: `%${lasercode}%` },
      },
      limit: 100,
      order: [["diecasting_eigenvalue_data_id", "DESC"]],
    });
    // Reverse for chronological order
    const dataFromDb = dataFromDbDesc.reverse();
    const modelArray = dataFromDb.map((item) => mapDbItemToModel(item, rawModel));
    res.render("pps-single", { models: modelArray, type: typeSelect });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
