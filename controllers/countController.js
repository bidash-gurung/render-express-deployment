const db = require("../config/db"); // your MySQL DB connection

const indicatorTables = [
  "agricultural_marketing_centres_number",
  "agriculture_number",
  "diplomatic_relations_number",
  "education",
  "foreign_trade",
  "forestry_number",
  "health",
  "health_human_resources",
  "health_institutes_number",
  "income",
  "industries",
  "labour_and_employment",
  "livestock_number",
  "national_poverty_rate",
  "number_of_educational_institutes_schools_institutes_and_centres",
  "population",
  "power_units_in_million",
  "public_finance_nu_in_million",
  "sanitation",
  "tourism",
  "trade",
  "transport_communications",
];

exports.getTotalIndicators = async (req, res) => {
  try {
    let totalIndicators = 0;

    for (const table of indicatorTables) {
      const [columns] = await db.query(`SHOW COLUMNS FROM \`${table}\``);
      totalIndicators += columns.length;
    }

    res.status(200).json({ totalIndicators });
  } catch (error) {
    console.error("Error fetching indicators:", error);
    res.status(500).json({ message: "Failed to fetch total indicators" });
  }
};
