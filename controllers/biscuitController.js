const DiecastingEigenvalueData = require("../models/diecasting_eigenvalue_data");
const modelJson = require("../models/biscuit_thick_model.json");
const { Op, literal  } = require("sequelize");
const { parse, isValid } = require("date-fns");

// --- Code mapping ---
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

function mapDbItemToModel(item, rawModel) {
  return {
    ...rawModel,
    diecasting_eigenvalue_data_id: item.diecasting_eigenvalue_data_id,
    sm: item.sm ?? 0,
    dt: item.dt || rawModel.dt,
    type: labelType(item.lasercode || ""),
  };
}

exports.getBiscuitData = async (req, res) => {
  const typeSelect = req.query.type || "LL";
  const dateFrom = req.query.dateFrom;
  const dateTo = req.query.dateTo;
  const lasercode = getLaserCode(typeSelect);
  const rawModel = modelJson || {};

  console.log(`Fr:${dateFrom} To:${dateTo}`);

  try {
    const whereClause = {
      speed: { [Op.ne]: null },
      position: { [Op.ne]: null },
      casting_pressure: { [Op.ne]: null },
      lasercode: { [Op.like]: `%${lasercode}%` },
    };

    if (dateFrom && dateTo) {
      // 使用 date-fns.parse 精確解析日期字串
       
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

    const modelArray = dataFromDb.map((item) =>
      mapDbItemToModel(item, rawModel)
    );
    res.json({ models: modelArray });
  } catch (err) {
    console.error("Error fetching data:", err);
    res.status(500).json({ error: "Server Error" });
  }
};

exports.renderBiscuitPage = (req, res) => {
  const typeSelect = req.query.type || "LL";
  res.render("biscuit", { type: typeSelect });
};
