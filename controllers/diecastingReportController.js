const DiecastingEigenvalueData = require("../models/diecasting_eigenvalue_data");
const modelJson = require("../models/diecasting_report_6000.json");
const { Op, literal } = require("sequelize");

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

function labelType(lasercode) {
  if (!lasercode || typeof lasercode !== "string") return "";
  const codePart = lasercode.slice(2, 11);
  return (
    Object.entries(CODE_MAP).find(([label, code]) => code === codePart)?.[0] ||
    ""
  );
}

function convertStringToArray(inputString) {
  if (!inputString || typeof inputString !== "string") return [];
  return inputString.split(",").map((num) => Number(num.trim()) || 0);
}

function normalizeArray(arr, multiplier = 1) {
  return arr.map((val) => val * multiplier);
}

function mapDbItemToModel(item, rawModel) {
  // --- 1. Curve Data Extraction and Parsing ---
  // Ensure curve data fields are converted from string (if serialized) to array format.
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

  // --- 2. Final Model Construction ---
  return {
    ...rawModel, // Spread any existing base properties

    // Core Identifiers and Time
    diecasting_eigenvalue_data_id: item.diecasting_eigenvalue_data_id,
    type: typeLabel,
    no: item.no || "",
    dt: item.create_time, // Prioritize dt, fall back to create_time
    create_time: item.create_time,
    lasercode: item.lasercode || "",

    // Curve Data (Normalized)
    pressure: normalizeArray(rawPressure, 1),
    position: rawPosition, // Position often doesn't need normalization
    speed: normalizeArray(rawSpeed, 1),
    control: normalizeArray(rawControl, 1),
    feedback: normalizeArray(rawFeedback, 1),
    storage_pressure_n2: normalizeArray(rawStoragePressureN2, 1),
    pressurization_pressure_n2: normalizeArray(rawPressurizationPressureN2, 1),
    system_pressure: normalizeArray(rawSystemPressure, 1),

    // Shot Phase Parameters (Slow/High Speed)
    c1: item.c1 ?? 0,
    t1: item.t1 ?? 0,
    v1: item.v1 ?? 0,
    gp: item.gp ?? 0,
    c2: item.c2 ?? 0,
    t2: item.t2 ?? 0,
    v2: item.v2 ?? 0,
    vm: item.vm ?? 0,

    // Intensification/Pressure Parameters
    cc: item.cc ?? 0,
    t3: item.t3 ?? 0,
    td: item.td ?? 0,
    pm: item.pm ?? 0,
    pf: item.pf ?? 0,
    pr: item.pr ?? 0,
    ps: item.ps ?? 0,

    // Final Product/Process Parameters
    va: item.va ?? 0,
    fc: item.fc ?? 0,
    sm: item.sm ?? 0, // Already mapped in original snippet, keeping for completeness
    tc: item.tc ?? 0,
    tp: item.tp ?? 0,
    se: item.se ?? 0,
    qt: item.qt ?? 0,
    vacuum_pressure: item.vacuum_pressure ?? 0,
    tpt: item.tpt ?? 0,
    lv: item.lv ?? 0,
    shot_position: item.shot_position ?? 0,

    // Vacuum Multiples
    vacuum_pressure1: item.vacuum_pressure1 ?? 0,
    vacuum_pressure2: item.vacuum_pressure2 ?? 0,
    vacuum_pressure3: item.vacuum_pressure3 ?? 0,
    vacuum_pressure4: item.vacuum_pressure4 ?? 0,
    vacuum_pressure5: item.vacuum_pressure5 ?? 0,
    vacuum_pressure6: item.vacuum_pressure6 ?? 0,
    vacuum_pressure7: item.vacuum_pressure7 ?? 0,
    vacuum_pressure8: item.vacuum_pressure8 ?? 0,
  };
}

async function fetchDiecastingReportData6000(
  type = null,
  dateFrom = null,
  dateTo = null,
  sn = null,
  id = null,
  machine = null
) {
  const rawModel = modelJson || {};
  const lasercode = getLaserCode(type);

  try {
    let whereCondition = {
      speed: { [Op.ne]: null },
      position: { [Op.ne]: null },
      casting_pressure: { [Op.ne]: null },
    };

    // ✅ Add date range if provided
    if (dateFrom && dateTo) {
      whereCondition.create_time = {
        [Op.between]: [literal(`'${dateFrom}'`), literal(`'${dateTo}'`)],
      };
    }

    if (id) {
      whereCondition.diecasting_eigenvalue_data_id = { [Op.eq]: id };
    }

    if (sn) {
      whereCondition.lasercode = { [Op.like]: `%${sn}%` };
    }

    if (type) {
      whereCondition.lasercode = { [Op.like]: `%${lasercode}%` };
    }

    const queryOptions = {
      where: whereCondition,
      order: [["create_time", "DESC"]],
    };

    const dataFromDbDesc = await DiecastingEigenvalueData.findAll(queryOptions);

    return dataFromDbDesc.map((item) => mapDbItemToModel(item, rawModel));
  } catch (error) {
    console.error("Error fetching data:", error);
    throw new Error("Server Error");
  }
}

exports.getDiecastingData = async (req, res) => {
  const typeSelect = req.query.type || null;
  const dateFrom = req.query.dateFrom || null;
  const dateTo = req.query.dateTo || null;
  const sn = req.query.sn || null;
  const id = req.query.id || null;
  const machine = req.query.machine || null;
  try {
    const models = await fetchDiecastingReportData6000(
      typeSelect,
      dateFrom,
      dateTo,
      sn,
      id,
      machine
    );
    res.json({ models: models, type: typeSelect });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.renderDiecastingReportPage = (req, res) => {
  const typeSelect = req.query.machine || "";
  res.render("diecasting-report", { type: typeSelect });
};
