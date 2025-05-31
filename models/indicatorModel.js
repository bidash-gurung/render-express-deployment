const pool = require("../config/db"); // MySQL database connection

// Get paginated indicators
exports.getPaginatedIndicators = async (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const [rows] = await pool.query(
    "SELECT * FROM indicator_metadata LIMIT ? OFFSET ?",
    [Number(limit), Number(offset)]
  );
  return rows;
};
exports.getAllIndicators = async () => {
  const [rows] = await pool.query("SELECT * FROM indicator_metadata");
  return rows;
};
// Get total number of indicators
exports.getTotalIndicators = async () => {
  const [result] = await pool.query(
    "SELECT COUNT(*) AS total FROM indicator_metadata"
  );
  return result[0].total;
};

// Add a new indicator
exports.addIndicator = async (indicator, sector) => {
  const [result] = await pool.query(
    "INSERT INTO indicator_metadata (indicator, sector) VALUES (?, ?)",
    [indicator, sector]
  );
  return result.insertId;
};

exports.editIndicator = async (id, indicator, sector) => {
  const [result] = await pool.query(
    "UPDATE indicator_metadata SET indicator = ?, sector = ? WHERE id = ?",
    [indicator, sector, id]
  );
  return result.affectedRows;
};

exports.deleteIndicator = async (id) => {
  const [result] = await pool.query(
    "DELETE FROM indicator_metadata WHERE id = ?",
    [id]
  );
  return result.affectedRows;
};

// Check if indicator already exists in the same sector
exports.checkIndicatorExists = async (indicator, sector) => {
  const [rows] = await pool.query(
    "SELECT * FROM indicator_metadata WHERE indicator = ? AND sector = ?",
    [indicator, sector]
  );
  return rows.length > 0;
};

exports.checkDuplicateOnUpdate = async (id, indicator, sector) => {
  const [rows] = await pool.query(
    "SELECT * FROM indicator_metadata WHERE indicator = ? AND sector = ? AND id != ?",
    [indicator, sector, id]
  );
  return rows.length > 0;
};

// Manual Upload
// ✅ Check if indicator data exists for given indicator name and year
exports.findIndicatorData = async (indicator, year, tableName) => {
  const [rows] = await pool.query(
    `SELECT * FROM ${tableName} WHERE indicator = ? AND year = ?`,
    [indicator, year]
  );
  return rows.length > 0;
};

// ✅ Insert new row with value in selected quartile
exports.insertIndicatorData = async (
  indicator,
  sector,
  year,
  quartile,
  value,
  tableName
) => {
  const [result] = await pool.query(
    `INSERT INTO ${tableName} (indicator, sector, year, ${quartile}) VALUES (?, ?, ?, ?)`,
    [indicator, sector, year, value]
  );
  return result.insertId;
};

// ✅ Update quartile column if year exists
exports.updateQuartileValue = async (
  indicator,
  year,
  quartile,
  value,
  tableName
) => {
  const [result] = await pool.query(
    `UPDATE ${tableName} SET ${quartile} = ? WHERE indicator = ? AND year = ?`,
    [value, indicator, year]
  );
  return result.affectedRows;
};
