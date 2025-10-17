const DiecastingEigenvalueData = require("../models/diecasting_eigenvalue_data");
const modelJson = require("../models/biscuit_thick_model.json");


exports.renderDiecastingReportPage = (req, res) => {
  const typeSelect = req.query.machine || "";
  res.render("diecasting-report", { type: typeSelect });
};
