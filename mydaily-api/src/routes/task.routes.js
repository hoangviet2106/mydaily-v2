const router = require("express").Router();
const auth = require("../middleware/auth");
const {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  completeTask, // ✅ NEW
} = require("../controllers/task.controller");

router.use(auth);

router.get("/", getTasks);
router.post("/", createTask);
router.patch("/:id/complete", completeTask); // ✅ NEW
router.patch("/:id", updateTask);
router.delete("/:id", deleteTask);

module.exports = router;
