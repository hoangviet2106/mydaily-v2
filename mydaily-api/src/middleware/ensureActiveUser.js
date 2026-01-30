const prisma = require("../prisma");

module.exports = async function ensureActiveUser(req, res, next) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: "UNAUTHORIZED", message: "Missing user" });

    const me = await prisma.user.findFirst({
      where: { id: userId, deleted_at: null },
      select: { id: true, is_banned: true },
    });

    if (!me) return res.status(401).json({ error: "UNAUTHORIZED", message: "User not found" });
    if (me.is_banned) return res.status(403).json({ error: "BANNED", message: "Account is banned" });

    next();
  } catch (e) {
    next(e);
  }
};
