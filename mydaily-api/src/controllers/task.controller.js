// src/controllers/task.controller.js
const prisma = require("../prisma");
const { v4: uuid } = require("uuid");
const { z } = require("zod");

/** =========================
 * Helpers (legacy - keep if other code uses)
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

/** =========================
 * Streak helpers (Asia/Bangkok UTC+7)
 * ========================= */
const TZ_OFFSET_MIN = 7 * 60;

function bangkokDateOnly(date = new Date()) {
  // shift +7h rồi lấy Y-M-D theo UTC => ổn định dù server timezone gì
  const shifted = new Date(date.getTime() + TZ_OFFSET_MIN * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();
  return new Date(Date.UTC(y, m, d)); // 00:00 UTC
}

function toBangkokYMD(date = new Date()) {
  const shifted = new Date(date.getTime() + TZ_OFFSET_MIN * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function sameDateOnly(a, b) {
  if (!a || !b) return false;
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function yesterdayDateOnly(dateOnlyUTC) {
  const d = new Date(dateOnlyUTC);
  d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

/**
 * NEW: Bangkok day range in UTC, for DB queries.
 * - startUTC: Bangkok 00:00 (local) converted to UTC
 * - endUTC: exclusive end (startUTC + 24h)
 */
function bangkokDayRange(date = new Date()) {
  const dateOnlyUTC = bangkokDateOnly(date);
  const startUTC = new Date(dateOnlyUTC.getTime() - TZ_OFFSET_MIN * 60 * 1000);
  const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000);
  return { startUTC, endUTC, dateOnlyUTC };
}

/**
 * NEW: Parse "YYYY-MM-DD" into Bangkok day range (UTC timestamps).
 * Returns {startUTC, endUTC} or null
 */
function bangkokRangeFromYMD(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || "").trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;

  const startUTC = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0, 0) - TZ_OFFSET_MIN * 60 * 1000);
  const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000);
  return { startUTC, endUTC };
}

async function getStreakSnapshot(tx, userId, todayDateOnly) {
  const s = await tx.userStreak.findUnique({ where: { user_id: userId } });
  const todayDone = s?.last_streak_date ? sameDateOnly(s.last_streak_date, todayDateOnly) : false;

  return {
    current_streak: s?.current_streak ?? 0,
    longest_streak: s?.longest_streak ?? 0,
    last_streak_date: s?.last_streak_date ?? null,
    today_done: todayDone,
  };
}

async function updateStreakOnFirstCompletionToday(tx, userId, now) {
  const todayDateOnly = bangkokDateOnly(now);
  const yestDateOnly = yesterdayDateOnly(todayDateOnly);

  let streak = await tx.userStreak.findUnique({ where: { user_id: userId } });

  if (!streak) {
    streak = await tx.userStreak.create({
      data: {
        user_id: userId,
        current_streak: 1,
        longest_streak: 1,
        last_streak_date: todayDateOnly,
      },
    });
  } else {
    if (streak.last_streak_date && sameDateOnly(streak.last_streak_date, todayDateOnly)) {
      return {
        current_streak: streak.current_streak,
        longest_streak: streak.longest_streak,
        last_streak_date: streak.last_streak_date,
        today_done: true,
      };
    }

    let nextCurrent = 1;
    if (streak.last_streak_date && sameDateOnly(streak.last_streak_date, yestDateOnly)) {
      nextCurrent = (streak.current_streak || 0) + 1;
    }

    const nextLongest = Math.max(streak.longest_streak || 0, nextCurrent);

    streak = await tx.userStreak.update({
      where: { user_id: userId },
      data: {
        current_streak: nextCurrent,
        longest_streak: nextLongest,
        last_streak_date: todayDateOnly,
      },
    });
  }

  return {
    current_streak: streak.current_streak,
    longest_streak: streak.longest_streak,
    last_streak_date: streak.last_streak_date,
    today_done: true,
  };
}

