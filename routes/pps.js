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

function getLaserCode(label) {
  if (!label || typeof label !== "string") {
    return "";
  }

  // 使用一個映射表（Map）來反轉 key-value 關係，這比 switch case 效率更高且更易讀
  const codeMap = new Map([
    ["LR", "887866302"],
    ["LL", "887866402"],
    ["MR", "886194201"],
    ["ML", "886194301"],
    ["ZP", "886194401"],
  ]);

  return codeMap.get(label.toUpperCase()) || "";
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
  const typeSelect = req.query.type || "LL";   // 預設 LL
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

    // 反轉，讓時間順序從舊到新
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

    // 把目前的 typeSelect 一起傳給 EJS，讓下拉選單自動選中
    res.render("pps-single", { models: modelArray, type: typeSelect });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
