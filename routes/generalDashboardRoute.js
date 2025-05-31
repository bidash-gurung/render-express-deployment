const express = require("express");
const router = express.Router();

const { getDashboardData } = require("../controllers/generalDataController");

router.get("/dashboard-data", getDashboardData);

module.exports = router;
