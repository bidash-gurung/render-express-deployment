const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST, // sql12.freesqldatabase.com
  user: process.env.DB_USER, // sql12782383
  password: process.env.DB_PASSWORD, // 9YTLtXwkYb
  database: process.env.DB_NAME, // sql12782383
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool
  .getConnection()
  .then(() => console.log("Connected to MySQL database"))
  .catch((err) => console.error("DB Connection Error:", err));

module.exports = pool;
