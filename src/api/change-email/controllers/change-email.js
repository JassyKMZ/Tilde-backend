"use strict";

const crypto = require("crypto");

// Pending email changes (token -> { userId, newEmail, expiresAt }). Kept in memory, so
// links sent before a Strapi restart stop working and have to be requested again.
const pendingEmailChanges = new Map();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The link in the email is the only proof of ownership, so it has to be unguessable.
function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

// Drops expired links, and with a userId all of that user's links, so only the
// newest request stays valid.
function prunePendingChanges(userId) {
  const now = Date.now();
  for (const [token, change] of pendingEmailChanges) {
    if (
      change.expiresAt <= now ||
      (userId != null && change.userId === userId)
    ) {
      pendingEmailChanges.delete(token);
    }
  }
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
}

module.exports = {
  async ping(ctx) {
    ctx.send({ status: "pong 🎾" });
  },

  // Request email change and send verification email
  async requestEmailChange(ctx) {
    const authHeader = ctx.request.header.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return ctx.unauthorized("Kein Token bereitgestellt");
    }

    let user;
    try {
      user = await strapi
        .service("plugin::users-permissions.jwt")
        .verify(token);
    } catch (err) {
      console.log("JWT verify error:", err);
      return ctx.unauthorized("Ungültiger Token");
    }

    const newEmail = String(ctx.request.body?.newEmail || "")
      .trim()
      .toLowerCase();

    // Validate email
    if (!EMAIL_PATTERN.test(newEmail)) {
      return ctx.badRequest("Bitte gib eine gültige E-Mail an.");
    }

    // Check if email is same as current
    const currentUser = await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({ where: { id: user.id } });

    if (!currentUser || currentUser.blocked) {
      return ctx.unauthorized("Ungültiger Token");
    }

    if (newEmail === currentUser.email?.toLowerCase()) {
      return ctx.badRequest("Dies ist bereits deine aktuelle E-Mail-Adresse.");
    }

    // Check if email already exists
    const exists = await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({ where: { email: { $eqi: newEmail } } });

    if (exists) {
      return ctx.conflict("Diese E-Mail-Adresse wird bereits verwendet.");
    }

    // Generate verification token
    const verificationToken = generateToken();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Store pending email change
    prunePendingChanges(user.id);
    pendingEmailChanges.set(verificationToken, {
      userId: user.id,
      newEmail,
      expiresAt,
    });

    strapi.log.info(`Email change requested for user ${user.id}`);

    try {
      // Send verification email to OLD email address for security
      const verificationLink = `${process.env.REDIRECT_URL || "https://tilde-app.de"}/verify-email?token=${verificationToken}`;

      await strapi.plugins["email"].services.email.send({
        to: currentUser.email,
        from: process.env.SMTP_FROM,
        // from: process.env.SMTP_FROM || "noreply@tilde-app.de",
        subject: "Bestätige deine E-Mail-Änderung",
        html: `
          <p>Hallo,</p>
          <p>es wurde eine Änderung deiner E-Mail-Adresse angefordert.</p>
          <p><strong>Neue E-Mail-Adresse:</strong> ${escapeHtml(newEmail)}</p>
          <p>Bitte klicke auf den folgenden Link, um die Änderung zu bestätigen:</p>
          <p><a href="${verificationLink}" style="background-color: #6750f2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 20px; display: inline-block;">E-Mail-Änderung bestätigen</a></p>
          <p style="margin-top: 20px; color: #6750f2;">Oder kopiere diesen Link in deinen Browser:</p>
          <p style="word-break: break-all; color: #6750f2; font-size: 12px;"><code>${verificationLink}</code></p>
          <p>Dieser Link ist 24 Stunden lang gültig.</p>
          <p>Falls du diese Änderung nicht angefordert hast, kannst du diese E-Mail einfach ignorieren. Deine aktuelle E-Mail-Adresse bleibt unverändert.</p>
          <p>Beste Grüße,<br>das Tilde-Team</p>
        `,
      });

      ctx.send({
        message:
          "Bestätigungslink wurde an deine aktuelle E-Mail-Adresse gesendet.",
        newEmail,
      });
    } catch (err) {
      strapi.log.error("Email change: sending the confirmation failed", err);
      // Remove the pending change if email sending failed
      pendingEmailChanges.delete(verificationToken);
      return ctx.internalServerError(
        "Fehler beim Senden der Bestätigungsemail. Bitte versuche es später erneut.",
      );
    }
  },

  // Confirm email change via verification token
  async confirmEmailChange(ctx) {
    const token = ctx.request.body?.token;

    if (!token || typeof token !== "string") {
      return ctx.badRequest("Verifikationstoken erforderlich.");
    }

    const pendingChange = pendingEmailChanges.get(token);

    if (!pendingChange) {
      return ctx.badRequest("Ungültiger oder abgelaufener Verifikationstoken.");
    }

    // Check if token has expired
    if (Date.now() > pendingChange.expiresAt) {
      pendingEmailChanges.delete(token);
      return ctx.badRequest(
        "Der Verifikationstoken ist abgelaufen. Bitte fordere einen neuen an.",
      );
    }

    // The address may have been taken since the link was sent.
    const taken = await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({ where: { email: { $eqi: pendingChange.newEmail } } });
    if (taken && taken.id !== pendingChange.userId) {
      pendingEmailChanges.delete(token);
      return ctx.conflict("Diese E-Mail-Adresse wird bereits verwendet.");
    }

    try {
      // Update user email
      const updated = await strapi.entityService.update(
        "plugin::users-permissions.user",
        pendingChange.userId,
        { data: { email: pendingChange.newEmail } },
      );

      // Remove the pending change
      pendingEmailChanges.delete(token);

      strapi.log.info(`Email changed for user ${pendingChange.userId}`);

      ctx.send({
        message: "E-Mail-Adresse erfolgreich geändert.",
        email: updated.email,
      });
    } catch (err) {
      strapi.log.error("Email change: updating the user failed", err);
      return ctx.internalServerError(
        "Fehler beim Aktualisieren der E-Mail-Adresse.",
      );
    }
  },
};
