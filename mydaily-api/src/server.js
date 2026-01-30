require("dotenv").config();
const express = require("express");
const cors = require("cors");

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
const passport = require("passport");
const cookieParser = require("cookie-parser");
const initPassport = require("./auth/passport");
const oauthRoutes = require("./routes/oauth.routes");
const app = express();

app.use(express.json());
// Support HTML form submits as well (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:5173"],
    credentials: true,
  })
);

/* ===== Auth/OAuth middleware (must be before oauth routes) ===== */
app.use(cookieParser());
app.use(passport.initialize());
initPassport();

/* ===== HEALTH CHECK ===== */
app.get("/health", (req, res) => {
  res.json({ ok: true, message: "MyDaily API is running" });
});

/* ===== API ROUTES ===== */
// OAuth endpoints: /auth/google, /auth/google/callback
app.use("/auth", oauthRoutes);
// Local auth endpoints: /auth/login, /auth/register
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

const adminRoutes = require("./routes/admin.routes");
app.use("/admin", adminRoutes);

/* ===== 404 + ERROR HANDLER ===== */
app.use((req, res) => res.status(404).json({ message: "Not found" }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Internal Server Error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});


