// src/api/auth/controllers/custom-auth.js
const crypto = require("crypto");

const TOKEN_BYTES = 32;
const HASH_ALGO = "sha256";
const TTL_MINUTES = parseInt(process.env.RESET_TOKEN_TTL_MINUTES || "60", 10);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const EMAIL_FROM = process.env.EMAIL_FROM || "no-reply@example.com";

function hashToken(token) {
  return crypto.createHash(HASH_ALGO).update(token).digest("hex");
}

module.exports = {
  async forgotPasswordCustom(ctx) {
    try {
      const { email } = ctx.request.body || {};
      if (!email) return ctx.badRequest("E-Mail fehlt");

      const users = await strapi.entityService.findMany(
        "plugin::users-permissions.user",
        {
          filters: { email: { $eq: email } },
          limit: 1,
        }
      );

      const neutralResponse = {
        ok: true,
        message: "Wenn ein Konto existiert, wurde eine E-Mail gesendet.",
      };
      if (!users || users.length === 0) return ctx.send(neutralResponse);

      const user = users[0];
      const rawToken = crypto.randomBytes(TOKEN_BYTES).toString("hex");
      const hashed = hashToken(rawToken);
      const now = new Date().toISOString();

      await strapi.entityService.update(
        "plugin::users-permissions.user",
        user.id,
        {
          data: {
            resetPasswordTokenHash: hashed,
            resetPasswordTokenCreatedAt: now,
          },
        }
      );

      const resetUrl = `${FRONTEND_URL.replace(/\/$/, "")}/reset-password?token=${rawToken}`;

      await strapi
        .plugin("email")
        .service("email")
        .send({
          to: user.email,
          from: EMAIL_FROM,
          subject: "Passwort zurücksetzen",
          html: `<p>Sie haben ein Passwort‑Reset angefordert.</p>
               <p><a href="${resetUrl}">Passwort zurücksetzen</a></p>
               <p>Wenn Sie dies nicht waren, ignorieren Sie diese E-Mail.</p>`,
        });

      return ctx.send(neutralResponse);
    } catch (err) {
      strapi.log.error("forgotPasswordCustom error", err);
      return ctx.send({
        ok: true,
        message: "Wenn ein Konto existiert, wurde eine E-Mail gesendet.",
      });
    }
  },

  async safeResetPassword(ctx) {
    try {
      const { code, password, passwordConfirmation } = ctx.request.body || {};
      if (!code) return ctx.badRequest("Code fehlt");
      if (!password || !passwordConfirmation)
        return ctx.badRequest("Passwort fehlt");
      if (password !== passwordConfirmation)
        return ctx.badRequest("Passwörter stimmen nicht überein");

      const incomingHash = hashToken(code);

      const users = await strapi.entityService.findMany(
        "plugin::users-permissions.user",
        {
          filters: { resetPasswordTokenHash: { $eq: incomingHash } },
          limit: 1,
        }
      );

      if (!users || users.length === 0) {
        return ctx.notFound("Token ungültig oder abgelaufen");
      }

      const user = users[0];

      if (user.resetPasswordTokenCreatedAt) {
        const created = new Date(user.resetPasswordTokenCreatedAt);
        const now = new Date();
        const diffMin = (now - created) / 1000 / 60;
        if (diffMin > TTL_MINUTES) {
          await strapi.entityService.update(
            "plugin::users-permissions.user",
            user.id,
            {
              data: {
                resetPasswordTokenHash: null,
                resetPasswordTokenCreatedAt: null,
              },
            }
          );
          return ctx.badRequest("Token abgelaufen");
        }
      } else {
        await strapi.entityService.update(
          "plugin::users-permissions.user",
          user.id,
          {
            data: { resetPasswordTokenHash: null },
          }
        );
        return ctx.notFound("Token ungültig oder abgelaufen");
      }

      await strapi.entityService.update(
        "plugin::users-permissions.user",
        user.id,
        {
          data: { password },
        }
      );

      await strapi.entityService.update(
        "plugin::users-permissions.user",
        user.id,
        {
          data: {
            resetPasswordTokenHash: null,
            resetPasswordTokenCreatedAt: null,
          },
        }
      );

      try {
        await strapi.plugin("email").service("email").send({
          to: user.email,
          from: EMAIL_FROM,
          subject: "Passwort geändert",
          html: `<p>Ihr Passwort wurde erfolgreich geändert.</p>`,
        });
      } catch (mailErr) {
        strapi.log.error(
          "safeResetPassword: confirmation mail failed",
          mailErr
        );
      }

      return ctx.send({ ok: true, message: "Password reset successful" });
    } catch (err) {
      strapi.log.error("safeResetPassword error", err);
      return ctx.internalServerError("Internal Server Error");
    }
  },
};
