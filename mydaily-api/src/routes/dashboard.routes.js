const router = require("express").Router();
const auth = require("../middleware/auth");
const {
  basic,
  financeSummary,
} = require("../controllers/dashboard.controller");

router.get("/basic", auth, basic);
router.get("/finance-summary", auth, financeSummary);

module.exports = router;
