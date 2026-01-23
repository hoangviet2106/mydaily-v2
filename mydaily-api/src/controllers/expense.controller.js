const prisma = require("../prisma");
const { v4: uuid } = require("uuid");
const { z } = require("zod");

/** =========================
 * Schemas
 * ========================= */
const createExpenseSchema = z.object({
  amount: z.coerce.number().positive(),
  expense_date: z.coerce.date(),
  note: z.string().max(2000).optional().nullable(),
  category_id: z.string().uuid(),
});

const updateExpenseSchema = z
  .object({
    amount: z.coerce.number().positive().optional(),
    expense_date: z.coerce.date().optional(),
    note: z.string().max(2000).optional().nullable(),
    category_id: z.string().uuid().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "At least one field must be provided",
  });

const expenseQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(1970).max(3000).optional(),
});

/** =========================
 * Date helpers (server time)
 * ========================= */
function dayStart(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function nextDayStart(d = new Date()) {
  const s = dayStart(d);
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() + 1);
}
function toISOStringSafe(date) {
  try {
    return date.toISOString();
  } catch {
    return null;
  }
}

/** =========================
 * Budget alert
 * ========================= */
async function computeBudgetAlert(userId, date) {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  const budget = await prisma.budgets.findFirst({
    where: { user_id: userId, month, year, deleted_at: null },
    select: { id: true, limit_amount: true, month: true, year: true },
  });

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const agg = await prisma.expenses.aggregate({
    _sum: { amount: true },
    where: {
      user_id: userId,
      deleted_at: null,
      expense_date: { gte: start, lt: end },
    },
  });

  const totalExpense = Number(agg._sum.amount || 0);
  const limit = budget ? Number(budget.limit_amount) : null;
  const percentUsed = limit && limit > 0 ? totalExpense / limit : null;

  let status = "NO_BUDGET";
  if (limit === null) status = "NO_BUDGET";
  else if (limit === 0) status = totalExpense > 0 ? "OVER" : "OK";
  else if (percentUsed >= 1) status = "OVER";
  else if (percentUsed >= 0.8) status = "WARNING";
  else status = "OK";

  return {
    month,
    year,
    budgetLimit: limit,
    totalExpense,
    percentUsed: percentUsed === null ? null : Math.round(percentUsed * 10000) / 100,
    status,
    threshold: 80,
  };
}

/** =========================
 * GET /expenses?month=&year=
 * FREE: only current month
 * PREMIUM: unlimited (all if no query)
 * ========================= */
const getExpenses = async (req, res) => {
  const userId = req.user.sub;

  // user plan
  const user = await prisma.users.findFirst({
    where: { id: userId, deleted_at: null },
    select: { account_type: true },
  });

  if (!user) {
    return res.status(401).json({
      error: "UNAUTHORIZED",
      message: "User not found or not authorized",
    });
  }

  // parse query
  const parsed = expenseQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message || "Invalid input",
    });
  }

  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear();

  let month = parsed.data.month;
  let year = parsed.data.year;

  // FREE: only current month (force or block)
  if (user.account_type === "FREE") {
    month = month ?? curMonth;
    year = year ?? curYear;

    if (Number(month) !== curMonth || Number(year) !== curYear) {
      return res.status(403).json({
        error: "PLAN_RESTRICTION",
        message: "Bạn đang sử dụng gói FREE. Gói FREE chỉ cho phép xem chi tiêu trong tháng hiện tại.",
        cta: "Mua PREMIUM để xem chi tiêu không giới hạn theo tháng và lịch sử.",
        allowed: { month: curMonth, year: curYear },
        plan: "FREE",
        upgrade_required: true,
      });
    }
  }

  const where = { user_id: userId, deleted_at: null };

  // If month/year provided (FREE always has it; PREMIUM optional)
  if (month && year) {
    const start = new Date(Number(year), Number(month) - 1, 1);
    const end = new Date(Number(year), Number(month), 1);
    where.expense_date = { gte: start, lt: end };
  }

  const expenses = await prisma.expenses.findMany({
    where,
    orderBy: { expense_date: "desc" },
  });

  return res.json(expenses);
};

/** =========================
 * POST /expenses
 * FREE: max 5 creates/day (server time, created_at)
 * PREMIUM: unlimited
 * Return reset_at at 00:00 next day
 * ========================= */
