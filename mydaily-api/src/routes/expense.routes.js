const router = require("express").Router();
const auth = require("../middleware/auth");
const {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} = require("../controllers/expense.controller");

router.use(auth);

router.get("/", getExpenses);
router.post("/", createExpense);
router.patch("/:id", updateExpense);
router.delete("/:id", deleteExpense);

module.exports = router;
