const prisma = require("../prisma");
const { z } = require("zod");

/* =====================================================
   Shared helpers
===================================================== */

function monthRange(month, year) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

async function mapCategoryNames(groupedRows) {
  // groupedRows: [{ category_id, _sum: { amount } }, ...]
  const ids = groupedRows.map((r) => r.category_id);
  if (ids.length === 0) {
    return [];
  }
  const cats = await prisma.categories.findMany({
    where: { id: { in: ids }, deleted_at: null },
    select: { id: true, name: true },
  });
  const map = new Map(cats.map((c) => [c.id, c.name]));
  return groupedRows.map((r) => ({
    category_id: r.category_id,
    category_name: map.get(r.category_id) || null,
    total: Number(r._sum.amount || 0),
  }));
}

function toMoneyNumber(v) {
  return Number(v || 0);
}

function normalizeMonthYear(query) {
  const schema = z.object({
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(1970).max(3000).optional(),
  });
  const parsed = schema.safeParse(query);
  if (!parsed.success) return { ok: false, error: parsed.error };

  const now = new Date();
  const month = parsed.data.month ?? now.getMonth() + 1;
  const year = parsed.data.year ?? now.getFullYear();
  return { ok: true, month, year };
}

/* =====================================================
   1) Breakdown: spending by category
===================================================== */

const breakdownByCategory = async (req, res) => {
  try {
    const userId = req.user.sub;

    const my = normalizeMonthYear(req.query);
    if (!my.ok) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: my.error.issues[0]?.message || "Invalid input",
      });
    }

    const { start, end } = monthRange(my.month, my.year);

    const grouped = await prisma.expenses.groupBy({
      by: ["category_id"],
      _sum: { amount: true },
      where: {
        user_id: userId,
        deleted_at: null,
        expense_date: { gte: start, lt: end },
      },
      orderBy: { _sum: { amount: "desc" } },
    });

    const rows = await mapCategoryNames(grouped);
    const total = rows.reduce((acc, r) => acc + r.total, 0);

    return res.json({
      month: my.month,
      year: my.year,
      total,
      breakdown: rows,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Report breakdown error" });
  }
};

/* =====================================================
   2) Comparison: Budget vs Actual
===================================================== */

const budgetVsActual = async (req, res) => {
  try {
    const userId = req.user.sub;
    const my = normalizeMonthYear(req.query);
    if (!my.ok) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: my.error.issues[0]?.message || "Invalid input",
      });
    }

    const { start, end } = monthRange(my.month, my.year);

    const [expenseAgg, budget] = await Promise.all([
      prisma.expenses.aggregate({
        _sum: { amount: true },
        where: {
          user_id: userId,
          deleted_at: null,
          expense_date: { gte: start, lt: end },
        },
      }),
      prisma.budgets.findFirst({
        where: { user_id: userId, month: my.month, year: my.year, deleted_at: null },
        select: { id: true, limit_amount: true, month: true, year: true },
      }),
    ]);

    const actual = toMoneyNumber(expenseAgg._sum.amount);
    const limit = budget ? toMoneyNumber(budget.limit_amount) : null;

    const remaining = limit === null ? null : Math.max(limit - actual, 0);
    const over = limit === null ? null : Math.max(actual - limit, 0);
    const percentUsed =
      limit === null ? null : limit === 0 ? (actual > 0 ? 100 : 0) : (actual / limit) * 100;

    let status = "NO_BUDGET";
    if (limit === null) status = "NO_BUDGET";
    else if (limit === 0) status = actual > 0 ? "OVER" : "OK";
    else if (percentUsed >= 100) status = "OVER";
    else if (percentUsed >= 80) status = "WARNING";
    else status = "OK";

    return res.json({
      month: my.month,
      year: my.year,
      actual,
      budgetLimit: limit === null ? 0 : limit,
      remaining,
      over,
      percentUsed: percentUsed === null ? null : Math.round(percentUsed * 100) / 100,
      status,
      threshold: 80,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Report comparison error" });
  }
};

/* =====================================================
   3) Trend: spending trend for last N months
===================================================== */

