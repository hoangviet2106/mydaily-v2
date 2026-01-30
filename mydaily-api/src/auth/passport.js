const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const prisma = require("../prisma");

module.exports = function initPassport() {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase() || null;
          const googleId = profile.id;
          const name = profile.displayName || "Google User";

          // ✅ avatar lấy TẠI ĐÂY (vì đây mới có profile)
          const avatarUrl =
            profile.photos?.[0]?.value ||
            profile._json?.picture ||
            null;

          if (!email) return done(null, false, { message: "No email from Google" });

          // 1) ưu tiên tìm theo google_id / email
          let user = await prisma.user.findFirst({
            where: { OR: [{ google_id: googleId }, { email }], deleted_at: null },
          });

          // 2) nếu chưa có -> tạo mới
          if (!user) {
            user = await prisma.user.create({
              data: {
                email,
                name,
                google_id: googleId,
                avatar_url: avatarUrl, // ✅ lưu avatar
                password: "",
                account_type: "FREE",
              },
            });
          } else {
            // 3) user đã tồn tại -> update google_id/avatar/name nếu cần
            const dataToUpdate = {};

            if (!user.google_id) dataToUpdate.google_id = googleId;
            if (avatarUrl && user.avatar_url !== avatarUrl) dataToUpdate.avatar_url = avatarUrl;
            if (name && user.name !== name) dataToUpdate.name = name;

            if (Object.keys(dataToUpdate).length > 0) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: dataToUpdate,
              });
            }
          }

          return done(null, user);
        } catch (e) {
          return done(e);
        }
      }
    )
  );

  // Không dùng session vẫn phải define serialize/deserialize (an toàn)
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user);
    } catch (e) {
      done(e);
    }
  });
};
