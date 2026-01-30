const prisma = require("../prisma");
const { v4: uuid } = require("uuid");
const { z } = require("zod");

const budgetUpsertSchema = z.object({
  limit_amount: z.number().nonnegative(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(1970).max(3000),
});

const budgetQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(1970).max(3000).optional(),
});

const getCurrentBudget = async (req, res) => {
  const userId = req.user.sub;
  const now = new Date();

  const budget = await prisma.budget.findFirst({
    where: {
      user_id: userId,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      deleted_at: null,
    },
  });

  res.json(budget);
};

// GET /budgets?month=1..12&year=YYYY (defaults to current month/year)
const getBudgetByMonth = async (req, res) => {
  const userId = req.user.sub;

  const parsed = budgetQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message || "Invalid input",
    });
  }

  const now = new Date();
  const month = parsed.data.month ?? (now.getMonth() + 1);
  const year = parsed.data.year ?? now.getFullYear();

  const budget = await prisma.budget.findFirst({
    where: { user_id: userId, month, year, deleted_at: null },
  });

  return res.json(budget);
};

const upsertBudget = async (req, res) => {
  const userId = req.user.sub;
  const parsed = budgetUpsertSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message || "Invalid input",
    });
  }

  const { limit_amount, month, year } = parsed.data;

  const budget = await prisma.budget.upsert({
    where: {
      user_id_month_year: {
        user_id: userId,
        month,
        year,
      },
    },
    update: { limit_amount },
    create: {
      id: uuid(),
      user_id: userId,
      limit_amount,
      month,
      year,
    },
  });

  res.json(budget);
};

module.exports = {
  getCurrentBudget,
  getBudgetByMonth,
  upsertBudget,
};
