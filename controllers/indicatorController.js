const Indicator = require("../models/indicatorModel");
const pool = require("../config/db"); // MySQL database connection

// for pagination
exports.getIndicators = async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const totalIndicators = await Indicator.getTotalIndicators();

    const indicators = await Indicator.getPaginatedIndicators(page, limit);

    res.json({
      success: true,
      indicators,
      totalPages: Math.ceil(totalIndicators / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching indicators:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getAllIndicators = async (req, res) => {
  try {
    const indicators = await Indicator.getAllIndicators();
    res.json({ success: true, indicators });
  } catch (error) {
    console.error("Error fetching all indicators:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.addIndicator = async (req, res) => {
  const { indicator, sector } = req.body;

  if (!indicator || !sector)
    return res.status(400).json({ success: false, message: "Missing fields" });

  const exists = await Indicator.checkIndicatorExists(indicator, sector);
  if (exists)
    return res.status(409).json({
      success: false,
      message: "Indicator already exists in this sector",
    });

  await Indicator.addIndicator(indicator, sector);
  res.json({ success: true, message: "Indicator added successfully" });
};

exports.editIndicator = async (req, res) => {
  const { id } = req.params;
  const { indicator, sector } = req.body;

  if (!indicator || !sector) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  try {
    const duplicate = await Indicator.checkDuplicateOnUpdate(
      id,
      indicator,
      sector
    );
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message:
          "Another indicator with the same name and sector already exists",
      });
    }

    const result = await Indicator.editIndicator(id, indicator, sector);

    if (result)
      res.json({ success: true, message: "Indicator updated successfully" });
    else
      res.status(404).json({ success: false, message: "Indicator not found" });
  } catch (error) {
    console.error("Error updating indicator:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.deleteIndicator = async (req, res) => {
  const { id } = req.params;
  const result = await Indicator.deleteIndicator(id);
  if (result)
    res.json({ success: true, message: "Indicator deleted successfully" });
  else res.status(404).json({ success: false, message: "Indicator not found" });
};

// manual upload
// exports.addOrUpdateIndicatorData = async (req, res) => {
//   const { indicator, sector, year, quartile, value } = req.body;

//   const validQuartiles = ["Q1", "Q2", "Q3", "Q4"];
//   if (
//     !indicator ||
//     !sector ||
//     !year ||
//     !quartile ||
//     value == null ||
//     !validQuartiles.includes(quartile)
//   ) {
//     return res
//       .status(400)
//       .json({ success: false, message: "Missing or invalid fields" });
//   }

//   // Map sector to corresponding table name
//   let tableName;
//   switch (sector) {
//     case "Social":
//       tableName = "social_sector";
//       break;
//     case "Economic":
//       tableName = "economic_sector";
//       break;
//     case "Governance":
//       tableName = "governance_sector";
//       break;
//     default:
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid sector" });
//   }

//   try {
//     const exists = await Indicator.findIndicatorData(
//       indicator,
//       year,
//       tableName
//     );

//     if (exists) {
//       await Indicator.updateQuartileValue(
//         indicator,
//         year,
//         quartile,
//         value,
//         tableName
//       );
//     } else {
//       await Indicator.insertIndicatorData(
//         indicator,
//         sector,
//         year,
//         quartile,
//         value,
//         tableName
//       );
//     }

//     res.json({ success: true, message: "Indicator data saved successfully" });
//   } catch (err) {
//     console.error("Error saving indicator data:", err);
//     res.status(500).json({ success: false, message: "Server Error" });
//   }
// };
exports.addOrUpdateIndicatorData = async (req, res) => {
  const { indicator, sector, year, quartile, value } = req.body;

  const validQuartiles = ["Q1", "Q2", "Q3", "Q4"];
  if (
    !indicator ||
    !sector ||
    !year ||
    !quartile ||
    value == null ||
    !validQuartiles.includes(quartile)
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Missing or invalid fields" });
  }

  // Map sector to corresponding table name
  let tableName;
  switch (sector) {
    case "Social":
      tableName = "social_sector";
      break;
    case "Economic":
      tableName = "economic_sector";
      break;
    case "Governance":
      tableName = "governance_sector";
      break;
    default:
      return res
        .status(400)
        .json({ success: false, message: "Invalid sector" });
  }

  try {
    const exists = await Indicator.findIndicatorData(
      indicator,
      year,
      tableName
    );

    if (exists) {
      // Check if value is same (to avoid unnecessary update)
      const [rows] = await pool.query(
        `SELECT ${quartile} FROM ${tableName} WHERE indicator = ? AND year = ?`,
        [indicator, year]
      );

      const currentValue = rows[0]?.[quartile];

      if (currentValue === value) {
        return res.json({
          success: true,
          status: "none",
          message: "Data already exists with same value.",
        });
      }

      await Indicator.updateQuartileValue(
        indicator,
        year,
        quartile,
        value,
        tableName
      );

      return res.json({
        success: true,
        status: "updated",
        message: "Indicator data updated successfully.",
      });
    } else {
      await Indicator.insertIndicatorData(
        indicator,
        sector,
        year,
        quartile,
        value,
        tableName
      );

      return res.json({
        success: true,
        status: "added",
        message: "Indicator data added successfully.",
      });
    }
  } catch (err) {
    console.error("Error saving indicator data:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
