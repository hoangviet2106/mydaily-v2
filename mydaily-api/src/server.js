require("dotenv").config();
const express = require("express");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const expenseRoutes = require("./routes/expense.routes");
const budgetRoutes = require("./routes/budget.routes");
const categoryRoutes = require("./routes/category.routes");
const reportRoutes = require("./routes/report.routes");
const exportRoutes = require("./routes/export.routes");
const taskRoutes = require("./routes/task.routes");
const taskreportRoutes = require("./routes/taskreport.routes");

const app = express();
app.use(express.json());

/* ===== HEALTH CHECK ===== */
app.get("/health", (req, res) => {
  res.json({ ok: true, message: "MyDaily API is running" });
});

/* ===== API ROUTES ===== */
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/tasks", taskRoutes);
app.use("/taskreport", taskreportRoutes);
app.use("/expenses", expenseRoutes);
app.use("/budgets", budgetRoutes);
app.use("/categories", categoryRoutes);
app.use("/reports", reportRoutes);
app.use("/export", exportRoutes);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
