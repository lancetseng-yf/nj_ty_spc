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
  const rawControl = Array.isArray(item.control)
    ? item.control
    : convertStringToArray(item.control);
  const rawFeedback = Array.isArray(item.feedback)
    ? item.feedback
    : convertStringToArray(item.feedback);
  const rawStoragePressureN2 = Array.isArray(item.storage_pressure_n2)
    ? item.storage_pressure_n2
    : convertStringToArray(item.storage_pressure_n2);
  const rawPressurizationPressureN2 = Array.isArray(
    item.pressurization_pressure_n2
  )
    ? item.pressurization_pressure_n2
    : convertStringToArray(item.pressurization_pressure_n2);
  const rawSystemPressure = Array.isArray(item.system_pressure)
    ? item.system_pressure
    : convertStringToArray(item.system_pressure);

  return {
    ...rawModel,
    diecasting_eigenvalue_data_id: item.diecasting_eigenvalue_data_id,
    pressure: normalizeArray(rawPressure, 1),
    position: rawPosition,
    speed: normalizeArray(rawSpeed, 1),
    sm: item.sm ?? 0,
    dt: item.create_time,
    type: typeLabel,

    // ✅ new fields from your JSON model
    control: normalizeArray(rawControl, 1),
    feedback: normalizeArray(rawFeedback, 1),
    storage_pressure_n2: normalizeArray(rawStoragePressureN2, 1),
    pressurization_pressure_n2: normalizeArray(rawPressurizationPressureN2, 1),
    system_pressure: normalizeArray(rawSystemPressure, 1),
    vacuum_pressure1: item.vacuum_pressure1 ?? 0,
    vacuum_pressure2: item.vacuum_pressure2 ?? 0,
    vacuum_pressure3: item.vacuum_pressure3 ?? 0,
    vacuum_pressure4: item.vacuum_pressure4 ?? 0,
    vacuum_pressure5: item.vacuum_pressure5 ?? 0,
    vacuum_pressure6: item.vacuum_pressure6 ?? 0,
    vacuum_pressure7: item.vacuum_pressure7 ?? 0,
    vacuum_pressure8: item.vacuum_pressure8 ?? 0,
    lv: item.lv ?? 0,
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
      order: [["create_time", "DESC"]],
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
