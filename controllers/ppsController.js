const DiecastingEigenvalueData = require("../models/diecasting_eigenvalue_data");
const modelJson = require("../models/pps_model.json");
const { Op, literal } = require("sequelize");

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
  return (
    Object.entries(CODE_MAP).find(([label, code]) => code === codePart)?.[0] ||
    ""
  );
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

// --- Data Fetching Logic ---
async function fetchPpsData(type, limit, dateFrom = null, dateTo = null) {
  const rawModel = modelJson || {};
  const lasercode = getLaserCode(type);

  try {
    let whereCondition = {
      speed: { [Op.ne]: null },
      position: { [Op.ne]: null },
      casting_pressure: { [Op.ne]: null },
      lasercode: { [Op.like]: `%${lasercode}%` },
    };

    // ✅ Add date range if provided
    if (dateFrom && dateTo) {
      whereCondition.dt = {
        [Op.between]: [literal(`'${dateFrom}'`), literal(`'${dateTo}'`)],
      };
    }

    const queryOptions = {
      where: whereCondition,
      order: [["dt", "DESC"]],
    };

    // ✅ Only apply limit when no date range
    if (!(dateFrom && dateTo)) {
      queryOptions.limit = limit;
    }

    const dataFromDbDesc = await DiecastingEigenvalueData.findAll(queryOptions);

    return dataFromDbDesc.map((item) => mapDbItemToModel(item, rawModel));
  } catch (error) {
    console.error("Error fetching data:", error);
    throw new Error("Server Error");
  }
}

// --- Controller Functions ---
exports.getBatchPage = (req, res) => {
  const typeSelect = req.query.type || "LL";
  res.render("pps-batch", { type: typeSelect });
};

exports.getBatchData = async (req, res) => {
  const typeSelect = req.query.type || "LL";
  const dateFrom = req.query.dateFrom;
  const dateTo = req.query.dateTo;
  try {
    const models = await fetchPpsData(typeSelect, 10, dateFrom, dateTo);
    res.json({ models: models, type: typeSelect });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSinglePage = (req, res) => {
  const typeSelect = req.query.type || "LL";
  res.render("pps-single", { type: typeSelect });
};

exports.getSingleData = async (req, res) => {
  const typeSelect = req.query.type || "LL";
  const dateFrom = req.query.dateFrom;
  const dateTo = req.query.dateTo;
  try {
    const models = await fetchPpsData(typeSelect, 100, dateFrom, dateTo);
    res.json({ models: models, type: typeSelect });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
