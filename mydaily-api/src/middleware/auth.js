const jwt = require("jsonwebtoken");
const prisma = require("../prisma");

module.exports = async function auth(req, res, next) {
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      error: "SERVER_ERROR",
      message: "JWT_SECRET not configured",
    });
  }

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Missing token",
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const userId =
      payload?.sub ||
      payload?.id ||
      payload?.userId ||
      payload?.user_id;

    if (!userId) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Token payload missing user identifier",
      });
    }

    // 🔴 CHECK DB Ở ĐÂY (QUAN TRỌNG)
    const me = await prisma.user.findFirst({
      where: { id: userId, deleted_at: null },
      select: {
        id: true,
        is_banned: true,
        role: true,
        account_type: true,
      },
    });

    if (!me) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "User not found",
      });
    }

    // attach user info
    req.user = {
      ...payload,
      sub: userId,
      userId,
      role: me.role,
      account_type: me.account_type,
    };

    next();
  } catch (e) {
    return res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Invalid token",
    });
  }
};
