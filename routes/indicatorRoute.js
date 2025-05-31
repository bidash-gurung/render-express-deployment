const express = require("express");
const indicatorController = require("../controllers/indicatorController"); // Import the profile controller

const router = express.Router();

router.get("/", indicatorController.getIndicators);
router.post("/", indicatorController.addIndicator);
router.put("/:id", indicatorController.editIndicator); // Enable editing
router.delete("/:id", indicatorController.deleteIndicator); // Enable deleting
router.get("/all", indicatorController.getAllIndicators); // New route
router.post("/indicator-data", indicatorController.addOrUpdateIndicatorData);

module.exports = router;
