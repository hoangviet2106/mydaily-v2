const prisma = require("../prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const crypto = require("crypto");

// ===== Schemas =====
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ===== Helpers =====
function signToken(user) {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set");
  return jwt.sign(
    { sub: user.id, email: user.email, accountType: user.account_type, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

// ===== Controllers =====
exports.register = async (req, res, next) => {

    try {
      const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message || "Invalid input",
    });
  }

  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { email, deleted_at: null },
  });

  if (existing) {
    return res.status(409).json({
      error: "EMAIL_TAKEN",
      message: "Email đã tồn tại",
    });
  }

  const rounds = Number(process.env.BCRYPT_ROUNDS || 10);
  const passwordHash = await bcrypt.hash(password, rounds);

  const user = await prisma.user.create({
    data: {
      email,
      password: passwordHash,
      name,
      account_type: "FREE",
    },
    select: {
      id: true,
      email: true,
      name: true,
      account_type: true,
        role: true,     
      created_at: true,
    },
  });

  const token = signToken(user);
  return res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
   try {
     const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message || "Invalid input",
    });
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findFirst({
    where: { email, deleted_at: null },
  });

  if (!user) {
    return res.status(401).json({
      error: "INVALID_CREDENTIALS",
      message: "Sai email hoặc mật khẩu",
    });
  }
  
  if (user.is_banned) {
  return res.status(403).json({
    error: "BANNED",
    message: "Tài khoản của bạn đã bị cấm",
  });
}

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.status(401).json({
      error: "INVALID_CREDENTIALS",
      message: "Sai email hoặc mật khẩu",
    });
  }

  const token = signToken(user);

  return res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      account_type: user.account_type,
          role: user.role,     
      created_at: user.created_at,
    },
    token,
  });
  } catch (err) {
    next(err);
  }
};
