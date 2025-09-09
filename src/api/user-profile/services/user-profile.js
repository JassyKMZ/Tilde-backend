"use strict";

const { createCoreService } = require("@strapi/strapi").factories;

module.exports = createCoreService(
  "api::user-profile.user-profile",
  ({ strapi }) => ({
    async create(params) {
      // Create the user profile using the core service
      const profile = await super.create(params);

      // Ensure the profile is linked to a user if a user ID was provided
      if (profile && params.data && params.data.user) {
        await strapi.entityService.update(
          "plugin::users-permissions.user",
          params.data.user,
          {
            data: {
              user_profile: profile.id,
            },
          }
        );
      }

      return profile;
    },
  })
);
