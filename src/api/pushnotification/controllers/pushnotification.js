"use strict";

module.exports = {
  async test(ctx) {
    console.log("Push notification test endpoint called");
    console.log("Body:", ctx.request.body);
    try {
      const { userId, title, body } = ctx.request.body;

      if (!userId || !title || !body) {
        return ctx.badRequest("Missing required fields: userId, title, body");
      }

      // Call the plugin service
      const result = await strapi
        .plugin("unified-notification")
        .service("notification")
        .sendToUser(userId, { title, body });

      ctx.send({ success: true, result });
    } catch (error) {
      console.error("Error in test endpoint:", error);
      ctx.send({ success: false, error: error.message });
    }
  },

  async testreminder(ctx) {
    console.log("Test reminder endpoint called");
    console.log("Body:", ctx.request.body);
    try {
      const { userProfileId, postId } = ctx.request.body;

      if (!userProfileId || !postId) {
        return ctx.badRequest("Missing required fields: userProfileId, postId");
      }

      // Get the user profile
      const userProfile = await strapi.entityService.findOne(
        "api::user-profile.user-profile",
        userProfileId
      );
      if (!userProfile) {
        return ctx.badRequest("Invalid user profile");
      }

      const userId = userProfile.user.id;

      // Get the post
      const post = await strapi.entityService.findOne("api::post.post", postId);
      if (!post || !post.isEvent || !post.eventDate) {
        return ctx.badRequest("Invalid post or not an event");
      }

      // Send reminder notification
      const result = await strapi
        .plugin("unified-notification")
        .service("notification")
        .sendToUser(userId, {
          title: `Reminder: ${post.titel}`,
          body: `Don't forget the event on ${new Date(post.eventDate).toDateString()}`,
        });

      ctx.send({ success: true, result });
    } catch (error) {
      console.error("Error in test reminder endpoint:", error);
      ctx.send({ success: false, error: error.message });
    }
  },
};
