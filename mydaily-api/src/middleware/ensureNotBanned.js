const prisma = require("../prisma");

module.exports = async function ensureNotBanned(req, res, next) {
  const userId = req.user?.sub;
  if (!userId) return next();

  const me = await prisma.user.findFirst({
    where: { id: userId, deleted_at: null },
    select: { is_banned: true },
  });

  if (me?.is_banned) {
    return res.status(403).json({
      error: "BANNED",
      message: "Account has been banned",
    });
  }

  next();
};
