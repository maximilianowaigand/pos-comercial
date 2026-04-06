const express = require("express");
const router = express.Router();

const { printTicket } = require("../controllers/printController");

router.post("/print", printTicket);

module.exports = router;
