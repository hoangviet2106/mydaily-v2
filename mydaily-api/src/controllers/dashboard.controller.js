const prisma = require("../prisma");
const { z } = require("zod");

/* =========================
   Helpers
========================= */
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/* =========================
   BASIC DASHBOARD
========================= */
const basic = async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "Missing user in token" });
    }

    const todayStart = startOfToday();
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const monthStart = startOfMonth();
    const nextMonthStart = new Date(monthStart);
    nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);

    const [totalTasksToday, completedTasksToday, spendingThisMonth] = await Promise.all([
      prisma.task.count({
        where: {
          user_id: userId,
          deleted_at: null,
          created_at: { gte: todayStart, lt: tomorrowStart },
        },
      }),
      prisma.task.count({
        where: {
          user_id: userId,
          deleted_at: null,
          is_completed: true,
          created_at: { gte: todayStart, lt: tomorrowStart },
        },
      }),
      // FIX: expense (NOT expenses)
      prisma.expense.aggregate({
        where: {
          user_id: userId,
          deleted_at: null,
          expense_date: { gte: monthStart, lt: nextMonthStart },
        },
        _sum: { amount: true },
      }),
    ]);

    const completionRate =
      totalTasksToday === 0 ? 0 : Math.round((completedTasksToday / totalTasksToday) * 100);

    res.json({
      tier: req.user?.account_type ?? req.user?.accountType ?? "FREE",
      tasksToday: {
        total: totalTasksToday,
        completed: completedTasksToday,
        completionRatePercent: completionRate,
      },
      financeThisMonth: {
        spendingTotal: spendingThisMonth?._sum?.amount ?? 0,
      },
    });
  } catch (err) {
    console.error("DASHBOARD_BASIC_ERROR:", err);
    res.status(500).json({ message: "Dashboard basic error" });
  }
};

/* =========================
   FINANCE SUMMARY
========================= */
const financeSummary = async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "Missing user in token" });
    }

    const querySchema = z.object({
      month: z.coerce.number().int().min(1).max(12).optional(),
      year: z.coerce.number().int().min(1970).max(3000).optional(),
    });
    const parsedQ = querySchema.safeParse(req.query);
    if (!parsedQ.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: parsedQ.error.issues[0]?.message || "Invalid input",
      });
    }

    const now = new Date();
    const month = parsedQ.data.month ?? now.getMonth() + 1;
    const year = parsedQ.data.year ?? now.getFullYear();

    const rangeStart = new Date(year, month - 1, 1);
    const rangeEnd = new Date(year, month, 1);

    // FIX: expense (NOT expenses)
    const totalExpense = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: {
        user_id: userId,
        deleted_at: null,
        expense_date: { gte: rangeStart, lt: rangeEnd },
      },
    });

    // FIX: expense (NOT expenses)
    const byCategory = await prisma.expense.groupBy({
      by: ["category_id"],
      _sum: { amount: true },
      where: {
        user_id: userId,
        deleted_at: null,
        expense_date: { gte: rangeStart, lt: rangeEnd },
      },
    });

    // FIX: budget (NOT budgets)
    const budget = await prisma.budget.findFirst({
      where: { user_id: userId, month, year, deleted_at: null },
    });

    const total = Number(totalExpense?._sum?.amount || 0);
    const limit = budget ? Number(budget.limit_amount) : 0;
    const percentUsed = limit > 0 ? total / limit : null;

    const alert = {
      status:
        limit === 0
          ? total > 0
            ? "OVER"
            : "OK"
          : percentUsed !== null && percentUsed >= 1
          ? "OVER"
          : percentUsed !== null && percentUsed >= 0.8
          ? "WARNING"
          : budget
          ? "OK"
          : "NO_BUDGET",
      threshold: 80,
      percentUsed: percentUsed === null ? null : Math.round(percentUsed * 10000) / 100,
    };

    res.json({
      month,
      year,
      totalExpense: total,
      budgetLimit: budget?.limit_amount || 0,
      alert,
      expenseByCategory: byCategory,
    });
  } catch (err) {
    console.error("FINANCE_SUMMARY_ERROR:", err);
    res.status(500).json({ message: "Finance summary error" });
  }
};

module.exports = {
  basic,
  financeSummary,
};
