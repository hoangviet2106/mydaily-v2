const router = require("express").Router();
const auth = require("../middleware/auth");
const { me } = require("../controllers/user.controller");

router.get("/me", auth, me);

module.exports = router;
