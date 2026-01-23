const prisma = require("../prisma");
const { v4: uuid } = require("uuid");
const { z } = require("zod");

/** =========================
 * Helpers
 * ========================= */
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function decodeJwtPayload(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      Buffer.from(base64, "base64")
        .toString("binary")
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getAccountType(req) {
  // Ưu tiên lấy từ req.user (JWT decode ở middleware auth)
  const u = req.user || {};

  const raw =
    u.account_type ??
    u.accountType ??
    u.plan ??
    u.tier ??
    u.subscription ??
    (typeof u.is_premium === "boolean" ? (u.is_premium ? "PREMIUM" : "FREE") : undefined);

  if (raw) return String(raw).toUpperCase();

  // Fallback: nếu middleware có gắn req.me
  const me = req.me || {};
  const raw2 =
    me.account_type ??
    me.accountType ??
    me.plan ??
    me.tier ??
    me.subscription ??
    (typeof me.is_premium === "boolean" ? (me.is_premium ? "PREMIUM" : "FREE") : undefined);

  if (raw2) return String(raw2).toUpperCase();

  // Fallback cuối: thử decode token từ header (trường hợp req.user chỉ có sub)
  const auth = req.headers?.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const payload = token ? decodeJwtPayload(token) : null;
  const raw3 =
    payload?.account_type ??
    payload?.accountType ??
    payload?.plan ??
    payload?.tier ??
    payload?.subscription ??
    (typeof payload?.is_premium === "boolean" ? (payload.is_premium ? "PREMIUM" : "FREE") : undefined);

  if (raw3) return String(raw3).toUpperCase();

  return "FREE";
}

const createTaskSchema = z.object({
  title: z.string().trim().min(2).max(255),
  description: z.string().max(5000).optional().nullable(),
  due_date: z.coerce.date().optional().nullable(),
});

const updateTaskSchema = z
  .object({
    title: z.string().trim().min(2).max(255).optional(),
    description: z.string().max(5000).optional().nullable(),
    is_completed: z.coerce.boolean().optional(),
    due_date: z.coerce.date().optional().nullable(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "At least one field must be provided",
  });

const taskQuerySchema = z.object({
  status: z.enum(["all", "open", "completed", "overdue"]).optional().default("all"),
  q: z.string().optional(),
  dueFrom: z.string().optional(),
  dueTo: z.string().optional(),
  sort: z.enum(["created_desc", "created_asc", "due_asc", "due_desc"]).optional().default("created_desc"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

/** =========================
 * GET /tasks
 * ========================= */
const getTasks = async (req, res) => {
  const userId = req.user.sub;

  let q;
  try {
    q = taskQuerySchema.parse(req.query);
  } catch (e) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Invalid query params",
      details: e.errors,
    });
  }

  const where = {
    user_id: userId,
    deleted_at: null,
  };

  // status filter
  const today = startOfToday();
  if (q.status === "completed") {
    where.is_completed = true;
  } else if (q.status === "overdue") {
    where.is_completed = false;
    where.due_date = { lt: today };
  } else if (q.status === "open") {
    // open = not completed AND (no due date OR due >= today)
    where.is_completed = false;
    where.OR = [{ due_date: null }, { due_date: { gte: today } }];
  }

  // search filter
  const keyword = String(q.q || "").trim();
  if (keyword) {
    where.AND = (where.AND || []).concat([
      {
        OR: [{ title: { contains: keyword } }, { description: { contains: keyword } }],
      },
    ]);
  }

  // due date range filter
  if (q.dueFrom || q.dueTo) {
    const dueWhere = {};
    if (q.dueFrom) {
      const d = new Date(q.dueFrom);
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({
          error: "VALIDATION_ERROR",
          message: "Invalid dueFrom, expected YYYY-MM-DD",
        });
      }
      d.setHours(0, 0, 0, 0);
      dueWhere.gte = d;
    }
    if (q.dueTo) {
      const d = new Date(q.dueTo);
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({
          error: "VALIDATION_ERROR",
          message: "Invalid dueTo, expected YYYY-MM-DD",
        });
      }
      d.setHours(23, 59, 59, 999);
      dueWhere.lte = d;
    }

    // gộp với logic status (nếu có)
    if (where.due_date && typeof where.due_date === "object") {
      where.due_date = { ...where.due_date, ...dueWhere };
    } else if (!where.OR) {
      where.due_date = dueWhere;
    } else {
      where.OR = [{ due_date: null }, { due_date: { ...(where.OR[1]?.due_date || {}), ...dueWhere } }];
    }
  }

  // sorting
  let orderBy = [{ created_at: "desc" }];
  if (q.sort === "created_asc") orderBy = [{ created_at: "asc" }];
  if (q.sort === "due_asc") orderBy = [{ due_date: "asc" }, { created_at: "desc" }];
  if (q.sort === "due_desc") orderBy = [{ due_date: "desc" }, { created_at: "desc" }];

  const skip = (q.page - 1) * q.pageSize;
  const take = q.pageSize;

  const [total, items] = await Promise.all([
    prisma.tasks.count({ where }),
    prisma.tasks.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        title: true,
        description: true,
        is_completed: true,
        due_date: true,
        created_at: true,
      },
    }),
  ]);

  return res.json({
    page: q.page,
    pageSize: q.pageSize,
    total,
    items,
  });
};

