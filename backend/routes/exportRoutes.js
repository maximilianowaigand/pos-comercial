const express = require("express");
const router = express.Router();
const exportController = require("../controllers/exportController");

router.get("/export-excel", exportController.exportarExcel);

module.exports = router;