const createExpense = async (req, res) => {
  const userId = req.user.sub;

  const parsed = createExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message || "Invalid input",
    });
  }

  // user plan
  const user = await prisma.users.findFirst({
    where: { id: userId, deleted_at: null },
    select: { account_type: true },
  });

  if (!user) {
    return res.status(401).json({
      error: "UNAUTHORIZED",
      message: "User not found or not authorized",
    });
  }

  // FREE: daily create limit
  if (user.account_type === "FREE") {
    const LIMIT = 5;
    const start = dayStart(new Date());
    const resetAt = nextDayStart(new Date());

    const used = await prisma.expenses.count({
      where: {
        user_id: userId,
        deleted_at: null,
        created_at: { gte: start, lt: resetAt },
      },
    });

    if (used >= LIMIT) {
      return res.status(403).json({
        error: "EXPENSE_DAILY_LIMIT_REACHED",
        message: `Gói FREE chỉ được tạo tối đa ${LIMIT} expense mỗi ngày. Mua PREMIUM để tạo expense không giới hạn`,
        cta: "Mua PREMIUM để tạo expense không giới hạn.",
        plan: "FREE",
        upgrade_required: true,
        limit: LIMIT,
        used,
        remaining: 0,
        reset_at: toISOStringSafe(resetAt),
      });
    }
  }

  const { amount, expense_date, note, category_id } = parsed.data;

  // category ownership + not deleted
  const cat = await prisma.categories.findFirst({
    where: { id: category_id, user_id: userId, deleted_at: null },
    select: { id: true },
  });

  if (!cat) {
    return res.status(404).json({
      error: "CATEGORY_NOT_FOUND",
      message: "Category not found",
    });
  }

  const expense = await prisma.expenses.create({
    data: {
      id: uuid(),
      amount,
      expense_date,
      note: note ?? null,
      category_id,
      user_id: userId,
    },
  });

  const alert = await computeBudgetAlert(userId, expense_date);

  // Optional: trả quota info để UI hiển thị "còn x/5"
  let quota = null;
  if (user.account_type === "FREE") {
    const LIMIT = 5;
    const start = dayStart(new Date());
    const resetAt = nextDayStart(new Date());
    const used = await prisma.expenses.count({
      where: {
        user_id: userId,
        deleted_at: null,
        created_at: { gte: start, lt: resetAt },
      },
    });
    quota = {
      limit: LIMIT,
      used,
      remaining: Math.max(0, LIMIT - used),
      reset_at: toISOStringSafe(resetAt),
      plan: "FREE",
    };
  } else {
    quota = { plan: "PREMIUM" };
  }

  return res.status(201).json({ expense, alert, quota });
};

/** =========================
 * PATCH /expenses/:id
 * ========================= */
const updateExpense = async (req, res) => {
  const userId = req.user.sub;
  const { id } = req.params;

  const parsed = updateExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message || "Invalid input",
    });
  }

  const existing = await prisma.expenses.findFirst({
    where: { id, user_id: userId, deleted_at: null },
  });
  if (!existing) {
    return res.status(404).json({
      error: "NOT_FOUND",
      message: "Expense not found",
    });
  }

  const data = { ...parsed.data };

  // category ownership check
  if (data.category_id) {
    const cat = await prisma.categories.findFirst({
      where: { id: data.category_id, user_id: userId, deleted_at: null },
      select: { id: true },
    });
    if (!cat) {
      return res.status(404).json({
        error: "CATEGORY_NOT_FOUND",
        message: "Category not found",
      });
    }
  }

  const updated = await prisma.expenses.update({
    where: { id },
    data: {
      amount: data.amount,
      expense_date: data.expense_date,
      note: Object.prototype.hasOwnProperty.call(data, "note") ? data.note : undefined,
      category_id: data.category_id,
    },
  });

  const alert = await computeBudgetAlert(userId, updated.expense_date);
  return res.json({ expense: updated, alert });
};

/** =========================
 * DELETE /expenses/:id (soft delete)
 * ========================= */
const deleteExpense = async (req, res) => {
  const userId = req.user.sub;
  const { id } = req.params;

  const existing = await prisma.expenses.findFirst({
    where: { id, user_id: userId, deleted_at: null },
    select: { id: true, expense_date: true },
  });
  if (!existing) {
    return res.status(404).json({
      error: "NOT_FOUND",
      message: "Expense not found",
    });
  }

  await prisma.expenses.update({
    where: { id },
    data: { deleted_at: new Date() },
  });

  const alert = await computeBudgetAlert(userId, existing.expense_date);
  return res.json({ message: "Expense deleted", alert });
};

module.exports = {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
};
