const express = require("express");
const router = express.Router();
const statsController = require("../controllers/statsController");
require("../config/env");

function requireDashboardPassword(req, res, next) {
  const expectedPassword = process.env.DASHBOARD_PASSWORD || "4221619";
  const providedPassword = req.get("x-dashboard-password") || "";

  if (providedPassword !== expectedPassword) {
    return res.status(401).json({ error: "Contraseña incorrecta" });
  }

  next();
}

router.get("/dashboard", requireDashboardPassword, statsController.dashboard);

module.exports = router;
