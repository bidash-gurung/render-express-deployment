const express = require("express");
const router = express.Router();
const indicatorController = require("../controllers/countController");

// GET /api/indicators/count
router.get("/count", indicatorController.getTotalIndicators);

module.exports = router;
