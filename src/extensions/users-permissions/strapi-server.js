"use strict";

module.exports = (plugin) => {
  // Get the User content type from the plugin.
  const userContentType = plugin.contentTypes.user;

  // - Code snipped from Nils -
  // const originalCreateJwt = plugin.services.jwt.issue;

  // plugin.services.jwt.issue = (payload, options = {}) => {
  //   // Add custom fields to the payload
  //   payload.customField = "customValue";
  //   // Call the original method
  //   return originalCreateJwt(payload, options);
  // };
  // - END snipped from Nils -

  /* ____________________________
   * JWT CUSTOMIZATION
   * _____________________________
   */
  // const jwtService = strapi.plugin("users-permissions").service("jwt");
  // const originalCallback = plugin.controllers.auth.callback;

  // plugin.controllers.auth.callback = async (ctx) => {
  //   // Run the normal login flow
  //   const response = await originalCallback(ctx);

  //   if (response.jwt && response.user) {
  //     // Re‑issue the token with `sub` added
  //     response.jwt = jwtService.issue({
  //       id: response.user.id,
  //       sub: response.user.id, // 👈 subject claim
  //     });
  //     // No expiresIn here — it will use the one from config/plugins.js
  //   }

  //   return response;
  // };

  /* ____________________________
   * Save Firebase messaging token
   * ____________________________
   */

  /**
    Appends a function that saves the messaging token from a client device to the plugin's controller
    **/
  // plugin.controllers.auth = plugin.controllers.auth || {};
  // plugin.controllers.auth.saveFCM = async (ctx) => {
  //   const res = await strapi.entityService.update(
  //     "plugin::users-permissions.user",
  //     ctx.state.user.id,
  //     { data: { fcm: ctx.request.body.token } }
  //   );
  //   ctx.body = res;
  // };

  // /**
  //   Adds a POST method route that is handled by the saveFCM function above.
  //   **/
  // plugin.routes["content-api"].routes.push({
  //   method: "POST",
  //   path: "/auth/local/fcm",
  //   handler: "auth.saveFCM",
  //   config: {
  //     auth: {
  //       scope: [], // or an array of required scopes if you use them
  //     },
  //     policies: [],
  //   },
  // });

  /* ____________________________
   * LIFECYCLES
   * _____________________________
   */

  // Initialize lifecycles if not already defined.
  userContentType.lifecycles = userContentType.lifecycles || {};

  /**
   * After a user is created, automatically create a related User Profile.
   */
  userContentType.lifecycles.afterCreate = async (event) => {
    const { result } = event;
    console.log("afterCreate hook triggered for user:", result);
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
      // Look for profiles where the related "user" field equals the deleted user's id.
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
