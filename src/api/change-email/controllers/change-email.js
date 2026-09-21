"use strict";

// Store for pending email verifications (email -> { token, newEmail, expiresAt, userId })
// In production, this should be stored in a database
const pendingEmailChanges = new Map();

// Generate a random token
function generateToken() {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
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

    const { newEmail } = ctx.request.body;

    // Validate email
    if (!newEmail || !newEmail.includes("@")) {
      return ctx.badRequest("Bitte gib eine gültige E-Mail an.");
    }

    // Check if email is same as current
    const currentUser = await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({ where: { id: user.id } });

    if (newEmail === currentUser.email) {
      return ctx.badRequest("Dies ist bereits deine aktuelle E-Mail-Adresse.");
    }

    // Check if email already exists
    const exists = await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({ where: { email: newEmail } });

    if (exists) {
      return ctx.conflict("Diese E-Mail-Adresse wird bereits verwendet.");
    }

    // Generate verification token
    const verificationToken = generateToken();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Store pending email change
    pendingEmailChanges.set(verificationToken, {
      userId: user.id,
      newEmail,
      expiresAt,
    });

    // Log for debugging
    console.log(`Email change requested: ${currentUser.email} -> ${newEmail}`);
    console.log(`Verification token: ${verificationToken}`);

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
          <p><strong>Neue E-Mail-Adresse:</strong> ${newEmail}</p>
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
      console.error("Email sending error:", err);
      // Remove the pending change if email sending failed
      pendingEmailChanges.delete(verificationToken);
      return ctx.internalServerError(
        "Fehler beim Senden der Bestätigungsemail. Bitte versuche es später erneut.",
      );
    }
  },

  // Confirm email change via verification token
  async confirmEmailChange(ctx) {
    const { token } = ctx.request.body;

    if (!token) {
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

    try {
      // Update user email
      const updated = await strapi.entityService.update(
        "plugin::users-permissions.user",
        pendingChange.userId,
        { data: { email: pendingChange.newEmail } },
      );

      // Remove the pending change
      pendingEmailChanges.delete(token);

      console.log(`Email changed successfully: ${pendingChange.newEmail}`);

      ctx.send({
        message: "E-Mail-Adresse erfolgreich geändert.",
        email: updated.email,
      });
    } catch (err) {
      console.error("Error updating email:", err);
      return ctx.internalServerError(
        "Fehler beim Aktualisieren der E-Mail-Adresse.",
      );
    }
  },

  // Legacy update method (kept for backwards compatibility but should not be used)
  async update(ctx) {
    const authHeader = ctx.request.header.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return ctx.unauthorized("Kein Token bereitgestellt");
    }
    let me;
    try {
      me = await strapi.service("plugin::users-permissions.jwt").verify(token);
    } catch (err) {
      console.log("JWT verify error:", err);
      return ctx.unauthorized("Ungültiger Token");
    }

    const { email } = ctx.request.body;
    if (!email || !email.includes("@")) {
      return ctx.badRequest("Bitte gib eine gültige E-Mail an.");
    }

    const exists = await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({ where: { email } });

    if (exists && exists.id !== me.id) {
      return ctx.conflict("Diese E-Mail ist bereits vergeben.");
    }

    const updated = await strapi.entityService.update(
      "plugin::users-permissions.user",
      me.id,
      { data: { email } },
    );

    return ctx.send({ email: updated.email });
  },
};
