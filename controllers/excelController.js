// controllers/BulkUploadController.js
const xlsx = require("xlsx");
const db = require("../config/db");
const fs = require("fs");
const path = require("path");

// Helper function to create notification messages
async function createNotificationMessage(
  action,
  year,
  quarters = [],
  indicatorCount = 0
) {
  let message = "";

  if (action === "upload") {
    message = `New data for year ${year} uploaded successfully with ${indicatorCount} indicator(s).`;
  } else if (action === "update") {
    const quartersText = quarters.length
      ? ` for quarter(s) ${quarters.join(", ")}`
      : "";
    message = `Data for year ${year}${quartersText} updated for ${indicatorCount} indicator(s).`;
  }

  if (message) {
    try {
      const now = new Date();
      const date = now.toISOString().split("T")[0]; // YYYY-MM-DD
      const time = now.toTimeString().split(" ")[0]; // HH:MM:SS

      await db.query(
        `INSERT INTO notification (notification, date, time) VALUES (?, ?, ?)`,
        [message, date, time]
      );

      // console.log("Notification inserted:", message);
    } catch (err) {
      console.error("Failed to insert notification:", err.message);
    }
  }

  return message;
}

// Validate Excel file structure matches our template
function validateExcelStructure(jsonData) {
  try {
    if (jsonData.length < 3) return false;

    // Check header rows
    const headerRow = jsonData[0] || [];
    const quarterRow = jsonData[1] || [];

    // Check for required columns
    const hasIndicators = headerRow[0] === "INDICATORS";
    const hasPercentage =
      headerRow[3] && headerRow[3].toString().includes("PERCENTAGE (%)");

    if (!hasIndicators || !hasPercentage) return false;

    // Check quarter indicators
    const hasQuarters = quarterRow.some(
      (cell) => cell && cell.toString().match(/QUARTER|QTR/i)
    );

    if (!hasQuarters) return false;

    // Check for section headers (rows with only first column populated)
    const hasSections = jsonData.some(
      (row) =>
        row &&
        row[0] &&
        typeof row[0] === "string" &&
        row[0].trim() !== "" &&
        row
          .slice(1)
          .every((cell) => cell === null || cell === undefined || cell === "")
    );

    return hasSections;
  } catch (err) {
    console.error("Validation error:", err);
    return false;
  }
}

// Process Excel data into our structured format
function processExcelData(jsonData, year) {
  const result = {};
  let currentTable = null;
  let quarterMapping = {};

  // Map quarter columns from the second row
  const quarterRow = jsonData[1];
  if (quarterRow) {
    quarterRow.forEach((colName, index) => {
      if (typeof colName === "string") {
        const cleanName = colName.trim().toLowerCase();
        if (cleanName.includes("1st quarter") || cleanName.includes("q1"))
          quarterMapping[index] = "q1";
        if (cleanName.includes("2nd quarter") || cleanName.includes("q2"))
          quarterMapping[index] = "q2";
        if (cleanName.includes("3rd quarter") || cleanName.includes("q3"))
          quarterMapping[index] = "q3";
        if (cleanName.includes("4th quarter") || cleanName.includes("q4"))
          quarterMapping[index] = "q4";
      }
    });
    // console.log("Quarter Mapping:", quarterMapping);
  }

  // Process each data row
  for (let i = 2; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!row || row.length === 0) continue;

    // Detect section headers (rows where only first column has content)
    if (
      row[0] &&
      typeof row[0] === "string" &&
      row[0].trim() &&
      !row[0].includes("INDICATORS") &&
      row
        .slice(1)
        .every((cell) => cell === null || cell === undefined || cell === "")
    ) {
      currentTable = row[0]
        .trim()
        .replace(/[^a-zA-Z0-9 ]/g, "")
        .replace(/\s+/g, "_")
        .toLowerCase()
        .replace(/\d+$/, "");

      result[currentTable] = {
        indicators: [],
        year: year,
        q1: [],
        q2: [],
        q3: [],
        q4: [],
      };
      continue;
    }

    // Process indicator rows
    if (currentTable && row[0] && typeof row[0] === "string") {
      const indicatorName = row[0]
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^A-Z0-9_]/gi, "")
        .toLowerCase();

      result[currentTable].indicators.push(indicatorName);

      // Initialize all quarters as null
      ["q1", "q2", "q3", "q4"].forEach((q) =>
        result[currentTable][q].push(null)
      );

      // Fill in actual quarter values where available
      Object.entries(quarterMapping).forEach(([index, quarter]) => {
        const valueIndex = result[currentTable].indicators.length - 1;
        const cellValue = row[index];
        result[currentTable][quarter][valueIndex] =
          cellValue !== null && cellValue !== undefined ? cellValue : null;
      });
    }
  }

  return result;
}

