// Entry point for ty-data-visualization

const express = require("express");
const app = express();
const PORT = process.env.PORT || 3002;
const sequelize = require("./config/db2");
const path = require("path");
const cookieParser = require("cookie-parser");
const { i18nMiddleware } = require("./middlewares/i18n");

// --- EJS setup ---
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// --- Middleware setup ---
app.use(cookieParser());
app.use(i18nMiddleware);

app.use(express.static(path.join(__dirname, "views")));
app.use("/node_modules", express.static("node_modules"));
app.use(express.static("public"));

// Routes
app.use("/", require("./routes/index"));
app.use("/pps", require("./routes/pps"));
app.use("/psmax", require("./routes/psmax"));
app.use("/biscuit", require("./routes/biscuit"));
app.use("/diecasting-report", require("./routes/diecasting-report"));

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT} (v1.4.1)`);
  // Test DB connection
  sequelize
    .authenticate()
    .then(() => console.log(`DB connected(${process.env.ENVIRONMENT})`))
    .catch((err) => console.error("DB connection error:", err));
});
