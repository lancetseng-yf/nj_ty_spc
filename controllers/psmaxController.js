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

// --- Data Fetching Logic ---
async function fetchPsmaxData(type, limit) {
  const rawModel = modelJson || {};
  const lasercode = getLaserCode(type);

  try {
    const dataFromDb = await DiecastingEigenvalueData.findAll({
      where: {
        speed: { [Op.ne]: null },
        position: { [Op.ne]: null },
        casting_pressure: { [Op.ne]: null },
        lasercode: { [Op.like]: `%${lasercode}%` },
      },
      limit: limit,
      order: [["dt", "DESC"]],
    });

    return dataFromDb.map((item) => mapDbItemToModel(item, rawModel));
  } catch (err) {
    console.error("Error fetching data:", err);
    throw new Error("Server Error");
  }
}

// --- Controller Functions ---
exports.getPsmaxPage = (req, res) => {
  const typeSelect = req.query.type || "LL";
  res.render("psmax", { type: typeSelect });
};

exports.getPsmaxData = async (req, res) => {
  const typeSelect = req.query.type || "LL";
  try {
    const models = await fetchPsmaxData(typeSelect, 1000);
    res.json({ models: models, type: typeSelect });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};