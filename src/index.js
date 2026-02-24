"use strict";

module.exports = {
  register({ strapi }) {},
  async bootstrap({ strapi }) {
    // Override email service to always use correct FROM address
    const emailService = strapi.plugin("email").service("email");
    const originalSend = emailService.send.bind(emailService);

    emailService.send = async function (options) {
      // Replace any "no-reply" sender with the authenticated SMTP user
      const correctedOptions = {
        ...options,
        from: process.env.SMTP_FROM || process.env.SMTP_USERNAME,
      };

      strapi.log.info(
        `[Email Override] Sending email FROM: ${correctedOptions.from} TO: ${correctedOptions.to}`,
      );

      try {
        return await originalSend(correctedOptions);
      } catch (error) {
        strapi.log.error("[Email Override] Send failed:", error);
        throw error;
      }
    };

    strapi.log.info("[Bootstrap] Email service override complete");

    // Delete user profile when user is deleted
    strapi.db.lifecycles.subscribe({
      models: ["plugin::users-permissions.user"],
      async beforeDelete(event) {
        if (event.params.where && event.params.where.id) {
          const user = await strapi.db
            .query("plugin::users-permissions.user")
            .findOne({
              where: { id: event.params.where.id },
              populate: { user_profile: true },
            });
          if (user && user.user_profile && user.user_profile.id) {
            event.params.dataToDeleteProfile = user.user_profile.id;
          }
        }
      },
      async afterDelete(event) {
        if (event.params.dataToDeleteProfile) {
          try {
            await strapi.db.query("api::user-profile.user-profile").delete({
              where: { id: event.params.dataToDeleteProfile },
            });
            strapi.log.info(
              `Cascade: deleted associated user profile with id ${event.params.dataToDeleteProfile}`,
            );
          } catch (error) {
            strapi.log.error(
              "Error during cascade deletion of associated user profile:",
              error,
            );
          }
        }
      },
    });
  },
};
