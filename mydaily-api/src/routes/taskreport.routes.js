const router = require("express").Router();
const auth = require("../middleware/auth");
const { summary, trend, topOverdue } = require("../controllers/taskreport.controller");

router.use(auth);

router.get("/summary", summary);
router.get("/trend", trend);
router.get("/top-overdue", topOverdue);

module.exports = router;
