const prisma = require("../prisma");
const { z } = require("zod");

/** GET /users/me */
exports.me = async (req, res, next) => {
  try {
    const userId = req.user.sub;

    const user = await prisma.user.findFirst({
      where: { id: userId, deleted_at: null },
      select: {
        id: true,
        email: true,
        name: true,
        account_type: true,
          role: true,          // ✅
  is_banned: true,  
        avatar_url: true, 
        created_at: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "NOT_FOUND", message: "User not found" });
    }

    return res.json({ user });
  } catch (err) {
    next(err);
  }
};

const updateMeSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
});

/** PATCH /users/me  (đổi tên) */
exports.updateMe = async (req, res, next) => {
  try {
    const userId = req.user.sub;

    const parsed = updateMeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message || "Invalid input",
      });
    }

    const data = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        account_type: true,
          role: true,          // ✅
  is_banned: true,  
        avatar_url: true,
        created_at: true,
      },
    });

    return res.json({ user });
  } catch (err) {
    next(err);
  }
};
