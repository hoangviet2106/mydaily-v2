const prisma = require("../prisma");
const { z } = require("zod");

/** =========================
 * Helpers
 * ========================= */
function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function parseYMD(s) {
  // expect YYYY-MM-DD
  const d = new Date(String(s));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function fmtYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function rangeDefaultLastNDays(n = 30) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (n - 1)); // inclusive window
  return { from: startOfDay(from), to: endOfDay(to) };
}

const rangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  days: z.coerce.number().int().min(1).max(365).optional(), // fallback if from/to not provided
});

/** =========================
 * GET /taskreport/summary
 * - Summary for created tasks within date range
 * ========================= */
exports.summary = async (req, res) => {
  try {
    const userId = req.user.sub;

    const parsed = rangeSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message || "Invalid query",
      });
    }

    // Build range
    let from;
    let to;

    if (parsed.data.from || parsed.data.to) {
      if (!parsed.data.from || !parsed.data.to) {
        return res.status(400).json({
          error: "VALIDATION_ERROR",
          message: "from and to are required together (YYYY-MM-DD)",
        });
      }
      const dFrom = parseYMD(parsed.data.from);
      const dTo = parseYMD(parsed.data.to);
      if (!dFrom || !dTo) {
        return res.status(400).json({
          error: "VALIDATION_ERROR",
          message: "Invalid from/to, expected YYYY-MM-DD",
        });
      }
      from = startOfDay(dFrom);
      to = endOfDay(dTo);
    } else {
      const days = parsed.data.days ?? 30;
      const r = rangeDefaultLastNDays(days);
      from = r.from;
      to = r.to;
    }

    const today = startOfDay(new Date());
    const next7 = endOfDay(new Date(new Date().setDate(new Date().getDate() + 7)));

    // Base: tasks created within [from, to]
    const baseWhere = {
      user_id: userId,
      deleted_at: null,
      created_at: { gte: from, lte: to },
    };

    const [totalCreated, completed, open] = await Promise.all([
      prisma.tasks.count({ where: baseWhere }),
      prisma.tasks.count({ where: { ...baseWhere, is_completed: true } }),
      prisma.tasks.count({ where: { ...baseWhere, is_completed: false } }),
    ]);

    // overdue: not completed AND due_date < today (within created range)
    const overdue = await prisma.tasks.count({
      where: {
        ...baseWhere,
        is_completed: false,
        due_date: { lt: today },
      },
    });

    // due today: not completed AND due_date == today
    const dueToday = await prisma.tasks.count({
      where: {
        ...baseWhere,
        is_completed: false,
        due_date: { gte: today, lte: endOfDay(today) },
      },
    });

    // due next 7 days: not completed AND due between today..next7
    const dueNext7Days = await prisma.tasks.count({
      where: {
        ...baseWhere,
        is_completed: false,
        due_date: { gte: today, lte: next7 },
      },
    });

    const completionRate = totalCreated === 0 ? 0 : Math.round((completed / totalCreated) * 10000) / 100; // %
    return res.json({
      range: { from: from.toISOString(), to: to.toISOString() },
      totalCreated,
      completed,
      open,
      overdue,
      dueToday,
      dueNext7Days,
      completionRate,
    });
  } catch (err) {
    console.error("TASKREPORT_SUMMARY_ERROR:", err);
    return res.status(500).json({ error: "SERVER_ERROR", message: "Task report summary error" });
  }
};

/** =========================
 * GET /taskreport/trend
 * - Trend by created_at (daily)
 * Query: days=30 (1..365)
 * ========================= */
exports.trend = async (req, res) => {
  try {
    const userId = req.user.sub;

    const schema = z.object({
      days: z.coerce.number().int().min(7).max(365).optional().default(30),
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message || "Invalid query",
      });
    }

    const days = parsed.data.days;
    const { from, to } = rangeDefaultLastNDays(days);

    // Fetch minimal data for aggregation in JS
    const rows = await prisma.tasks.findMany({
      where: {
        user_id: userId,
        deleted_at: null,
        created_at: { gte: from, lte: to },
      },
      select: { created_at: true, is_completed: true },
      orderBy: { created_at: "asc" },
    });

    // Prepare buckets
    const map = new Map(); // key YYYY-MM-DD -> { created, completedCreated }
    for (let i = 0; i < days; i++) {
      const d = new Date(from);
      d.setDate(d.getDate() + i);
      map.set(fmtYMD(d), { created: 0, completedCreated: 0 });
    }

    for (const r of rows) {
      const key = fmtYMD(new Date(r.created_at));
      const b = map.get(key);
      if (!b) continue;
      b.created += 1;
      if (r.is_completed) b.completedCreated += 1;
    }

    const points = Array.from(map.entries()).map(([date, v]) => ({
      date,
      created: v.created,
      completedCreated: v.completedCreated,
    }));

    return res.json({
      range: { from: from.toISOString(), to: to.toISOString() },
      days,
      points,
    });
  } catch (err) {
    console.error("TASKREPORT_TREND_ERROR:", err);
    return res.status(500).json({ error: "SERVER_ERROR", message: "Task report trend error" });
  }
};

/** =========================
 * GET /taskreport/top-overdue
 * - List overdue tasks (not completed, due_date < today)
 * Query: limit=10
 * ========================= */
exports.topOverdue = async (req, res) => {
  try {
    const userId = req.user.sub;

    const schema = z.object({
      limit: z.coerce.number().int().min(1).max(50).optional().default(10),
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message || "Invalid query",
      });
    }

    const today = startOfDay(new Date());

    const items = await prisma.tasks.findMany({
      where: {
        user_id: userId,
        deleted_at: null,
        is_completed: false,
        due_date: { lt: today },
      },
      orderBy: [{ due_date: "asc" }, { created_at: "asc" }],
      take: parsed.data.limit,
      select: {
        id: true,
        title: true,
        description: true,
        due_date: true,
        created_at: true,
        is_completed: true,
      },
    });

    return res.json({ total: items.length, items });
  } catch (err) {
    console.error("TASKREPORT_TOP_OVERDUE_ERROR:", err);
    return res.status(500).json({ error: "SERVER_ERROR", message: "Task report overdue error" });
  }
};
