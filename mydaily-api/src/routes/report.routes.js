const router = require("express").Router();
const auth = require("../middleware/auth");
const {
  breakdownByCategory,
  budgetVsActual,
  spendingTrend,
  periodicReport,
  topCategories,
} = require("../controllers/report.controller");

router.use(auth);

// 1) Breakdown
router.get("/breakdown", breakdownByCategory);

// 2) Comparison
router.get("/comparison", budgetVsActual);

// 3) Trend
router.get("/trend", spendingTrend);

// 4) Periodic
router.get("/periodic", periodicReport);

// 5) Analysis
router.get("/analysis/top-categories", topCategories);

module.exports = router;