// Sanitize table names for SQL
function sanitizeTableName(name) {
  return name.replace(/[^a-zA-Z0-9_]/g, "");
}

// Check if table exists in database
async function ensureTableExists(tableName) {
  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) as count
       FROM information_schema.tables
       WHERE table_schema = DATABASE()
       AND table_name = ?`,
      [tableName]
    );

    if (rows[0].count === 0) {
      throw new Error(`Table '${tableName}' does not exist.`);
    }
  } catch (error) {
    console.error(`Error checking table ${tableName}:`, error.message);
    throw error;
  }
}

// Check if data already exists for a given year
async function checkExistingYearData(processedData, year) {
  const filledQuarters = [];

  for (const table of Object.keys(processedData)) {
    const tableName = sanitizeTableName(table);
    await ensureTableExists(tableName);

    const [rows] = await db.query(
      `SELECT q1, q2, q3, q4 FROM ${tableName} WHERE year = ? LIMIT 1`,
      [year]
    );

    if (rows.length > 0) {
      const row = rows[0];
      if (row.q1) filledQuarters.push("Q1");
      if (row.q2) filledQuarters.push("Q2");
      if (row.q3) filledQuarters.push("Q3");
      if (row.q4) filledQuarters.push("Q4");
    }
  }

  return {
    exists: filledQuarters.length > 0,
    filledQuarters,
  };
}

// Save processed data to database
async function saveToDatabase(processedData) {
  const tables = Object.keys(processedData);

  for (const table of tables) {
    const tableData = processedData[table];
    const tableName = sanitizeTableName(table);

    await ensureTableExists(tableName);

    for (let i = 0; i < tableData.indicators.length; i++) {
      const indicator = tableData.indicators[i];

      const query = `SELECT * FROM ${tableName} WHERE indicators = ? AND year = ? LIMIT 1`;
      // console.log("Executing query:", query, "with parameters:", [
      //   indicator,
      //   tableData.year,
      // ]);

      const [existingRows] = await db.query(query, [indicator, tableData.year]);

      if (existingRows.length > 0) {
        const existing = existingRows[0];
        const q1 = tableData.q1[i] !== null ? tableData.q1[i] : existing.q1;
        const q2 = tableData.q2[i] !== null ? tableData.q2[i] : existing.q2;
        const q3 = tableData.q3[i] !== null ? tableData.q3[i] : existing.q3;
        const q4 = tableData.q4[i] !== null ? tableData.q4[i] : existing.q4;

        // Log the year and quartile values being sent for update
        // console.log(`Updating ${tableName} for year ${tableData.year}:`, {
        //   q1,
        //   q2,
        //   q3,
        //   q4,
        //   indicator,
        // });

        await db.query(
          `UPDATE ${tableName} SET q1 = ?, q2 = ?, q3 = ?, q4 = ? WHERE indicators = ? AND year = ?`,
          [q1, q2, q3, q4, indicator, tableData.year]
        );
      } else {
        await db.query(
          `INSERT INTO ${tableName} (indicators, year, q1, q2, q3, q4) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            indicator,
            tableData.year,
            tableData.q1[i],
            tableData.q2[i],
            tableData.q3[i],
            tableData.q4[i],
          ]
        );
      }
    }
  }
}

