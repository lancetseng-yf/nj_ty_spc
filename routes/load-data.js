const express = require("express");
const router = express.Router();
const DiecastingEigenvalueData = require("../models/diecasting_eigenvalue_data");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const { parse, isValid } = require("date-fns");

const sanitize = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w]+/g, "_")
    .replace(/^_+|_+$/g, "");

router.get("/test/5555", async (req, res) => {
  return res.send("Load data from Excel to Postgres (Sequelize)");
});

router.get("/", async (req, res) => {
  try {
    const dir = path.resolve(__dirname, "../file");
    if (!fs.existsSync(dir)) {
      return res.status(404).json({ error: "Directory ./file not found" });
    }

    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".xlsx") || f.endsWith(".xls"));
    if (files.length === 0) {
      return res.status(404).json({ error: "No Excel files found in ./file" });
    }

    const filePath = path.join(dir, files[0]);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      defval: null,
    });

    if (rows.length === 0) {
      return res.status(400).json({ error: "Excel file contains no rows" });
    }

    // Build map of model attributes and their DB field names (sanitized)
    const modelAttrs = DiecastingEigenvalueData.rawAttributes || {};
    const attrNames = Object.keys(modelAttrs);
    const attrSanitizedMap = {};

    attrNames.forEach((attr) => {
      const fld = modelAttrs[attr].field || attr;
      attrSanitizedMap[attr] = {
        attr,
        sanitizedAttr: sanitize(attr),
        sanitizedField: sanitize(fld),
      };
    });

    // Map rows to model attribute names (ignore unknown columns)
    const docs = rows.map((row) => {
      const doc = {};
      Object.entries(row).forEach(([col, val]) => {
        const key = sanitize(col);
        // find matching attribute by sanitized attribute name or sanitized field name
        const match = attrNames.find(
          (a) =>
            attrSanitizedMap[a].sanitizedAttr === key ||
            attrSanitizedMap[a].sanitizedField === key
        );
        if (match) {
          doc[match] = val;
        }
      });
      return doc;
    });

    const excelSerialToDate = (serial) =>
      new Date(Math.round((serial - 25569) * 86400 * 1000));

    const parseDateTime = (v) => {
      if (v == null) return null;
      if (v instanceof Date) return isValid(v) ? v : null;
      if (typeof v === "number" && Number.isFinite(v))
        return excelSerialToDate(v);
      if (typeof v === "string") {
        const s = v.trim();
        // primary pattern yyyy/MM/dd HH:mm:ss
        let dt = parse(s, "yyyy/MM/dd HH:mm:ss", new Date());
        if (isValid(dt)) return dt;
        // alternate with dashes
        dt = parse(s, "yyyy-MM-dd HH:mm:ss", new Date());
        if (isValid(dt)) return dt;
        // try without time or different separators with Date fallback
        const df = new Date(s);
        return isValid(df) ? df : null;
      }
      return null;
    };

    // Remove empty docs (no known attributes)
    const filtered = docs.filter((d) => Object.keys(d).length > 0);
    if (filtered.length === 0) {
      return res
        .status(400)
        .json({ error: "No matching columns found for model attributes" });
    }

    // determine attributes to exclude (primary keys / autoIncrement / explicit id)
    const excludeAttrs = attrNames.filter(
      (a) =>
        a === "id" ||
        (modelAttrs[a] &&
          (modelAttrs[a].primaryKey || modelAttrs[a].autoIncrement))
    );

    // normalize rows: convert dt to JS Date and skip excluded attrs
    const rowsToInsert = filtered
      .map((row) => {
        const out = {};
        Object.entries(row).forEach(([k, v]) => {
          if (excludeAttrs.includes(k)) return; // don't insert id/PK
          let val = v === "" ? null : v;
          if (k === "dt") {
            val = parseDateTime(val);
          }
          out[k] = val;
        });
        return out;
      })
      .filter((r) => Object.keys(r).length > 0);

    if (rowsToInsert.length === 0) {
      return res
        .status(400)
        .json({ error: "No insertable columns after excluding id/PK" });
    }

    // Insert into Postgres via Sequelize (bulk create)
    const inserted = await DiecastingEigenvalueData.bulkCreate(rowsToInsert, {
      validate: true,
      returning: false,
    });

    res.json({
      file: files[0][1],
      insertedCount: Array.isArray(inserted) ? inserted.length : 0,
    });
  } catch (error) {
    console.error(
      "Error loading Excel / inserting data:",
      error.stack || error
    );
    res
      .status(500)
      .json({ error: "Internal Server Error", message: error.message });
  }
});

module.exports = router;
