const express = require("express");
const {
  getIndicators,
  getYears,
  filterData,
  getAllData,
  getAllIndicatorNames,
  deleteData, // Import the delete function
} = require("../controllers/previewController");
const router = express.Router();

router.get("/indicators", getIndicators);
router.post("/filter", filterData);
router.get("/years", getYears);
router.get("/all", getAllData);
router.get("/indicators/names", getAllIndicatorNames);
router.delete("/:tableName/:id", deleteData); // Updated to include tableName

module.exports = router;
