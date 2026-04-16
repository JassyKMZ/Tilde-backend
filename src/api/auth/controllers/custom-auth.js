// src/api/auth/controllers/custom-auth.js
const crypto = require("crypto");

const TOKEN_BYTES = 32;
const HASH_ALGO = "sha256";
const TTL_MINUTES = parseInt(process.env.RESET_TOKEN_TTL_MINUTES || "60", 10);
const CONFIRM_TTL_MINUTES = 24 * 60; // 24 Stunden
const FRONTEND_URL = process.env.FRONTEND_URL || "https://api.tilde-app.de";
const REDIRECT_URL = process.env.REDIRECT_URL || FRONTEND_URL;
const EMAIL_FROM = process.env.EMAIL_FROM || "no-reply@tilde-app.de";

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
        },
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
        },
      );

      const resetUrl = `${REDIRECT_URL.replace(/\/$/, "")}/reset-password?token=${rawToken}`;

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
        },
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
            },
          );
          return ctx.badRequest("Token abgelaufen");
        }
      } else {
        await strapi.entityService.update(
          "plugin::users-permissions.user",
          user.id,
          {
            data: { resetPasswordTokenHash: null },
          },
        );
        return ctx.notFound("Token ungültig oder abgelaufen");
      }

      await strapi.entityService.update(
        "plugin::users-permissions.user",
        user.id,
        {
          data: { password },
        },
      );

      await strapi.entityService.update(
        "plugin::users-permissions.user",
        user.id,
        {
          data: {
            resetPasswordTokenHash: null,
            resetPasswordTokenCreatedAt: null,
          },
        },
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
          mailErr,
        );
      }

      return ctx.send({ ok: true, message: "Password reset successful" });
    } catch (err) {
      strapi.log.error("safeResetPassword error", err);
      return ctx.internalServerError("Internal Server Error");
    }
  },

  async sendConfirmationEmail(ctx) {
    try {
      const { email } = ctx.request.body || {};
      if (!email) return ctx.badRequest("Email is required");

      const user = await strapi.entityService.findMany(
        "plugin::users-permissions.user",
        {
          filters: { email: { $eq: email } },
          limit: 1,
        },
      );

      if (!user || user.length === 0) {
        return ctx.send({
          ok: true,
          message: "If an account exists, a confirmation email will be sent.",
        });
      }

      const userRecord = user[0];
      if (userRecord.confirmed) {
        return ctx.send({
          ok: true,
          message: "Email is already confirmed.",
        });
      }

      // Generate confirmation token
      const confirmationToken = crypto.randomBytes(TOKEN_BYTES).toString("hex");
      const nowIso = new Date().toISOString();

      await strapi.entityService.update(
        "plugin::users-permissions.user",
        userRecord.id,
        {
          data: {
            confirmationToken: confirmationToken,
            confirmationTokenCreatedAt: nowIso,
          },
        },
      );

      const confirmUrl = `${FRONTEND_URL.replace(/\/$/, "")}/verify-registration?token=${confirmationToken}`;

      await strapi
        .plugin("email")
        .service("email")
        .send({
          to: userRecord.email,
          from: process.env.SMTP_FROM || process.env.SMTP_USERNAME,
          replyTo: process.env.SMTP_REPLY_TO,
          subject: "Bestätigen Sie Ihre E-Mail-Adresse",
          html: `<p>Willkommen bei Tilde!</p>
               <p>Bitte bestätigen Sie Ihre E-Mail-Adresse:</p>
               <p><a href="${confirmUrl}">E-Mail-Adresse bestätigen</a></p>
               <p>Wenn Sie diese E-Mail nicht angefordert haben, ignorieren Sie diese Nachricht.</p>`,
        });

      return ctx.send({
        ok: true,
        message: "Confirmation email sent successfully.",
      });
    } catch (err) {
      strapi.log.error("sendConfirmationEmail error", err);
      return ctx.send({
        ok: true,
        message: "If an account exists, a confirmation email will be sent.",
      });
    }
  },

  async confirmRegistration(ctx) {
    try {
      const { token } = ctx.request.query;
      if (!token) {
        return ctx.badRequest("Bestätigungstoken erforderlich");
      }

      // Find user with this confirmation token
      const users = await strapi.entityService.findMany(
        "plugin::users-permissions.user",
        {
          filters: { confirmationToken: { $eq: token } },
          limit: 1,
        },
      );

      if (!users || users.length === 0) {
        return ctx.send({
          ok: false,
          status: "invalid",
          message: "Ungültiger oder abgelaufener Bestätigungstoken",
        });
      }

      const user = users[0];
      const createdAtRaw = user && user.confirmationTokenCreatedAt;

      // TTL prüfen
      if (user.confirmationTokenCreatedAt) {
        const created = new Date(user.confirmationTokenCreatedAt);
        const now = new Date();
        const diffMin = (now - created) / 1000 / 60;
        if (diffMin > CONFIRM_TTL_MINUTES) {
          // Token abgelaufen: löschen und Hinweis zurückgeben
          await strapi.entityService.update(
            "plugin::users-permissions.user",
            user.id,
            {
              data: {
                confirmationToken: null,
                confirmationTokenCreatedAt: null,
              },
            },
          );
          return ctx.send({
            ok: false,
            status: "expired",
            message:
              "Der Bestätigungslink ist abgelaufen. Bitte fordere eine neue Bestätigungs‑E‑Mail an.",
            email: user.email,
          });
        }
      }

      // Check if already confirmed
      if (user.confirmed) {
        return ctx.send({
          ok: true,
          status: "already_confirmed",
          message: "Diese E-Mail-Adresse wurde bereits bestätigt.",
          email: user.email,
        });
      }

      // Mark user as confirmed and clear the token fields
      await strapi.entityService.update(
        "plugin::users-permissions.user",
        user.id,
        {
          data: {
            confirmed: true,
            confirmationToken: null,
            confirmationTokenCreatedAt: null,
          },
        },
      );

      // optional: welcome email (wie bisher)
      try {
        await strapi
          .plugin("email")
          .service("email")
          .send({
            to: user.email,
            from: process.env.SMTP_FROM || process.env.SMTP_USERNAME,
            replyTo: process.env.SMTP_REPLY_TO,
            subject: "Willkommen bei Tilde!",
            html: `<p>Hallo ${user.username || user.email},</p>
                 <p>Dein Konto wurde aktiviert. Du kannst dich jetzt anmelden!</p>
                 <p><a href="${REDIRECT_URL}">Zur Tilde App</a></p>`,
          });
      } catch (mailErr) {
        strapi.log.error("confirmRegistration: welcome mail failed", mailErr);
      }

      return ctx.send({
        ok: true,
        status: "confirmed",
        message: "E-Mail erfolgreich bestätigt! Dein Konto ist aktiviert.",
        email: user.email,
      });
    } catch (err) {
      strapi.log.error("confirmRegistration error", err);
      return ctx.internalServerError("Ein Fehler ist aufgetreten");
    }
  },
};
