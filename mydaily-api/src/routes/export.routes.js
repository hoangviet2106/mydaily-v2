// src/routes/export.routes.js
const router = require("express").Router();
const exportController = require("../controllers/export.controller");
const auth = require("../middleware/auth"); // middleware verify JWT -> req.user

router.get("/expenses", auth, exportController.exportExpenses);
router.get("/budgets", auth, exportController.exportBudgets);
router.get("/reports", auth, exportController.exportReports);

module.exports = router;
