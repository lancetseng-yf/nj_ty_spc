// Entry point for ty-data-visualization

const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;
const sequelize = require('./db2');
const path = require("path");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use('/node_modules', express.static('node_modules'));
// Routes
const indexRoutes = require("./routes/index");
app.use("/", indexRoutes);

app.use("/load-data", require("./routes/load-data"));
app.use("/pps", require("./routes/pps"));
app.use("/psmax", require("./routes/psmax"));
app.use("/bmw-kanban", require("./routes/bmw-kanban"));
app.use("/biscuit", require("./routes/biscuit"));

// Add your data visualization logic here

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  // Test DB connection
  sequelize.authenticate()
  .then(()=> console.log(`DB connected(${process.env.ENVIRONMENT})`))
  .catch(err=> console.error('DB connection error:', err));
});
