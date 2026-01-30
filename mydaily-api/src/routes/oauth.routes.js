const router = require("express").Router();
const passport = require("passport");
const jwt = require("jsonwebtoken");

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, accountType: user.account_type },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

// 1) Redirect qua Google
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

// 2) Callback từ Google -> phát token -> redirect về FE
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/auth/google/fail" }),
  (req, res) => {
    const token = signToken(req.user);

    const fe = process.env.FRONTEND_URL || "http://localhost:5173";
    // Redirect về FE kèm token (MVP)
    return res.redirect(`${fe}/oauth/callback?token=${encodeURIComponent(token)}`);
  }
);

router.get("/google/fail", (req, res) => {
  res.status(401).json({ message: "Google login failed" });
});

module.exports = router;
