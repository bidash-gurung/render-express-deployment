const db = require("../config/db");

exports.getAvailableYears = async (req, res) => {
  try {
    const [sectorTables] = await db.query(
      `SELECT DISTINCT sector, indicator_name FROM indicator_metadata GROUP BY sector`
    );

    if (sectorTables.length === 0) {
      return res.status(404).json({ error: "No indicator tables found" });
    }

    let yearsSet = new Set();

    for (const sectorTable of sectorTables) {
      const tableName = sectorTable.indicator_name;

      try {
        const [years] = await db.query(
          `SELECT DISTINCT year FROM ?? ORDER BY year DESC`,
          [tableName]
        );
        years.forEach((y) => yearsSet.add(y.year));
      } catch (err) {
        console.warn(`Skipping ${tableName}: Table might not exist`);
      }
    }

    res.json([...yearsSet]);
  } catch (error) {
    console.error("Error fetching available years:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getIndicatorData = async (req, res) => {
  try {
    const { indicator_name, from_year, to_year, from_quartile, to_quartile } =
      req.query;

    if (!indicator_name) {
      return res.status(400).json({ error: "Indicator name is required" });
    }

    let query = `SELECT * FROM ?? WHERE 1`;
    let params = [indicator_name];

    if (from_year && to_year) {
      query += " AND year BETWEEN ? AND ?";
      params.push(from_year, to_year);
    } else if (from_year) {
      query += " AND year >= ?";
      params.push(from_year);
    } else if (to_year) {
      query += " AND year <= ?";
      params.push(to_year);
    }

    const [data] = await db.query(query, params);

    if (data.length === 0) {
      return res
        .status(404)
        .json({ message: "No data found for this indicator" });
    }

    const validQuartiles = ["q1", "q2", "q3", "q4"];
    let quartilesToInclude = [];

    if (from_quartile && to_quartile) {
      const startIndex = validQuartiles.indexOf(from_quartile);
      const endIndex = validQuartiles.indexOf(to_quartile);
      quartilesToInclude = validQuartiles.slice(startIndex, endIndex + 1);
    } else {
      quartilesToInclude = validQuartiles;
    }

    let filteredData = data.map((record) => {
      const filteredRecord = { ...record };
      Object.keys(filteredRecord).forEach((key) => {
        if (
          !quartilesToInclude.includes(key) &&
          key !== "indicators" &&
          key !== "year" &&
          key !== "created_at"
        ) {
          delete filteredRecord[key];
        }
      });
      return filteredRecord;
    });

    res.json(filteredData);
  } catch (error) {
    console.error("Error fetching indicator data:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getIndicatorsBySector = async (req, res) => {
  try {
    const { sector } = req.query;

    if (!sector) {
      return res.status(400).json({ error: "Sector name is required" });
    }

    const [indicators] = await db.query(
      "SELECT indicator_name, indicator_afn FROM indicator_metadata WHERE sector = ?",
      [sector]
    );

    if (indicators.length === 0) {
      return res
        .status(404)
        .json({ error: "No indicators found for this sector" });
    }

    res.json({ sector, indicators });
  } catch (error) {
    console.error("Error fetching indicators:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getAvailableYearsForIndicator = async (req, res) => {
  try {
    const { indicator } = req.query;

    if (!indicator) {
      return res.status(400).json({ error: "Indicator is required" });
    }

    const [yearRows] = await db.query(
      `SELECT DISTINCT year FROM ?? ORDER BY year ASC`,
      [indicator]
    );

    const availableYears = yearRows.map((row) => row.year);

    res.status(200).json({ availableYears });
  } catch (error) {
    console.error("Error fetching available years:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getUniqueIndicators = async (req, res) => {
  try {
    const { table_name } = req.body;

    if (!table_name) {
      return res
        .status(400)
        .json({ error: "Table name is required in request body" });
    }

    const [tableExists] = await db.query(`SHOW TABLES LIKE ?`, [table_name]);
    if (tableExists.length === 0) {
      return res.status(404).json({ error: "Specified table not found" });
    }

    const [data] = await db.query(`SELECT DISTINCT indicators FROM ??`, [
      table_name,
    ]);

    if (data.length === 0) {
      return res
        .status(404)
        .json({ message: "No unique indicators found", table: table_name });
    }

    res.json({
      table: table_name,
      unique_indicators: data.map((item) => item.indicators),
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

exports.getUniqueYearsForIndicator = async (req, res) => {
  try {
    const { table_name, indicators } = req.body;

    if (!table_name || !indicators) {
      return res.status(400).json({
        error: "Table name and indicator are required in request body",
      });
    }

    const [tableExists] = await db.query(`SHOW TABLES LIKE ?`, [table_name]);
    if (tableExists.length === 0) {
      return res.status(404).json({ error: "Specified table not found" });
    }

    const [years] = await db.query(
      `SELECT DISTINCT year FROM ?? WHERE indicators = ? ORDER BY year`,
      [table_name, indicators]
    );

    if (years.length === 0) {
      return res.status(404).json({
        message: "No unique years found for the given indicator",
        table: table_name,
        indicator: indicators,
      });
    }

    res.json({
      table: table_name,
      indicator: indicators,
      unique_years: years.map((item) => item.year),
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

exports.DataByYearQuartileRange = async (req, res) => {
  try {
    const {
      table_name,
      indicators,
      start_year,
      end_year,
      start_quartile,
      end_quartile,
    } = req.body;

    if (
      !table_name ||
      !indicators ||
      !start_year ||
      !end_year ||
      !start_quartile ||
      !end_quartile
    ) {
      return res.status(400).json({
        error:
          "Table name, indicator, start year, end year, start quartile, and end quartile are required.",
      });
    }

    const startYear = parseInt(start_year, 10);
    const endYear = parseInt(end_year, 10);
    const startQ = parseInt(start_quartile, 10);
    const endQ = parseInt(end_quartile, 10);

    if (isNaN(startYear) || isNaN(endYear) || isNaN(startQ) || isNaN(endQ)) {
      return res.status(400).json({
        error: "Year and quartile values must be valid numbers.",
      });
    }

    const [tableExists] = await db.query(`SHOW TABLES LIKE ?`, [table_name]);
    if (tableExists.length === 0) {
      return res.status(404).json({ error: "Specified table not found." });
    }

    const quartileColumns = [];
    for (let i = startQ; i <= endQ; i++) {
      quartileColumns.push(`q${i}`);
    }

    const query = `SELECT id, indicators, year, ${quartileColumns
      .map(() => "??")
      .join(
        ", "
      )} FROM ?? WHERE indicators = ? AND year BETWEEN ? AND ? ORDER BY year`;

    const [data] = await db.query(query, [
      ...quartileColumns,
      table_name,
      indicators,
      startYear,
      endYear,
    ]);

    if (data.length === 0) {
      return res.status(404).json({
        message: "No data found for the given criteria.",
        table: table_name,
        indicator: indicators,
      });
    }

    res.json({
      table: table_name,
      indicator: indicators,
      start_year: startYear,
      end_year: endYear,
      start_quartile: `q${startQ}`,
      end_quartile: `q${endQ}`,
      filtered_data: data,
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};
