const express = require("express");
const router = express.Router();
const DiecastingEigenvalueData = require("../models/diecasting_eigenvalue_data");
const modelJson = require("../models/psmax_model.json");
const { Op } = require("sequelize");

router.get("/", async (req, res) => {
  try {
    let modelArray = [];
    let rawModel = modelJson || {};
    const dataFromDb = await DiecastingEigenvalueData.findAll({
      where: {
        speed: { [Op.ne]: null },
        position: { [Op.ne]: null },
        casting_pressure: { [Op.ne]: null },
      },
      limit: 500,
      order: [["diecasting_eigenvalue_data_id", "DESC"]],
    });

    function convertStringToArray(inputString) {
      if (!inputString || typeof inputString !== "string") return [];
      return inputString.split(",").map((num) => Number(num.trim()) || 0);
    }

    function safeMax(arr) {
      console.log("Array for max calculation:", arr);
      if (!Array.isArray(arr) || arr.length === 0) return 0;
      return Math.max(...arr);
    }

    // loop dataFromDb get rawModel.casting_pressure max value to rawModel.max_pressure & get max speed value to rawModel.max_speed
    dataFromDb.forEach((item) => {
      const castingPressureArray = convertStringToArray(item.casting_pressure);
      const speedArray = convertStringToArray(item.speed);

      const maxPressure = safeMax(castingPressureArray);
      const maxSpeed = safeMax(speedArray);

      const model = {
        ...rawModel,
        diecasting_eigenvalue_data_id: item.diecasting_eigenvalue_data_id,
        max_pressure: maxPressure,
        max_speed: maxSpeed,
        dt: item.dt || rawModel.dt,
      };
      modelArray.push(model);
    });

    console.log("Model Array:", modelArray);
    // res.send(modelArray);
    // Send to EJS
    res.render("psmax", { models: modelArray });
  } catch (err) {
    console.error("Error fetching data:", err);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
