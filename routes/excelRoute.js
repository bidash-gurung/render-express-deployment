const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

const {
  handleBulkUpload,
  confirmUpload,
} = require("../controllers/excelController");

router.post("/uploadExcel", upload.single("file"), handleBulkUpload);
router.post("/confirmUpload", upload.single("file"), confirmUpload);

module.exports = router;
