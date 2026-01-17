const prisma = require("../prisma");

exports.me = async (req, res) => {
  const userId = req.user.sub;

  const user = await prisma.users.findFirst({
    where: { id: userId, deleted_at: null },
    select: {
      id: true,
      email: true,
      name: true,
      account_type: true,
      created_at: true,
    },
  });

  if (!user) {
    return res.status(404).json({
      error: "NOT_FOUND",
      message: "User not found",
    });
  }

  return res.json({ user });
};
