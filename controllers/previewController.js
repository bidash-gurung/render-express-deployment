const pool = require("../config/db"); // Import the MySQL connection pool

const getAllIndicatorNames = async (req, res) => {
  try {
    const query = `SELECT DISTINCT indicator_name, sector FROM indicator_metadata`; // SQL query to fetch distinct indicator names and sectors
    const [results] = await pool.query(query); // Execute the query

    if (results.length === 0) {
      return res.status(404).json({ message: "No indicators found" }); // Handle case where no indicators are found
    }

    res.json(results); // Return the results directly
  } catch (error) {
    console.error("Error fetching indicator names:", error); // Log the error
    return res.status(500).json({ error: "Database query failed" }); // Handle any database errors
  }
};

// Fetch all data based on indicator name
const getAllData = async (req, res) => {
  const { indicator_name } = req.query;

  if (!indicator_name) {
    return res
      .status(400)
      .json({ error: "Indicator name parameter is required" });
  }

  try {
    const query = `SELECT * FROM ??`; // Use ?? for table name to prevent SQL injection
    const [results] = await pool.query(query, [indicator_name]);

    if (results.length === 0) {
      return res
        .status(404)
        .json({ message: "No data found for the selected indicator" });
    }

    res.json(results);
  } catch (error) {
    console.error("Error fetching data:", error);
    return res.status(500).json({ error: "Database query failed" });
  }
};

// Get all indicators and sectors
const getIndicators = async (req, res) => {
  const { sector } = req.query; // Get the selected sector from the query parameters

  if (!sector) {
    return res.status(400).json({ error: "Sector parameter is required" });
  }

  try {
    // Query to fetch indicator_name, sector, and indicator_afn for the selected sector
    const query = `
      SELECT indicator_name, sector, indicator_afn 
      FROM indicator_metadata 
      WHERE sector = ?`; // Use ? for parameterized query to prevent SQL injection

    const [results] = await pool.query(query, [sector]);

    if (results.length === 0) {
      return res
        .status(404)
        .json({ message: "No indicators found for the selected sector" });
    }

    res.json(results);
  } catch (error) {
    console.error("Error fetching indicators:", error);
    return res.status(500).json({ error: "Database query failed" });
  }
};

// Fetch years based on selected indicator
const getYears = async (req, res) => {
  const { indicator_name } = req.query; // Get the selected indicator name from the query parameters
  if (!indicator_name) {
    return res
      .status(400)
      .json({ error: "Indicator name parameter is required" });
  }

  try {
    const query = `SELECT DISTINCT year FROM ?? ORDER BY year ASC`; // Use ?? for table name to prevent SQL injection
    const [results] = await pool.query(query, [indicator_name]);

    if (results.length === 0) {
      return res
        .status(404)
        .json({ message: "No years found for the selected indicator" });
    }

    res.json(results.map((row) => row.year)); // Return only the years
  } catch (error) {
    console.error("Error fetching years:", error);
    return res.status(500).json({ error: "Database query failed" });
  }
};

const filterData = async (req, res) => {
  const { indicator_name, from_year, to_year } = req.body;

  try {
    // Step 1: Get the sector from the indicator_metadata table
    const sectorQuery = `SELECT sector FROM indicator_metadata WHERE indicator_name = ?`;
    const [sectorResults] = await pool.query(sectorQuery, [indicator_name]);

    if (sectorResults.length === 0) {
      return res.status(404).json({ error: "Indicator not found" });
    }

    const sector = sectorResults[0].sector;

    // Step 2: Query the data from the respective indicator table
    let query = `SELECT * FROM ?? WHERE 1=1`; // Start with a basic query
    const queryParams = [indicator_name]; // Initialize with the indicator name

    // Adjust the query based on the year range
    if (from_year && to_year) {
      query += ` AND year BETWEEN ? AND ?`; // Use BETWEEN for year range
      queryParams.push(from_year, to_year);
    } else if (from_year) {
      query += ` AND year = ?`; // Single year
      queryParams.push(from_year);
    } else if (to_year) {
      query += ` AND year = ?`; // Single year
      queryParams.push(to_year);
    }

    const [dataResults] = await pool.query(query, queryParams);
    // Format the results
    const formattedResults = dataResults.map((row) => ({
      indicators: row.indicators
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase()),
      sector: sector, // Include the retrieved sector
      year: row.year,
      q1: row.q1,
      q2: row.q2,
      q3: row.q3,
      q4: row.q4,
    }));

    res.json(formattedResults);
  } catch (error) {
    console.error("Error filtering data:", error);
    return res.status(500).json({ error: "Database query failed" });
  }
};
const deleteData = async (req, res) => {
  const { tableName, id } = req.params; // Get tableName and id from the request

  // Check if tableName and id are provided
  if (!tableName || !id) {
    return res.status(400).json({ error: "Table name and ID are required" });
  }

  try {
    const query = `DELETE FROM ?? WHERE id = ?`; // Use ?? for table name to prevent SQL injection
    const [result] = await pool.query(query, [tableName, id]); // Execute the query

    // Check if any rows were affected
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Data not found" });
    }

    // Respond with success message
    res.json({ message: "Data deleted successfully" });
  } catch (error) {
    console.error("Error deleting data:", error);
    return res.status(500).json({ error: "Database query failed" });
  }
};

module.exports = {
  getIndicators,
  getYears,
  filterData,
  getAllData,
  getAllIndicatorNames,
  deleteData,
};
