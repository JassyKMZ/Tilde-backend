"use strict";

module.exports = ({ strapi }) => ({
  /**
   * Simple test endpoint that sends a custom notification payload to a single user.
   * Expects JSON body: { userId, title, body }
   */
  async test(ctx) {
    console.log("Test endpoint called");
    console.log("Body:", ctx.request.body);

    try {
      const { userId, title, body } = ctx.request.body;

      if (!userId || !title || !body) {
        return ctx.badRequest("Missing required fields: userId, title, body");
      }

      const payload = {
        title: title || "Test Notification",
        body: body || "This is a test push notification.",
        icon: "/icons/icon-192.png",
        badge: "/icons/badge.png",
        data: { url: "/" },
      };

      const result = await strapi
        .plugin("unified-notification")
        .service("notification")
        .sendToUser(Number(userId), payload);

      ctx.send({
        message: "Test notification sent",
        result,
      });
    } catch (error) {
      strapi.log.error("Test notification failed:", error);
      ctx.internalServerError("Failed to send test notification");
    }
  },

  /**
   * Test reminder endpoint.
   * Expects JSON body: { userId, postId }
   * Loads the post and sends a reminder payload to the given userId.
   */
  async testreminder(ctx) {
    console.log("Test reminder endpoint called");
    console.log("Body:", ctx.request.body);

    try {
      const { userId, postId } = ctx.request.body;

      if (!userId || !postId) {
        return ctx.badRequest("Missing required fields: userId, postId");
      }

      // Robust post loading (reuse preview logic style)
      let post = null;

      try {
        post = await strapi.documents("api::post.post").findOne(postId, {
          populate: ["user_reminders", "user_reminders.user"],
          status: "published",
          locale: "all",
        });
      } catch (err) {
        // ignore and try entry API fallback
      }

      if (!post && !isNaN(Number(postId))) {
        post = await strapi.entityService.findOne(
          "api::post.post",
          Number(postId),
          {
            populate: ["user_reminders", "user_reminders.user"],
          },
        );
      }

      if (!post || !post.isEvent || !post.eventDate) {
        return ctx.badRequest("Invalid post or not an event");
      }

      const eventDate = new Date(post.eventDate);
      const dateText = eventDate.toLocaleDateString("de-DE");

      const payload = {
        title: `Erinnerung - ${post.titel}`,
        body: `${dateText} — in 2 Tagen`,
        icon: "/icons/icon-192.png",
        badge: "/icons/badge.png",
        data: { url: `/post/${post.documentId}` },
        tag: `reminder-${post.documentId}`,
        renotify: true,
      };

      const result = await strapi
        .plugin("unified-notification")
        .service("notification")
        .sendToUser(Number(userId), payload);

      ctx.send({ success: true, result });
    } catch (error) {
      console.error("Error in test reminder endpoint:", error);
      ctx.internalServerError("Failed to send test reminder");
    }
  },

  /**
   * Backwards-compatible testPostNotification route (kept if referenced elsewhere).
   * Uses params: /test-post/:postId/:userId?
   */
  async testPostNotification(ctx) {
    const { postId, userId } = ctx.params;

    try {
      // Robust post loading
      const post =
        (await strapi.documents("api::post.post").findOne(postId, {
          populate: ["kategories"],
          status: "published",
          locale: "all",
        })) ||
        (await (isNaN(Number(postId))
          ? Promise.resolve(null)
          : strapi.entityService.findOne("api::post.post", Number(postId), {
              populate: ["kategories"],
            })));

      if (!post) return ctx.notFound("Post not found");

      await strapi
        .plugin("unified-notification")
        .service("notification")
        .sendNewPostNotifications(post, {
          testUserId: userId ? Number(userId) : undefined,
        });

      ctx.send({ ok: true });
    } catch (error) {
      strapi.log.error("testPostNotification error:", error);
      ctx.internalServerError("Failed to send test post notification");
    }
  },

  /**
   * Preview endpoint: returns matching users for a post.
   * Route: GET /preview/:postId
   */
  async preview(ctx) {
    try {
      const { postId } = ctx.params;
      console.log("Preview called with postId:", postId);

      // Debug: list a sample of documents to inspect IDs/statuses
      try {
        const allDocs = await strapi.documents("api::post.post").findMany({
          locale: "all",
          status: "all",
          limit: 50,
        });
        console.log(
          "Sample documents:",
          allDocs.map((d) => ({
            documentId: d.documentId,
            id: d.id,
            status: d.status,
            locale: d.locale,
            publishedAt: d.publishedAt,
            titel: d.titel,
          })),
        );
      } catch (dbgErr) {
        console.warn("Could not list documents for debug:", dbgErr.message);
      }

      let post = null;

      // 1) Try documents().findOne(documentId)
      try {
        post = await strapi.documents("api::post.post").findOne(postId, {
          populate: ["kategories"],
          status: "published",
          locale: "all",
        });
        if (post) console.log("Loaded post via documents().findOne");
      } catch (err) {
        console.warn("documents().findOne failed:", err.message);
      }

      // 2) If not found, try documents().findMany filtering by documentId
      if (!post) {
        try {
          const docs = await strapi.documents("api::post.post").findMany({
            filters: { documentId: postId },
            populate: ["kategories"],
            status: "published",
            locale: "all",
          });
          post = docs && docs.length ? docs[0] : null;
          if (post)
            console.log(
              "Loaded post via documents().findMany filter documentId",
            );
        } catch (err) {
          console.warn("documents().findMany(documentId) failed:", err.message);
        }
      }

      // 3) If still not found and postId is numeric, try entityService.findOne (entry API)
      if (!post && !isNaN(Number(postId))) {
        try {
          post = await strapi.entityService.findOne(
            "api::post.post",
            Number(postId),
            {
              populate: ["kategories"],
            },
          );
          if (post)
            console.log("Loaded post via entityService.findOne (numeric id)");
        } catch (err) {
          console.warn("entityService.findOne failed:", err.message);
        }
      }

      // 4) Final fallback: documents().findMany by numeric id
      if (!post && !isNaN(Number(postId))) {
        try {
          const docs = await strapi.documents("api::post.post").findMany({
            filters: { id: Number(postId) },
            populate: ["kategories"],
            status: "published",
            locale: "all",
          });
          post = docs && docs.length ? docs[0] : null;
          if (post)
            console.log("Loaded post via documents().findMany filter id");
        } catch (err) {
          console.warn("documents().findMany(id) failed:", err.message);
        }
      }

      if (!post) {
        console.log("Preview: post not found after all attempts");
        return ctx.notFound("Post not found");
      }

      const matches = await strapi
        .plugin("unified-notification")
        .service("notification")
        .getMatchingUsersForPost(post);

      ctx.send({
        postId,
        postTitle: post.titel,
        matchCount: matches.length,
        matches,
      });
    } catch (error) {
      console.error("Preview error:", error);
      ctx.internalServerError("Failed to generate preview");
    }
  },

  /**
   * New testPost action (route: POST /test-post/:postId/:userId?)
   * Sends a test notification either to a provided userId or to the first matched user.
   */
  async testPost(ctx) {
    try {
      const { postId, userId } = ctx.params;

      // Robust post loading like preview
      const post =
        (await strapi.documents("api::post.post").findOne(postId, {
          populate: ["kategories"],
          status: "published",
          locale: "all",
        })) ||
        (await (isNaN(Number(postId))
          ? Promise.resolve(null)
          : strapi.entityService.findOne("api::post.post", Number(postId), {
              populate: ["kategories"],
            })));

      if (!post) {
        return ctx.notFound("Post not found");
      }

      // If userId provided, send only to that user (test mode)
      if (userId) {
        const result = await strapi
          .plugin("unified-notification")
          .service("notification")
          .sendNewPostNotifications(post, { testUserId: Number(userId) });

        return ctx.send({ success: true, result });
      }

      // Otherwise send a single test notification to the first matched user
      const matches = await strapi
        .plugin("unified-notification")
        .service("notification")
        .getMatchingUsersForPost(post);

      if (!matches.length) {
        return ctx.send({
          success: false,
          message: "No matching users to test",
        });
      }

      const testUser = matches[0];
      const result = await strapi
        .plugin("unified-notification")
        .service("notification")
        .sendNewPostNotifications(post, { testUserId: testUser.userId });

      ctx.send({ success: true, testUser, result });
    } catch (error) {
      strapi.log.error("testPost error:", error);
      ctx.internalServerError("Failed to send test notification");
    }
  },
});