const spendingTrend = async (req, res) => {
  try {
    const userId = req.user.sub;

    const schema = z.object({
      months: z.coerce.number().int().min(1).max(24).optional(),
      endMonth: z.coerce.number().int().min(1).max(12).optional(),
      endYear: z.coerce.number().int().min(1970).max(3000).optional(),
    });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message || "Invalid input",
      });
    }

    const now = new Date();
    const monthsBack = parsed.data.months ?? 6;
    const endMonth = parsed.data.endMonth ?? now.getMonth() + 1;
    const endYear = parsed.data.endYear ?? now.getFullYear();

    // Build month list oldest -> newest
    const points = [];
    let m = endMonth;
    let y = endYear;
    for (let i = 0; i < monthsBack; i++) {
      points.push({ month: m, year: y });
      m -= 1;
      if (m === 0) {
        m = 12;
        y -= 1;
      }
    }
    points.reverse();

    const results = [];
    for (const p of points) {
      const { start, end } = monthRange(p.month, p.year);
      const agg = await prisma.expenses.aggregate({
        _sum: { amount: true },
        where: {
          user_id: userId,
          deleted_at: null,
          expense_date: { gte: start, lt: end },
        },
      });
      results.push({
        month: p.month,
        year: p.year,
        total: toMoneyNumber(agg._sum.amount),
      });
    }

    return res.json({
      months: monthsBack,
      endMonth,
      endYear,
      points: results,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Report trend error" });
  }
};

/* =====================================================
   4) Periodic: quarterly / yearly report
===================================================== */

const periodicReport = async (req, res) => {
  try {
    const userId = req.user.sub;

    const schema = z.object({
      year: z.coerce.number().int().min(1970).max(3000),
      mode: z.enum(["quarter", "year"]).default("quarter"),
    });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message || "Invalid input",
      });
    }

    const year = parsed.data.year;
    const mode = parsed.data.mode;

    if (mode === "year") {
      const start = new Date(year, 0, 1);
      const end = new Date(year + 1, 0, 1);
      const agg = await prisma.expenses.aggregate({
        _sum: { amount: true },
        where: { user_id: userId, deleted_at: null, expense_date: { gte: start, lt: end } },
      });

      return res.json({
        mode,
        year,
        total: toMoneyNumber(agg._sum.amount),
      });
    }

    // quarter mode
    const quarters = [
      { quarter: 1, start: new Date(year, 0, 1), end: new Date(year, 3, 1) },
      { quarter: 2, start: new Date(year, 3, 1), end: new Date(year, 6, 1) },
      { quarter: 3, start: new Date(year, 6, 1), end: new Date(year, 9, 1) },
      { quarter: 4, start: new Date(year, 9, 1), end: new Date(year + 1, 0, 1) },
    ];

    const out = [];
    for (const q of quarters) {
      const agg = await prisma.expenses.aggregate({
        _sum: { amount: true },
        where: {
          user_id: userId,
          deleted_at: null,
          expense_date: { gte: q.start, lt: q.end },
        },
      });
      out.push({ quarter: q.quarter, total: toMoneyNumber(agg._sum.amount) });
    }

    const total = out.reduce((acc, r) => acc + r.total, 0);
    return res.json({ mode, year, total, quarters: out });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Report periodic error" });
  }
};

/* =====================================================
   5) Analysis: top categories
===================================================== */

const topCategories = async (req, res) => {
  try {
    const userId = req.user.sub;
    const schema = z
      .object({
        month: z.coerce.number().int().min(1).max(12).optional(),
        year: z.coerce.number().int().min(1970).max(3000).optional(),
        limit: z.coerce.number().int().min(1).max(50).default(5),
      })
      .refine((o) => !(o.month && !o.year), { message: "year is required when month is provided" });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message || "Invalid input",
      });
    }

    const now = new Date();
    const month = parsed.data.month ?? now.getMonth() + 1;
    const year = parsed.data.year ?? now.getFullYear();
    const limit = parsed.data.limit;

    const { start, end } = monthRange(month, year);

    const grouped = await prisma.expenses.groupBy({
      by: ["category_id"],
      _sum: { amount: true },
      where: { user_id: userId, deleted_at: null, expense_date: { gte: start, lt: end } },
      orderBy: { _sum: { amount: "desc" } },
      take: limit,
    });

    const rows = await mapCategoryNames(grouped);
    const totalTop = rows.reduce((acc, r) => acc + r.total, 0);

    return res.json({
      month,
      year,
      limit,
      totalTop,
      topCategories: rows,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Report analysis error" });
  }
};

module.exports = {
  breakdownByCategory,
  budgetVsActual,
  spendingTrend,
  periodicReport,
  topCategories,
};
