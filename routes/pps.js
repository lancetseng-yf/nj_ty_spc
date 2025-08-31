const express = require("express");
const router = express.Router();
const DiecastingEigenvalueData = require("../models/diecasting_eigenvalue_data");
const modelJson = require("../models/pps_model.json");
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
      limit: 50,
      order: [["diecasting_eigenvalue_data_id", "DESC"]],
    });

    function convertStringToArray(inputString) {
      if (!inputString || typeof inputString !== "string") return [];
      return inputString.split(",").map((num) => Number(num.trim()) || 0);
    }

    function normalizeArray(arr, multiplier = 1) {
      return arr.map((val) => val * multiplier);
    }

    // Loop through dataFromDb and assign to rawModel, then add to modelArray
    // Loop through dataFromDb and assign to rawModel, then add to modelArray
    dataFromDb.forEach((item) => {
      const rawPressure = Array.isArray(item.casting_pressure)
        ? item.casting_pressure
        : convertStringToArray(item.casting_pressure);

      const rawSpeed = Array.isArray(item.speed)
        ? item.speed
        : convertStringToArray(item.speed);

      const rawPosition = Array.isArray(item.position)
        ? item.position
        : convertStringToArray(item.position);

      const model = {
        ...rawModel,
        diecasting_eigenvalue_data_id: item.diecasting_eigenvalue_data_id,
        pressure: normalizeArray(rawPressure, 15), // ✅ normalized
        position: rawPosition,
        speed: normalizeArray(rawSpeed, 15), // ✅ normalized
        sm: item.sm ?? 0,
        dt: item.dt || rawModel.dt,
      };

      modelArray.push(model);
    });

    // Pass data to view correctly

    console.log("Rendering pps with data:", modelArray);
    res.render("pps", { models: modelArray });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
