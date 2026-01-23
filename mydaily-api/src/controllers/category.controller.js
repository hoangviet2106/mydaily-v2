const prisma = require("../prisma");
const { z } = require("zod");
const crypto = require("crypto");

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100),
});

function prismaErrorToHttp(err) {
  const code = err?.code;

  // Unique constraint failed
  if (code === "P2002") {
    return {
      status: 409,
      body: { error: "CATEGORY_EXISTS", message: "Category name already exists" },
    };
  }

  // Record not found
  if (code === "P2025") {
    return {
      status: 404,
      body: { error: "NOT_FOUND", message: "Category not found" },
    };
  }

  return null;
}

function safeMessage(err) {
  return err?.message || "Internal server error";
}

exports.listCategories = async (req, res) => {
  try {
    const userId = req.user.sub;

    const categories = await prisma.categories.findMany({
      where: { user_id: userId, deleted_at: null },
      orderBy: { created_at: "desc" },
    });

    return res.json(categories);
  } catch (err) {
    console.error("LIST_CATEGORIES_ERROR:", err);
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json(mapped.body);

    if (String(err?.message || "").includes("Unknown argument `user_id`")) {
      return res.status(500).json({
        error: "PRISMA_SCHEMA_MISMATCH",
        message:
          "Prisma Client chưa có field user_id cho categories. Hãy sửa schema.prisma (user_id không @id), chạy `npx prisma generate`, và restart server.",
      });
    }

    return res.status(500).json({ error: "SERVER_ERROR", message: safeMessage(err) });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const userId = req.user.sub;

    const parsed = createCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message || "Invalid input",
      });
    }

    // Normalize name (MySQL thường CI nên so sánh == đã đủ)
    const normalizedName = String(parsed.data.name ?? "").trim();

    const existing = await prisma.categories.findFirst({
      where: {
        user_id: userId,
        deleted_at: null,
        name: normalizedName, // <-- bỏ mode
      },
    });

    if (existing) {
      return res.status(409).json({
        error: "CATEGORY_EXISTS",
        message: "Category name already exists",
      });
    }

    const category = await prisma.categories.create({
      data: {
        id: crypto.randomUUID(),
        user_id: userId,
        name: normalizedName,
      },
    });

    return res.status(201).json(category);
  } catch (err) {
    console.error("CREATE_CATEGORY_ERROR:", err);
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json(mapped.body);

    if (String(err?.message || "").includes("Unknown argument `user_id`")) {
      return res.status(500).json({
        error: "PRISMA_SCHEMA_MISMATCH",
        message:
          "Prisma Client chưa có field user_id cho categories. Hãy chạy `npx prisma generate` và restart server.",
      });
    }

    return res.status(500).json({ error: "SERVER_ERROR", message: safeMessage(err) });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { id } = req.params;

    const parsed = updateCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message || "Invalid input",
      });
    }

    const category = await prisma.categories.findFirst({
      where: { id, user_id: userId, deleted_at: null },
    });

    if (!category) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Category not found",
      });
    }

    const normalizedName = String(parsed.data.name ?? "").trim();

    const dup = await prisma.categories.findFirst({
      where: {
        user_id: userId,
        deleted_at: null,
        id: { not: id },
        name: normalizedName, // <-- bỏ mode
      },
    });

    if (dup) {
      return res.status(409).json({
        error: "CATEGORY_EXISTS",
        message: "Category name already exists",
      });
    }

    const updated = await prisma.categories.update({
      where: { id },
      data: { name: normalizedName },
    });

    return res.json(updated);
  } catch (err) {
    console.error("UPDATE_CATEGORY_ERROR:", err);
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json(mapped.body);

    if (String(err?.message || "").includes("Unknown argument `user_id`")) {
      return res.status(500).json({
        error: "PRISMA_SCHEMA_MISMATCH",
        message:
          "Prisma Client chưa có field user_id cho categories. Hãy chạy `npx prisma generate` và restart server.",
      });
    }

    return res.status(500).json({ error: "SERVER_ERROR", message: safeMessage(err) });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { id } = req.params;

    const category = await prisma.categories.findFirst({
      where: { id, user_id: userId, deleted_at: null },
    });

    if (!category) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Category not found",
      });
    }

    const inUse = await prisma.expenses.findFirst({
      where: { user_id: userId, category_id: id, deleted_at: null },
      select: { id: true },
    });

    if (inUse) {
      return res.status(409).json({
        error: "CATEGORY_IN_USE",
        message: "Category is in use by existing expenses",
      });
    }

    await prisma.categories.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return res.json({ message: "Category deleted" });
  } catch (err) {
    console.error("DELETE_CATEGORY_ERROR:", err);
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json(mapped.body);

    if (String(err?.message || "").includes("Unknown argument `user_id`")) {
      return res.status(500).json({
        error: "PRISMA_SCHEMA_MISMATCH",
        message:
          "Prisma Client chưa có field user_id cho categories. Hãy chạy `npx prisma generate` và restart server.",
      });
    }

    return res.status(500).json({ error: "SERVER_ERROR", message: safeMessage(err) });
  }
};
exports.createCategory = async (req, res) => {
  try {
    const userId = req.user.sub;

    const parsed = createCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message || "Invalid input",
      });
    }

    // Normalize name
    const normalizedName = String(parsed.data.name ?? "").trim();
    if (!normalizedName) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Category name is required",
      });
    }

    // 1) Lấy loại account (FREE / PREMIUM)
    const user = await prisma.users.findFirst({
      where: { id: userId, deleted_at: null },
      select: { account_type: true },
    });

    if (!user) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "User not found or not authorized",
      });
    }

    // 2) FREE: giới hạn 3 categories (không tính deleted)
    if (user.account_type === "FREE") {
      const count = await prisma.categories.count({
        where: { user_id: userId, deleted_at: null },
      });

      if (count >= 3) {
        return res.status(403).json({
          error: "CATEGORY_LIMIT_REACHED",
          message:
            "Người dùng Free chỉ được tạo tối đa 3 loại. Vui lòng nâng cấp PREMIUM để tạo không giới hạn.",
          limit: 3,
        });
      }
    }

    // 3) Duplicate check (MySQL CI thường tự case-insensitive)
    const existing = await prisma.categories.findFirst({
      where: {
        user_id: userId,
        deleted_at: null,
        name: normalizedName,
      },
      select: { id: true },
    });

    if (existing) {
      return res.status(409).json({
        error: "CATEGORY_EXISTS",
        message: "Category name already exists",
      });
    }

    // 4) Create
    const category = await prisma.categories.create({
      data: {
        id: crypto.randomUUID(),
        user_id: userId,
        name: normalizedName,
      },
    });

    return res.status(201).json(category);
  } catch (err) {
    console.error("CREATE_CATEGORY_ERROR:", err);
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json(mapped.body);

    if (String(err?.message || "").includes("Unknown argument `user_id`")) {
      return res.status(500).json({
        error: "PRISMA_SCHEMA_MISMATCH",
        message:
          "Prisma Client chưa có field user_id cho categories. Hãy chạy `npx prisma generate` và restart server.",
      });
    }

    return res.status(500).json({ error: "SERVER_ERROR", message: safeMessage(err) });
  }
};
