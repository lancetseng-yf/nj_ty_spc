const express = require("express");
const router = express.Router();
const DiecastingEigenvalueData = require("../models/diecasting_eigenvalue_data");
const modelJson = require("../models/biscuit_thick_model.json");
const { Op } = require("sequelize");

router.get("/", async (req, res) => {
  let modelArray = [];
  let rawModel = modelJson || {};

  try {
    // fetch data
    const dataFromDb = await DiecastingEigenvalueData.findAll({
      where: {
        speed: { [Op.ne]: null },
        position: { [Op.ne]: null },
        casting_pressure: { [Op.ne]: null },
      },
      limit: 1000,
      order: [["diecasting_eigenvalue_data_id", "DESC"]],
    });

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

    dataFromDb.forEach((item) => {
      const typeLabel = labelType(item.lasercode || "");

      const model = {
        ...rawModel,
        diecasting_eigenvalue_data_id: item.diecasting_eigenvalue_data_id,
        sm: item.sm ?? 0,
        dt: item.dt || rawModel.dt,
        type: typeLabel,
      };

      modelArray.push(model);
    });

    // Pass data to view correctly
    // res.send(modelArray);
    res.render("biscuit", { models: modelArray });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
