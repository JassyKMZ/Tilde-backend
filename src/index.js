module.exports = {
  register({ strapi }) {},
  async bootstrap({ strapi }) {
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
              `Cascade: deleted associated user profile with id ${event.params.dataToDeleteProfile}`
            );
          } catch (error) {
            strapi.log.error(
              "Error during cascade deletion of associated user profile:",
              error
            );
          }
        }
      },
    });
  },
};
