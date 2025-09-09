module.exports = {
  async afterCreate(event) {
    const { result } = event;

    if (result && result.id && result.user) {
      // Ensure user gets linked to their profile
      await strapi.entityService.update(
        "plugin::users-permissions.user",
        result.user.id,
        {
          data: {
            user_profile: result.id, // Link the newly created profile to the user
          },
        }
      );
    }
  },
};
