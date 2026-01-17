const prisma = require("../prisma");
const { v4: uuid } = require("uuid");
const { z } = require("zod");

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

async function computeBudgetAlert(userId, date) {
  // Computes alert status for the month of `date`
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  const budget = await prisma.budgets.findFirst({
    where: { user_id: userId, month, year, deleted_at: null },
    select: { id: true, limit_amount: true, month: true, year: true },
  });

  // Sum expenses for this month
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
    percentUsed: percentUsed === null ? null : Math.round(percentUsed * 10000) / 100, // % with 2 decimals
    status,
    threshold: 80,
  };
}

const getExpenses = async (req, res) => {
  const userId = req.user.sub;

  const expenses = await prisma.expenses.findMany({
    where: { user_id: userId, deleted_at: null },
    orderBy: { expense_date: "desc" },
  });

  res.json(expenses);
};

const createExpense = async (req, res) => {
  const userId = req.user.sub;
  const parsed = createExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message || "Invalid input",
    });
  }

  const { amount, expense_date, note, category_id } = parsed.data;

  // Validate category exists and is not soft-deleted
  const cat = await prisma.categories.findFirst({
    where: { id: category_id, deleted_at: null },
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

  return res.status(201).json({ expense, alert });
};

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
  if (data.category_id) {
    const cat = await prisma.categories.findFirst({
      where: { id: data.category_id, deleted_at: null },
      select: { id: true },
    });
    if (!cat) {
      return res.status(404).json({
        error: "CATEGORY_NOT_FOUND",
        message: "Category not found",
      });
    }
  }

  // Note: zod returns Date objects for expense_date
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
