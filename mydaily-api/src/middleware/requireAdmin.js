const prisma = require("../prisma");

module.exports = async function requireAdmin(req, res, next) {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "Missing user" });
    }

    const me = await prisma.user.findFirst({
      where: { id: userId, deleted_at: null },
      select: { id: true, role: true, is_banned: true },
    });

    if (!me) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "User not found" });
    }

    if (me.is_banned) {
      return res.status(403).json({ error: "BANNED", message: "Account is banned" });
    }

    if (me.role !== "ADMIN") {
      return res.status(403).json({ error: "FORBIDDEN", message: "Admin only" });
    }

    req.admin = me;
    next();
  } catch (err) {
    next(err);
  }
};
