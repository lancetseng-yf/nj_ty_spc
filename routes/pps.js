const express = require("express");
const router = express.Router();
const DiecastingEigenvalueData = require("../models/diecasting_eigenvalue_data");
const modelJson = require("../models/pps_model.json");
const { Op } = require("sequelize");

// 工具函數
function convertStringToArray(inputString) {
  if (!inputString || typeof inputString !== "string") return [];
  return inputString.split(",").map((num) => Number(num.trim()) || 0);
}

function normalizeArray(arr, multiplier = 1) {
  return arr.map((val) => val * multiplier);
}

function labelType(lasercode) {
  if (!lasercode || typeof lasercode !== "string") return "";

  const codePart = lasercode.slice(2, 11); // SQL substring (3,9)

  switch (codePart) {
    case "887866302":
      return "LR";
    case "887866402":
      return "LL";
    case "886194201":
      return "MR";
    case "886194301":
      return "ML";
    case "886194401":
      return "ZP";
    default:
      return "";
  }
}

router.get("/batch", async (req, res) => {
  let modelArray = [];
  let rawModel = modelJson || {};

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

    modelArray = dataFromDb.map((item) => {
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
    });

    res.render(`pps-batch`, { models: modelArray });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Server Error");
  }
});

router.get("/single", async (req, res) => {
  let modelArray = [];
  let rawModel = modelJson || {};

  try {
    const dataFromDbDesc = await DiecastingEigenvalueData.findAll({
      where: {
        speed: { [Op.ne]: null },
        position: { [Op.ne]: null },
        casting_pressure: { [Op.ne]: null },
      },
      limit: 100,
      order: [["diecasting_eigenvalue_data_id", "DESC"]],
    });

    const dataFromDb = dataFromDbDesc.reverse();

    modelArray = dataFromDb.map((item) => {
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
    });

    res.render(`pps-single`, { models: modelArray });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