// Handle initial file upload
const handleBulkUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const year = req.body.year || new Date().getFullYear();
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
    });

    // Validate file structure
    if (!validateExcelStructure(jsonData)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        message:
          "Invalid file format. Please use the correct template structure.",
      });
    }

    const processedData = processExcelData(jsonData, year);
    const existingData = await checkExistingYearData(processedData, year);

    if (existingData && existingData.filledQuarters.length > 0) {
      fs.unlinkSync(req.file.path);
      return res.status(200).json({
        confirmUpdate: true,
        message: `Data for year ${year} already exists. Would you like to update it?`,
        existingQuarters: existingData.filledQuarters,
      });
    }

    await saveToDatabase(processedData);

    // Calculate total indicators processed
    const totalIndicators = Object.values(processedData).reduce(
      (sum, table) => sum + table.indicators.length,
      0
    );

    // Only send notification if we actually processed data
    if (totalIndicators > 0) {
      await createNotificationMessage("upload", year, [], totalIndicators);
    }

    fs.unlinkSync(req.file.path);

    res.status(200).json({
      message: `New data for year ${year} uploaded successfully.`,
      indicatorsProcessed: totalIndicators,
      sectionsProcessed: Object.keys(processedData).length,
    });
  } catch (error) {
    console.error("Error processing file:", error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    let errorMessage = "Error processing file";
    if (error.message.includes("does not exist")) {
      errorMessage =
        "Invalid file structure. Please use the correct template format.";
    }

    res.status(500).json({
      message: errorMessage,
      error: error.message,
    });
  }
};

// Handle confirmed updates
const confirmUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const year = req.body.year;
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
    });

    // Validate file structure
    if (!validateExcelStructure(jsonData)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        message:
          "Invalid file format. Please use the correct template structure.",
      });
    }

    const processedData = processExcelData(jsonData, year);

    // Track updates
    const updateSummary = {};

    for (const table of Object.keys(processedData)) {
      const tableName = sanitizeTableName(table);
      const tableData = processedData[table];

      await ensureTableExists(tableName);

      for (let i = 0; i < tableData.indicators.length; i++) {
        const indicator = tableData.indicators[i];

        const query = `SELECT q1, q2 FROM ${tableName} WHERE indicators = ? AND year = ? LIMIT 1`;
        // console.log("Executing query:", query, "with parameters:", [
        //   indicator,
        //   year,
        // ]);

        const [existingData] = await db.query(query, [indicator, year]);

        if (existingData.length === 0) {
          // If no existing data for Q1 or Q2, insert new data
          await db.query(
            `INSERT INTO ${tableName} (indicators, year, q1, q2) VALUES (?, ?, ?, ?)`,
            [indicator, year, tableData.q1[i], tableData.q2[i]]
          );
        } else {
          // If existing data found, update it
          const existingRow = existingData[0];
          const updatedQ1 =
            tableData.q1[i] !== null ? tableData.q1[i] : existingRow.q1;
          const updatedQ2 =
            tableData.q2[i] !== null ? tableData.q2[i] : existingRow.q2;

          await db.query(
            `UPDATE ${tableName} SET q1 = ?, q2 = ? WHERE indicators = ? AND year = ?`,
            [updatedQ1, updatedQ2, indicator, year]
          );

          // Log the updates for notification
          if (!updateSummary[year]) {
            updateSummary[year] = { updatedIndicators: [], count: 0 };
          }
          updateSummary[year].updatedIndicators.push(indicator);
          updateSummary[year].count += 1;
        }
      }
    }

    // Create notification if updates occurred
    if (updateSummary[year] && updateSummary[year].count > 0) {
      await createNotificationMessage(
        "update",
        year,
        [],
        updateSummary[year].count
      );
    }

    fs.unlinkSync(req.file.path);
    res.status(200).json({
      message: `Data for year ${year} processed successfully.`,
      updates: updateSummary[year] || { updatedIndicators: [], count: 0 },
    });
  } catch (error) {
    console.error("Error updating file:", error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    let errorMessage = "Error updating file";
    if (error.message.includes("does not exist")) {
      errorMessage =
        "Invalid file structure. Please use the correct template format.";
    }

    res.status(500).json({
      message: errorMessage,
      error: error.message,
    });
  }
};

module.exports = {
  handleBulkUpload,
  confirmUpload,
};
