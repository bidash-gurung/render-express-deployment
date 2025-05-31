const express = require("express");
const router = express.Router();
const graphController = require("../controllers/graphController");

router.post("/graph/indicators", graphController.getIndicatorsBySector);
router.get("/years", graphController.getAvailableYears);
router.get("/graph/indicator-data", graphController.getIndicatorData);
router.get(
  "/graph/indicators-by-sector",
  graphController.getIndicatorsBySector
);
router.get("/graph/available-years", graphController.getAvailableYears);

router.post("/graph/data", graphController.getUniqueIndicators);
router.post("/graph/unique-year", graphController.getUniqueYearsForIndicator);
router.post("/graph/wanted_data", graphController.DataByYearQuartileRange);

module.exports = router;
