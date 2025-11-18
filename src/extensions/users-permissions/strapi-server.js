// src/extensions/users-permissions/strapi-server.js
"use strict";

const customRoutesModule = require("../../api/auth/routes/custom-auth.js");
const customRoutes =
  customRoutesModule && customRoutesModule.default
    ? customRoutesModule.default
    : customRoutesModule;

module.exports = (plugin) => {
  // Ensure plugin shape
  plugin.routes = plugin.routes || {};
  plugin.routes["content-api"] = plugin.routes["content-api"] || { routes: [] };

  // Append custom routes into users-permissions content-api routes
  try {
    if (Array.isArray(customRoutes) && customRoutes.length) {
      plugin.routes["content-api"].routes.push(...customRoutes);
      strapi.log.info("users-permissions: custom routes added");
    } else {
      strapi.log.warn(
        "users-permissions: no custom routes to add (customRoutes empty or not an array)"
      );
    }
  } catch (err) {
    strapi.log.error("users-permissions: failed to add custom routes", err);
  }

  // Get the User content type from the plugin.
  const userContentType = plugin.contentTypes && plugin.contentTypes.user;
  if (!userContentType) {
    strapi.log.warn(
      "users-permissions: user content type not found, skipping lifecycles"
    );
    return plugin;
  }

  // Initialize lifecycles if not already defined.
  userContentType.lifecycles = userContentType.lifecycles || {};

  /**
   * After a user is created, automatically create a related User Profile.
   */
  userContentType.lifecycles.afterCreate = async (event) => {
    const { result } = event;
    strapi.log.info(
      "afterCreate hook triggered for user:",
      result && result.id
    );
    try {
      await strapi.db.query("api::user-profile.user-profile").create({
        data: {
          fullName: result.username,
          user: result.id,
        },
      });
      strapi.log.info(`User Profile created for user ${result.id}`);
    } catch (error) {
      strapi.log.error("Error creating user profile:", error);
    }
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

      if (profiles && profiles.length) {
        for (const profile of profiles) {
          await strapi.entityService.delete(
            "api::user-profile.user-profile",
            profile.id
          );
          strapi.log.info(
            `User Profile ${profile.id} deleted for user ${result.id}`
          );
        }
      }
    } catch (error) {
      strapi.log.error("Error deleting user profile:", error);
    }
  };

  return plugin;
};
