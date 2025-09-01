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

    function labelType(lasercode) {
      // Guard clause: Ensure the input is a valid string before processing.
      if (!lasercode || typeof lasercode !== "string") {
        return "";
      }

      // In SQL, SUBSTRING(string FROM 3 FOR 9) gets 9 characters starting at the 3rd position.
      // In JavaScript, strings are 0-indexed, so we use .slice(2, 11).
      // This starts at index 2 (the 3rd character) and ends at index 11 (2 + 9).
      const codePart = lasercode.slice(2, 11);

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
        default: // This is the equivalent of the SQL 'ELSE'
          return "";
      }
    }

    // loop dataFromDb get rawModel.casting_pressure max value to rawModel.max_pressure & get max speed value to rawModel.max_speed
    dataFromDb.forEach((item) => {
      const castingPressureArray = convertStringToArray(item.casting_pressure);
      const speedArray = convertStringToArray(item.speed);

      const maxPressure = safeMax(castingPressureArray);
      const maxSpeed = safeMax(speedArray);
      const type = labelType(item.lasercode);

      const model = {
        ...rawModel,
        diecasting_eigenvalue_data_id: item.diecasting_eigenvalue_data_id,
        max_pressure: maxPressure,
        max_speed: maxSpeed,
        dt: item.dt || rawModel.dt,
        type: type,
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
