"use strict";

const crypto = require("crypto");
// const customRoutesModule = require("../../api/auth/routes/custom-auth.js");

// const customRoutes =
//   customRoutesModule && customRoutesModule.default
//     ? customRoutesModule.default
//     : customRoutesModule;

const REDIRECT_URL = (
  process.env.REDIRECT_URL ||
  process.env.FRONTEND_URL ||
  "http://localhost:4173"
).replace(/\/$/, "");

// Helper to generate confirmation token
function generateConfirmationToken() {
  return crypto.randomBytes(32).toString("hex");
}

module.exports = (plugin) => {
  // Prevent Strapi from sending automatic confirmation emails
  // by intercepting and disabling the email service for confirmation emails
  if (strapi.plugin("email")) {
    const emailService = strapi.plugin("email").service("email");
    const originalSend = emailService.send;

    emailService.send = async function (options) {
      // Block Strapi's automatic confirmation emails
      if (
        options.html?.includes("/api/auth/email-confirmation") ||
        options.html?.includes("Thank you for registering")
      ) {
        strapi.log.info(
          `[Email Override] Blocked Strapi automatic confirmation email to ${options.to}`,
        );
        return;
      }

      // Allow all other emails through (including custom confirmation emails)
      return originalSend.call(this, options);
    };
  }

  // Ensure plugin shape
  plugin.routes = plugin.routes || {};
  plugin.routes["content-api"] = plugin.routes["content-api"] || { routes: [] };

  // Get the User content type from the plugin.
  const userContentType = plugin.contentTypes.user;

  // Initialize lifecycles if not already defined.
  userContentType.lifecycles = userContentType.lifecycles || {};

  /**
   * After a user is created, automatically create a related User Profile.
   */
  userContentType.lifecycles.afterCreate = async (event) => {
    const { result } = event;
    console.log("afterCreate hook triggered for user:", result);

    try {
      // Create user profile
      await strapi.db.query("api::user-profile.user-profile").create({
        data: {
          fullName: "",
          user: result.id,
        },
      });
      strapi.log.info(`User Profile created for user ${result.id}`);
    } catch (error) {
      strapi.log.error("Error creating user profile:", error);
    }

    // NOTE: Email confirmation is handled ONLY by the custom register controller
    // afterCreate should NOT send emails - it's only for creating related records
    // If users are created via admin panel, they will have confirmed: true by default
  };

  /**
   * After a user is deleted, remove the corresponding User Profile.
   */
  userContentType.lifecycles.afterDelete = async (event) => {
    const { result } = event;
    try {
      const profiles = await strapi.db
        .query("api::user-profile.user-profile")
        .findMany({
          filters: {
            user: {
              id: { $eq: result.id },
            },
          },
        });

      if (profiles.length) {
        for (const profile of profiles) {
          await strapi.entityService.delete(
            "api::user-profile.user-profile",
            profile.id,
          );
          strapi.log.info(
            `User Profile ${profile.id} deleted for user ${result.id}`,
          );
        }
      }
    } catch (error) {
      strapi.log.error("Error deleting user profile:", error);
    }
  };

  return plugin;
};
