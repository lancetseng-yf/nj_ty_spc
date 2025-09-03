const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.render("bmw-kanban");
});

router.get("/spc", (req, res) => {
  res.render("spc-chart");
});


module.exports = router;
