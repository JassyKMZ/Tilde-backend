"use strict";

module.exports = {
  async test(ctx) {
    console.log("Test endpoint called");
    console.log("Body:", ctx.request.body);
    try {
      const { userId, title, body } = ctx.request.body;

      if (!userId || !title || !body) {
        return ctx.badRequest("Missing required fields: userId, title, body");
      }

      const payload = {
        notification: {
          title: title || "Test Notification",
          body: body || "This is a test push notification.",
        },
        data: {},
      };

      const result = await strapi.plugins[
        "unified-notification"
      ].services.notification.sendToUser(userId, payload);

      ctx.send({
        message: "Test notification sent",
        result,
      });
    } catch (error) {
      strapi.log.error("Test notification failed:", error);
      ctx.internalServerError("Failed to send test notification");
    }
  },

  async testreminder(ctx) {
    console.log("Test reminder endpoint called");
    console.log("Body:", ctx.request.body);
    try {
      const { userId, postId } = ctx.request.body;

      if (!userId || !postId) {
        return ctx.badRequest("Missing required fields: userId, postId");
      }

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
