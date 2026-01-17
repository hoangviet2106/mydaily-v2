const prisma = require("../prisma");
const { z } = require("zod");
const crypto = require("crypto");

// NOTE: Current DB schema (prisma/schema.prisma) defines categories as global (no user_id).
// This controller enforces soft-delete and input validation. If you later migrate categories
// to be user-scoped (per SRS), update the `where` clauses to include `user_id`.

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100),
});

exports.listCategories = async (req, res) => {
  const categories = await prisma.categories.findMany({
    where: { deleted_at: null },
    orderBy: { created_at: "desc" },
  });
  return res.json(categories);
};

exports.createCategory = async (req, res) => {
  const parsed = createCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message || "Invalid input",
    });
  }

  const { name } = parsed.data;

  // Avoid duplicates (case-insensitive) among non-deleted categories
  const existing = await prisma.categories.findFirst({
  where: {
    deleted_at: null,
    name: name
  }
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
      name,
    },
  });

  return res.status(201).json(category);
};

exports.updateCategory = async (req, res) => {
  const { id } = req.params;
  const parsed = updateCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message || "Invalid input",
    });
  }

  const category = await prisma.categories.findFirst({
    where: { id, deleted_at: null },
  });
  if (!category) {
    return res.status(404).json({
      error: "NOT_FOUND",
      message: "Category not found",
    });
  }

  const { name } = parsed.data;
  const dup = await prisma.categories.findFirst({
    where: {
      deleted_at: null,
      id: { not: id },
      name: { equals: name, mode: "insensitive" },
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
    data: { name },
  });

  return res.json(updated);
};

exports.deleteCategory = async (req, res) => {
  const { id } = req.params;

  const category = await prisma.categories.findFirst({
    where: { id, deleted_at: null },
  });
  if (!category) {
    return res.status(404).json({
      error: "NOT_FOUND",
      message: "Category not found",
    });
  }

  // Optional safety: prevent deleting a category that is still referenced by any non-deleted expense
  const inUse = await prisma.expenses.findFirst({
    where: { category_id: id, deleted_at: null },
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
};
