"use strict";

const crypto = require("crypto");

const REDIRECT_URL = (
  process.env.REDIRECT_URL ||
  process.env.FRONTEND_URL ||
  "http://localhost:4173"
).replace(/\/$/, "");

function generateConfirmationToken() {
  return crypto.randomBytes(32).toString("hex");
}

module.exports = {
  async register(ctx) {
    const pluginStore = await strapi
      .store({ type: "plugin", name: "users-permissions" })
      .get({ key: "advanced" });

    const settings = pluginStore.allow_register === false ? false : true;

    if (!settings) {
      return ctx.badRequest("Registration is disabled");
    }

    const { email, username, password } = ctx.request.body;

    if (!email || !username || !password) {
      return ctx.badRequest("Missing required fields");
    }

    // Check if user already exists
    const existingUser = await strapi.entityService.findMany(
      "plugin::users-permissions.user",
      {
        filters: {
          $or: [{ email }, { username }],
        },
      },
    );

    if (existingUser.length > 0) {
      return ctx.badRequest("User already exists");
    }

    // Generate confirmation token
    const confirmationToken = generateConfirmationToken();
    const confirmUrl = `${REDIRECT_URL}/verify-registration?token=${confirmationToken}`;

    // Get the default role
    let defaultRole;
    try {
      defaultRole = await strapi.db
        .query("plugin::users-permissions.role")
        .findOne({
          where: { type: "authenticated" },
        });
    } catch (err) {
      strapi.log.error("Error fetching default role:", err);
      return ctx.internalServerError("Could not fetch default role");
    }

    // Hash password using Strapi's password service
    const passwordService = strapi
      .plugin("users-permissions")
      .service("password");
    const hashedPassword = await passwordService.hash(password);

    // Create user directly with entityService
    // NOTE: "Enable email confirmation" is TRUE, "sendConfirmationEmail" is FALSE
    // This means: confirmed stays false, but Strapi won't auto-send email
    // We send our own custom email below
    let newUser;
    try {
      newUser = await strapi.entityService.create(
        "plugin::users-permissions.user",
        {
          data: {
            username,
            email,
            password: hashedPassword,
            confirmed: false, // User must confirm via email link
            confirmationToken, // Custom confirmation token (will be cleared after verification)
            provider: "local",
            role: defaultRole ? { id: defaultRole.id } : undefined,
          },
        },
      );
      strapi.log.info(`User created via custom register: ${newUser.id}`);
    } catch (err) {
      strapi.log.error("Error creating user:", err);
      return ctx.internalServerError("Error creating user account");
    }

    // Send custom confirmation email with beautiful styling
    try {
      const customHtml = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background-color: #f5f5f5; padding: 20px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #5ab1d1 0%, #4a9bb8 100%); padding: 40px 20px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Willkommen bei Tilde!</h1>
    </div>

    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="margin: 0 0 24px 0; font-size: 16px; color: #333333; line-height: 1.6;">
        Hallo,
      </p>

      <p style="margin: 0 0 24px 0; font-size: 16px; color: #333333; line-height: 1.6;">
        vielen Dank für deine Registrierung bei Tilde! Um dein Konto zu aktivieren, bestätige bitte deine E-Mail-Adresse durch Klick auf den Button unten.
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${confirmUrl}" style="display: inline-block; background-color: #5ab1d1; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 5px; font-weight: 600; font-size: 16px; transition: background-color 0.2s ease; border: none;">
          E-Mail-Adresse bestätigen
        </a>
      </div>

      <p style="margin: 24px 0; font-size: 14px; color: #666666; line-height: 1.6;">
        Oder kopiere diesen Link in deinen Browser:
      </p>

      <p style="margin: 12px 0 24px 0; font-size: 12px; color: #666666; word-break: break-all; background-color: #f9f9f9; padding: 12px; border-radius: 4px; border-left: 3px solid #5ab1d1;">
        <code>${confirmUrl}</code>
      </p>

      <p style="margin: 0; font-size: 14px; color: #666666; line-height: 1.6;">
        Solltest du diese E-Mail nicht angefordert haben, kannst du sie einfach ignorieren.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9f9f9; padding: 24px 30px; border-top: 1px solid #eaeaea; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #999999; line-height: 1.6;">
        © 2026 Tilde. Alle Rechte vorbehalten.
      </p>
    </div>
  </div>
</div>
      `;

      await strapi
        .plugin("email")
        .service("email")
        .send({
          to: newUser.email,
          from: process.env.SMTP_FROM || process.env.SMTP_USERNAME,
          replyTo: process.env.SMTP_REPLY_TO,
          subject: "Bestätigen Sie Ihre E-Mail-Adresse",
          html: customHtml,
        });

      strapi.log.info(`Confirmation email sent to ${newUser.email}`);
    } catch (mailErr) {
      strapi.log.error("Failed to send confirmation email:", mailErr);
      // Don't fail the registration if email fails
    }

    ctx.created(newUser);
  },
};