/** =========================
 * POST /tasks  (FREE: 3/day)
 * ========================= */
const createTask = async (req, res) => {
  const userId = req.user.sub;

  let data;
  try {
    data = createTaskSchema.parse(req.body);
  } catch (e) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Invalid payload",
      details: e.errors,
    });
  }

  // ===== Plan limit: FREE 3 tasks/day =====
  const accountType = getAccountType(req);
  if (accountType !== "PREMIUM") {
    const from = startOfToday();
    const to = endOfToday();

    const createdToday = await prisma.tasks.count({
      where: {
        user_id: userId,
        deleted_at: null,
        created_at: { gte: from, lte: to },
      },
    });

    if (createdToday >= 3) {
      return res.status(403).json({
        error: "LIMIT_REACHED",
        message: "Người dùng Free chỉ được tạo tối đa 3 nhiệm vụ. Vui lòng nâng cấp PREMIUM để tạo không giới hạn.",
        meta: {
          limit: 3,
          used: createdToday,
          remaining: Math.max(0, 3 - createdToday),
          resetAt: to.toISOString(),
        },
      });
    }
  }

  const task = await prisma.tasks.create({
    data: {
      id: uuid(),
      title: data.title,
      description: data.description ?? null,
      due_date: data.due_date ?? null,
      is_completed: false,
      user_id: userId,
    },
    select: {
      id: true,
      title: true,
      description: true,
      is_completed: true,
      due_date: true,
      created_at: true,
    },
  });

  return res.status(201).json(task);
};

/** =========================
 * PATCH /tasks/:id
 * ========================= */
const updateTask = async (req, res) => {
  const userId = req.user.sub;
  const { id } = req.params;

  let patch;
  try {
    patch = updateTaskSchema.parse(req.body);
  } catch (e) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Invalid payload",
      details: e.errors,
    });
  }

  const existing = await prisma.tasks.findFirst({
    where: { id, user_id: userId, deleted_at: null },
    select: { id: true },
  });

  if (!existing) {
    return res.status(404).json({
      error: "NOT_FOUND",
      message: "Task not found",
    });
  }

  const updated = await prisma.tasks.update({
    where: { id },
    data: {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.due_date !== undefined ? { due_date: patch.due_date } : {}),
      ...(patch.is_completed !== undefined ? { is_completed: patch.is_completed } : {}),
    },
    select: {
      id: true,
      title: true,
      description: true,
      is_completed: true,
      due_date: true,
      created_at: true,
    },
  });

  return res.json(updated);
};

/** =========================
 * DELETE /tasks/:id (soft delete)
 * ========================= */
const deleteTask = async (req, res) => {
  const userId = req.user.sub;
  const { id } = req.params;

  const existing = await prisma.tasks.findFirst({
    where: { id, user_id: userId, deleted_at: null },
    select: { id: true },
  });

  if (!existing) {
    return res.status(404).json({
      error: "NOT_FOUND",
      message: "Task not found",
    });
  }

  await prisma.tasks.update({
    where: { id },
    data: { deleted_at: new Date() },
  });

  return res.json({ message: "Task deleted" });
};

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
};
