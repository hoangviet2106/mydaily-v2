const router = require("express").Router();

const auth = require("../middleware/auth");
const requireAdmin = require("../middleware/requireAdmin");
const adminController = require("../controllers/admin.controller");

// Admin-only
router.get("/users", auth, requireAdmin, adminController.listUsers);
router.patch("/users/:id/ban", auth, requireAdmin, adminController.setBan);
router.patch("/users/:id/role", auth, requireAdmin, adminController.setRole);
router.patch("/users/:id/plan", auth, requireAdmin, adminController.setPlan);


module.exports = router;
