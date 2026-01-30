const router = require("express").Router();
const auth = require("../middleware/auth");
const ensureNotBanned = require("../middleware/ensureNotBanned"); // ✅ THÊM
const { me, updateMe } = require("../controllers/user.controller");

router.get("/me", auth, ensureNotBanned, me);       // ✅ GẮN
router.patch("/me", auth, ensureNotBanned, updateMe); // ✅ GẮN

module.exports = router;
