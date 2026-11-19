const express = require("express");
const router = express.Router();

const { printTicket, printPromoSign } = require("../controllers/printController");

router.post("/print", printTicket);
router.post("/print-promo/:productId", printPromoSign);

module.exports = router;
