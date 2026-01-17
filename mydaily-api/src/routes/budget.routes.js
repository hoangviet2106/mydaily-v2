const router = require("express").Router();
const auth = require("../middleware/auth");
const {
  getCurrentBudget,
  getBudgetByMonth,
  upsertBudget,
} = require("../controllers/budget.controller");

router.use(auth);

router.get("/current", getCurrentBudget);
// GET /budgets?month=1..12&year=YYYY (defaults to current month/year)
router.get("/", getBudgetByMonth);
router.post("/", upsertBudget);

module.exports = router;
