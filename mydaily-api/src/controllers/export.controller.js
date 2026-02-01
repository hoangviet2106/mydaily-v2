// src/controllers/export.controller.js
const prisma = require("../prisma");
const { sendCsv, sendXlsx } = require("../utils/export.util");

function toInt(v, def) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function monthRange(year, month) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 1, 0, 0, 0, 0);
  return { start, end };
}

function getFormat(req) {
  const format = String(req.query.format || "csv").toLowerCase();
  return format === "xlsx" ? "xlsx" : "csv";
}

function getUserId(req) {
  return req.user?.sub || req.user?.userId || req.user?.id;
}

function assertAuth(userId, res) {
  if (!userId) {
    res.status(401).json({ error: "UNAUTHORIZED", message: "Missing user identity." });
    return false;
  }
  return true;
}

// ====== EXPORT EXPENSES ======
exports.exportExpenses = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!assertAuth(userId, res)) return;

    const year = toInt(req.query.year, new Date().getFullYear());
    const month = toInt(req.query.month, new Date().getMonth() + 1);
    if (month < 1 || month > 12) {
      return res.status(400).json({ error: "BAD_REQUEST", message: "month must be 1..12" });
    }

    const { start, end } = monthRange(year, month);

    const rows = await prisma.expense.findMany({
      where: {
        user_id: userId,
        expense_date: { gte: start, lt: end },
        // nếu bạn có soft delete:
        // deleted_at: null,
      },
      include: { category: true },
      orderBy: { expense_date: "desc" },
    });

    const flat = rows.map((r) => ({
      id: r.id,
      expense_date: r.expense_date ? new Date(r.expense_date).toISOString().slice(0, 10) : "",
      amount: Number(r.amount || 0),
      category: r.category?.name || "",
      note: r.note || "",
      created_at: r.created_at ? new Date(r.created_at).toISOString() : "",
    }));

    const format = getFormat(req);
    const filenameBase = `expenses_${year}-${String(month).padStart(2, "0")}`;

    if (format === "xlsx") {
      return sendXlsx(
        res,
        flat,
        [
          { header: "ID", key: "id", width: 10 },
          { header: "Date", key: "expense_date", width: 12 },
          { header: "Amount", key: "amount", width: 14 },
          { header: "Category", key: "category", width: 18 },
          { header: "Note", key: "note", width: 30 },
          { header: "Created At", key: "created_at", width: 24 },
        ],
        filenameBase,
        "Expenses"
      );
    }

    return sendCsv(res, flat, ["id", "expense_date", "amount", "category", "note", "created_at"], filenameBase);
  } catch (err) {
    console.error("exportExpenses error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: err.message || "Export failed" });
  }
};

// ====== EXPORT BUDGETS ======
// PATCH: budget theo tháng (tổng), KHÔNG include category, dùng limit_amount
exports.exportBudgets = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!assertAuth(userId, res)) return;

    const year = toInt(req.query.year, new Date().getFullYear());
    const month = toInt(req.query.month, new Date().getMonth() + 1);
    if (month < 1 || month > 12) {
      return res.status(400).json({ error: "BAD_REQUEST", message: "month must be 1..12" });
    }

    const rows = await prisma.budget.findMany({
      where: {
        user_id: userId,
        month: month,
        year: year,
        // deleted_at: null (nếu có)
      },
      orderBy: { id: "desc" },
    });

    const flat = rows.map((r) => ({
      id: r.id,
      year: r.year,
      month: r.month,
      limit_amount: Number(r.limit_amount || 0),
      created_at: r.created_at ? new Date(r.created_at).toISOString() : "",
    }));

    const format = getFormat(req);
    const filenameBase = `budgets_${year}-${String(month).padStart(2, "0")}`;

    if (format === "xlsx") {
      return sendXlsx(
        res,
        flat,
        [
          { header: "ID", key: "id", width: 10 },
          { header: "Year", key: "year", width: 10 },
          { header: "Month", key: "month", width: 10 },
          { header: "Limit Amount", key: "limit_amount", width: 16 },
          { header: "Created At", key: "created_at", width: 24 },
        ],
        filenameBase,
        "Budgets"
      );
    }

    return sendCsv(res, flat, ["id", "year", "month", "limit_amount", "created_at"], filenameBase);
  } catch (err) {
    console.error("exportBudgets error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: err.message || "Export failed" });
  }
};

// ====== EXPORT REPORTS ======
exports.exportReports = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!assertAuth(userId, res)) return;

    const year = toInt(req.query.year, new Date().getFullYear());
    const month = toInt(req.query.month, new Date().getMonth() + 1);
    if (month < 1 || month > 12) {
      return res.status(400).json({ error: "BAD_REQUEST", message: "month must be 1..12" });
    }

    const { start, end } = monthRange(year, month);

    const grouped = await prisma.expense.groupBy({
      by: ["category_id"],
      where: {
        user_id: userId,
        expense_date: { gte: start, lt: end },
        // deleted_at: null (nếu có)
      },
      _sum: { amount: true },
      _count: { _all: true },
    });

    const categoryIds = grouped.map((g) => g.category_id).filter(Boolean);
    const categories = categoryIds.length
      ? await prisma.category.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true },
        })
      : [];

    const catMap = new Map(categories.map((c) => [c.id, c.name]));

    const flat = grouped
      .map((g) => ({
        category_id: g.category_id,
        category: catMap.get(g.category_id) || "",
        total_spent: Number(g._sum.amount || 0),
        transactions: Number(g._count._all || 0),
        year,
        month,
      }))
      .sort((a, b) => b.total_spent - a.total_spent);

    const format = getFormat(req);
    const filenameBase = `reports_summary_${year}-${String(month).padStart(2, "0")}`;

    if (format === "xlsx") {
      return sendXlsx(
        res,
        flat,
        [
          { header: "Year", key: "year", width: 10 },
          { header: "Month", key: "month", width: 10 },
          { header: "Category ID", key: "category_id", width: 12 },
          { header: "Category", key: "category", width: 20 },
          { header: "Total Spent", key: "total_spent", width: 14 },
          { header: "Transactions", key: "transactions", width: 14 },
        ],
        filenameBase,
        "Reports"
      );
    }

    return sendCsv(res, flat, ["year", "month", "category_id", "category", "total_spent", "transactions"], filenameBase);
  } catch (err) {
    console.error("exportReports error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: err.message || "Export failed" });
  }
};