/** =========================
 * Schemas
 * ========================= */
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

  // status filter (Bangkok date-only)
  const { startUTC: todayStartUTC } = bangkokDayRange(new Date());

  if (q.status === "completed") {
    where.is_completed = true;
  } else if (q.status === "overdue") {
    where.is_completed = false;
    where.due_date = { lt: todayStartUTC };
  } else if (q.status === "open") {
    // open = not completed AND (no due date OR due >= todayStartUTC)
    where.is_completed = false;
    where.OR = [{ due_date: null }, { due_date: { gte: todayStartUTC } }];
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

  // due date range filter (Bangkok day range, UTC timestamps)
  if (q.dueFrom || q.dueTo) {
    const dueWhere = {};

    if (q.dueFrom) {
      const r = bangkokRangeFromYMD(q.dueFrom);
      if (!r) {
        return res.status(400).json({
          error: "VALIDATION_ERROR",
          message: "Invalid dueFrom, expected YYYY-MM-DD",
        });
      }
      dueWhere.gte = r.startUTC;
    }

    if (q.dueTo) {
      const r = bangkokRangeFromYMD(q.dueTo);
      if (!r) {
        return res.status(400).json({
          error: "VALIDATION_ERROR",
          message: "Invalid dueTo, expected YYYY-MM-DD",
        });
      }
      // exclusive end for whole Bangkok day
      dueWhere.lt = r.endUTC;
    }

    if (where.due_date && typeof where.due_date === "object" && !Array.isArray(where.due_date)) {
      where.due_date = { ...where.due_date, ...dueWhere };
    } else if (!where.OR) {
      where.due_date = dueWhere;
    } else {
      // open case: OR includes due_date null OR due_date >= todayStartUTC
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
    prisma.task.count({ where }),
    prisma.task.findMany({
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
        completed_at: true,
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
 * POST /tasks  (FREE: 5/day) - Bangkok day
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

  // ===== Plan limit: FREE 5 tasks/day (Bangkok day) =====
  const accountType = getAccountType(req);
  if (accountType !== "PREMIUM") {
    const { startUTC: from, endUTC: to } = bangkokDayRange(new Date());

    const createdToday = await prisma.task.count({
      where: {
        user_id: userId,
        deleted_at: null,
        created_at: { gte: from, lt: to },
      },
    });

    if (createdToday >= 5) {
      return res.status(403).json({
        error: "LIMIT_REACHED",
        message: "Người dùng Free chỉ được tạo tối đa 5 nhiệm vụ/ngày. Vui lòng nâng cấp PREMIUM để tạo không giới hạn.",
        meta: {
          limit: 5,
          used: createdToday,
          remaining: Math.max(0, 5 - createdToday),
          resetAt: new Date(to.getTime() - 1).toISOString(),
          today: toBangkokYMD(new Date()),
        },
      });
    }
  }

  const task = await prisma.task.create({
    data: {
      id: uuid(),
      title: data.title,
      description: data.description ?? null,
      due_date: data.due_date ?? null,
      is_completed: false,
      completed_at: null,
      user_id: userId,
    },
    select: {
      id: true,
      title: true,
      description: true,
      is_completed: true,
      due_date: true,
      created_at: true,
      completed_at: true,
    },
  });

  return res.status(201).json(task);
};

/** =========================
 * PATCH /tasks/:id
 * - Nếu set is_completed:true => complete + update streak
 * - Không cho set is_completed:false
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

  const existing = await prisma.task.findFirst({
    where: { id, user_id: userId, deleted_at: null },
    select: { id: true, is_completed: true },
  });

  if (!existing) {
    return res.status(404).json({
      error: "NOT_FOUND",
      message: "Task not found",
    });
  }

  // ❌ Không cho uncomplete để tránh phá streak logic
  if (patch.is_completed === false) {
    return res.status(400).json({
      error: "NOT_ALLOWED",
      message: "Không hỗ trợ bỏ hoàn thành (uncomplete) để đảm bảo streak chính xác.",
    });
  }

  // ✅ Nếu request muốn complete task
  if (patch.is_completed === true) {
    const now = new Date();
    const todayDateOnly = bangkokDateOnly(now);

    const result = await prisma.$transaction(async (tx) => {
      // Nếu đã completed trước đó => không tăng streak nữa
      if (existing.is_completed) {
        const task = await tx.task.findUnique({
          where: { id },
          select: {
            id: true,
            title: true,
            description: true,
            is_completed: true,
            due_date: true,
            created_at: true,
            completed_at: true,
          },
        });

        const streak = await getStreakSnapshot(tx, userId, todayDateOnly);
        return { task, streak: { ...streak, today: toBangkokYMD(now) } };
      }

      // 1) Update task to completed
      const task = await tx.task.update({
        where: { id },
        data: {
          is_completed: true,
          completed_at: now,
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          ...(patch.description !== undefined ? { description: patch.description } : {}),
          ...(patch.due_date !== undefined ? { due_date: patch.due_date } : {}),
        },
        select: {
          id: true,
          title: true,
          description: true,
          is_completed: true,
          due_date: true,
          created_at: true,
          completed_at: true,
        },
      });

      // 2) Update streak (max 1/day)
      const streak = await updateStreakOnFirstCompletionToday(tx, userId, now);
      return { task, streak: { ...streak, today: toBangkokYMD(now) } };
    });

    return res.json(result);
  }

  // ✅ Update bình thường (không liên quan complete)
  const updated = await prisma.task.update({
    where: { id },
    data: {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.due_date !== undefined ? { due_date: patch.due_date } : {}),
    },
    select: {
      id: true,
      title: true,
      description: true,
      is_completed: true,
      due_date: true,
      created_at: true,
      completed_at: true,
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

  const existing = await prisma.task.findFirst({
    where: { id, user_id: userId, deleted_at: null },
    select: { id: true },
  });

  if (!existing) {
    return res.status(404).json({
      error: "NOT_FOUND",
      message: "Task not found",
    });
  }

  await prisma.task.update({
    where: { id },
    data: { deleted_at: new Date() },
  });

  return res.json({ message: "Task deleted" });
};

/** =========================
 * PATCH /tasks/:id/complete
 * ========================= */
const completeTask = async (req, res) => {
  const userId = req.user.sub;
  const { id } = req.params;

  const now = new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.task.findFirst({
        where: { id, user_id: userId, deleted_at: null },
        select: {
          id: true,
          title: true,
          description: true,
          is_completed: true,
          due_date: true,
          created_at: true,
          completed_at: true,
        },
      });

      if (!existing) {
        return { error: { status: 404, body: { error: "NOT_FOUND", message: "Task not found" } } };
      }

      // Nếu đã complete rồi => không tăng streak
      if (existing.is_completed) {
        const todayDateOnly = bangkokDateOnly(now);
        const streak = await getStreakSnapshot(tx, userId, todayDateOnly);
        return { task: existing, streak: { ...streak, today: toBangkokYMD(now) } };
      }

      // 1) update task -> completed
      const task = await tx.task.update({
        where: { id },
        data: {
          is_completed: true,
          completed_at: now,
        },
        select: {
          id: true,
          title: true,
          description: true,
          is_completed: true,
          due_date: true,
          created_at: true,
          completed_at: true,
        },
      });

      // 2) update streak (max 1/day)
      const streak = await updateStreakOnFirstCompletionToday(tx, userId, now);

      return { task, streak: { ...streak, today: toBangkokYMD(now) } };
    });

    if (result?.error) return res.status(result.error.status).json(result.error.body);
    return res.json(result);
  } catch (e) {
    return res.status(500).json({ error: "SERVER_ERROR", message: "Failed to complete task" });
  }
};

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
};
