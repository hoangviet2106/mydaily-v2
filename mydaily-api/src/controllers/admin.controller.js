const prisma = require("../prisma");

/**
 * GET /admin/users?search=&page=&limit=
 * - search: tìm theo email hoặc name
 * - page mặc định 1
 * - limit mặc định 20, max 100
 */
exports.listUsers = async (req, res, next) => {
  try {
    const search = String(req.query.search || "").trim();
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limitRaw = parseInt(req.query.limit || "20", 10);
    const limit = Math.min(Math.max(limitRaw, 1), 100);
    const skip = (page - 1) * limit;

    const where = {
      deleted_at: null,
      ...(search
        ? {
            OR: [
              { email: { contains: search } },
              { name: { contains: search } },
            ],
          }
        : {}),
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          avatar_url: true,
          account_type: true,
          role: true,
          is_banned: true,
          banned_at: true,
          created_at: true,
        },
      }),
    ]);

    return res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      users,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /admin/users/:id/ban
 * body: { is_banned: boolean }
 */
exports.setBan = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    const is_banned = req.body?.is_banned;
if (typeof is_banned !== "boolean") {
  return res.status(400).json({
    error: "VALIDATION_ERROR",
    message: "is_banned must be boolean",
  });
}


    // Không cho tự ban chính mình (tuỳ bạn)
    if (targetId === req.user.sub) {
      return res.status(400).json({ error: "BAD_REQUEST", message: "Cannot ban yourself" });
    }

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: {
        is_banned,
        banned_at: is_banned ? new Date() : null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        is_banned: true,
        banned_at: true,
      },
    });

    return res.json({ user: updated });
  } catch (err) {
    // Prisma: record not found
    if (err?.code === "P2025") {
      return res.status(404).json({ error: "NOT_FOUND", message: "User not found" });
    }
    next(err);
  }
};

/**
 * PATCH /admin/users/:id/role
 * body: { role: "USER" | "ADMIN" }
 */
exports.setRole = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    const role = String(req.body?.role || "").toUpperCase();

    if (!["USER", "ADMIN"].includes(role)) {
      return res.status(400).json({ error: "VALIDATION_ERROR", message: "role must be USER or ADMIN" });
    }

    // Không cho tự hạ quyền chính mình (tránh lock admin)
    if (targetId === req.user.sub && role !== "ADMIN") {
      return res.status(400).json({ error: "BAD_REQUEST", message: "Cannot remove your own admin role" });
    }

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        is_banned: true,
        banned_at: true,
      },
    });

    return res.json({ user: updated });
  } catch (err) {
    if (err?.code === "P2025") {
      return res.status(404).json({ error: "NOT_FOUND", message: "User not found" });
    }
    next(err);
  }
};

exports.setPlan = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    const account_type = String(req.body?.account_type || "").toUpperCase();

    if (!["FREE", "PREMIUM"].includes(account_type)) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "account_type must be FREE or PREMIUM",
      });
    }

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: { account_type },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        account_type: true,
        created_at: true,
      },
    });

    return res.json({ user: updated });
  } catch (err) {
    if (err?.code === "P2025") {
      return res.status(404).json({ error: "NOT_FOUND", message: "User not found" });
    }
    next(err);
  }
};
