const DiecastingEigenvalueData = require("../models/diecasting_eigenvalue_data");
const modelJson = require("../models/psmax_model.json");
const { Op, literal  } = require("sequelize");

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
async function fetchPsmaxData(type, dateFrom = null, dateTo = null) {
  const rawModel = modelJson || {};
  const lasercode = getLaserCode(type);

  try {
    const whereClause = {
      speed: { [Op.ne]: null },
      position: { [Op.ne]: null },
      casting_pressure: { [Op.ne]: null },
      lasercode: { [Op.like]: `%${lasercode}%` },
    };

    if (dateFrom && dateTo) {
      whereClause.dt = {
       [Op.between]: [literal(`'${dateFrom}'`), literal(`'${dateTo}'`)]
      };
    }

    const queryOptions = {
      where: whereClause,
      order: [["dt", "DESC"]],
    };

    // Apply limit only if date range is not provided
    if (!dateFrom || !dateTo) {
      queryOptions.limit = 500;
    }

    const dataFromDb = await DiecastingEigenvalueData.findAll(queryOptions);

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
  const dateFrom = req.query.dateFrom;
  const dateTo = req.query.dateTo;
  try {
    const models = await fetchPsmaxData(typeSelect, dateFrom, dateTo);
    res.json({ models: models, type: typeSelect });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};