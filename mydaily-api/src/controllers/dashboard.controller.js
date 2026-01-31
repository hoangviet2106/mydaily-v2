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

/**
 * Streak helpers (Asia/Bangkok UTC+7)
 * - Lưu streak.last_streak_date là DATE-only (UTC 00:00) tương ứng ngày Bangkok
 */
const TZ_OFFSET_MIN = 7 * 60;

function bangkokDateOnly(date = new Date()) {
  const shifted = new Date(date.getTime() + TZ_OFFSET_MIN * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();
  return new Date(Date.UTC(y, m, d)); // 00:00 UTC
}

function sameDateOnly(a, b) {
  if (!a || !b) return false;
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
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

    const todayDateOnly = bangkokDateOnly(new Date());

    const [
      totalTasksToday,
      completedTasksToday,
      spendingThisMonth,
      streakRow,
      categoriesCountThisMonth,
    ] = await Promise.all([
      // Tasks created today
      prisma.task.count({
        where: {
          user_id: userId,
          deleted_at: null,
          created_at: { gte: todayStart, lt: tomorrowStart },
        },
      }),

      // ✅ Completed today: dựa theo completed_at (đúng streak logic)
      prisma.task.count({
        where: {
          user_id: userId,
          deleted_at: null,
          is_completed: true,
          completed_at: { gte: todayStart, lt: tomorrowStart },
        },
      }),

      // Expense total this month
      prisma.expense.aggregate({
        where: {
          user_id: userId,
          deleted_at: null,
          expense_date: { gte: monthStart, lt: nextMonthStart },
        },
        _sum: { amount: true },
      }),

      // ✅ Streak row
      prisma.userStreak.findUnique({
        where: { user_id: userId },
        select: {
          current_streak: true,
          longest_streak: true,
          last_streak_date: true,
        },
      }),

      // ✅ categories count used this month (distinct category_id)
      prisma.expense.groupBy({
        by: ["category_id"],
        where: {
          user_id: userId,
          deleted_at: null,
          expense_date: { gte: monthStart, lt: nextMonthStart },
        },
      }),
    ]);

    const completionRate =
      totalTasksToday === 0 ? 0 : Math.round((completedTasksToday / totalTasksToday) * 100);

    const todayDone = streakRow?.last_streak_date
      ? sameDateOnly(streakRow.last_streak_date, todayDateOnly)
      : false;

    res.json({
      tier: req.user?.account_type ?? req.user?.accountType ?? "FREE",
      tasksToday: {
        total: totalTasksToday,
        completed: completedTasksToday,
        completionRatePercent: completionRate,
      },
      financeThisMonth: {
        spendingTotal: spendingThisMonth?._sum?.amount ?? 0,
        categoriesCount: Array.isArray(categoriesCountThisMonth) ? categoriesCountThisMonth.length : 0, // ✅ NEW
      },

      // ✅ NEW: streak object for frontend
      streak: {
        current_streak: streakRow?.current_streak ?? 0,
        longest_streak: streakRow?.longest_streak ?? 0,
        last_streak_date: streakRow?.last_streak_date ?? null,
        today_done: todayDone,
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

    const totalExpense = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: {
        user_id: userId,
        deleted_at: null,
        expense_date: { gte: rangeStart, lt: rangeEnd },
      },
    });

    const byCategory = await prisma.expense.groupBy({
      by: ["category_id"],
      _sum: { amount: true },
      where: {
        user_id: userId,
        deleted_at: null,
        expense_date: { gte: rangeStart, lt: rangeEnd },
      },
    });

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
