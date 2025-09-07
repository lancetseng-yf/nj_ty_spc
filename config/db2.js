require("dotenv").config(); // Load environment variables from .env file
const { Sequelize } = require("sequelize");
const { Pool } = require('pg');
const isProduction = process.env.NODE_ENV === "production";

const sequelizeConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: process.env.DB_DIALECT || "postgres",
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
};

if (isProduction) {
  sequelizeConfig.dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: false, // set to true if you're using a proper CA cert
    },
  };
}

const database = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  sequelizeConfig
);

module.exports = database;