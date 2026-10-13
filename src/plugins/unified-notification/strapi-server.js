"use strict";

const cron = require("node-cron");

module.exports = {
  register({ strapi }) {
    console.log("🔔 Notification plugin loaded");
  },

  bootstrap({ strapi }) {
    console.log("Loaded plugins:", Object.keys(strapi.plugins));
    console.log(
      "Unified notification routes:",
      strapi.plugins["unified-notification"].routes,
    );
    console.log(
      "Unified notification controllers:",
      strapi.plugins["unified-notification"].controllers,
    );

    // Run every five minutes; the event window is the 5 minutes before T-24h.
    cron.schedule("*/5 * * * *", async () => {
      try {
        const now = Date.now();
        const reminderDueBefore = new Date(now + 24 * 60 * 60 * 1000);
        const reminderDueAfter = new Date(
          reminderDueBefore.getTime() - 5 * 60 * 1000,
        );
        const posts = await strapi.documents("api::post.post").findMany({
          filters: {
            postType: "event",
            eventDate: {
              $gte: reminderDueAfter.toISOString(),
              $lte: reminderDueBefore.toISOString(),
            },
            eventReminderNotificationSent: false,
          },
          status: "published",
        });

        if (!posts.length) return;

        const profiles = await strapi
          .documents("api::user-profile.user-profile")
          .findMany({
            filters: { pushNotificationsEnabled: true },
            populate: ["user", "bookmarks"],
          });
        const notificationService = strapi
          .plugin("unified-notification")
          .service("notification");

        for (const post of posts) {
          const bookmarkedProfiles = profiles.filter((profile) =>
            (profile.bookmarks || []).some(
              (bookmark) =>
                bookmark.documentId === post.documentId ||
                bookmark.id === post.id,
            ),
          );

          for (const profile of bookmarkedProfiles) {
            if (!profile.user?.id) continue;
            await notificationService.sendReminderNotification(
              post,
              profile.user.id,
            );
          }

          if (bookmarkedProfiles.length) {
            await strapi.documents("api::post.post").update(post.documentId, {
              data: { eventReminderNotificationSent: true },
            });
          }
        }
      } catch (error) {
        strapi.log.error("Error in 24-hour event reminder job:", error);
      }
    });

    // Schedule notifications for recently published posts (every 5 minutes)
    cron.schedule("*/5 * * * *", async () => {
      console.log("Running new post notification check");

      try {
        // Add a buffer to avoid missing posts due to timestamp rounding
        const windowStart = new Date(Date.now() - 6 * 60 * 1000);

        // Fetch recently published posts
        const recentPosts = await strapi.documents("api::post.post").findMany({
          filters: {
            publishedAt: { $gte: windowStart.toISOString() },
          },
          populate: ["kategories"],
          status: "published",
        });

        console.log(`Found ${recentPosts.length} recently published posts`);

        for (const post of recentPosts) {
          // Skip if already notified
          // @ts-ignore
          if (post.notificationSent) {
            continue;
          }

          console.log(`Sending notifications for post: ${post.titel}`);

          // Send notifications to matching users
          await strapi
            .plugin("unified-notification")
            .service("notification")
            .sendNewPostNotifications(post);

          // Mark post as notified (if field exists)
          try {
            // @ts-ignore
            await strapi.documents("api::post.post").update(post.documentId, {
              data: { notificationSent: true },
            });
          } catch (err) {
            console.log("Could not mark post as notified:", err.message);
          }
        }
      } catch (error) {
        console.error("Error in new post notification check:", error);
      }
    });
  },

  routes: [
    {
      method: "POST",
      path: "/test",
      handler: "notification.test",
      config: {
        type: "content-api",
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "POST",
      path: "/pushnotifications/testreminder",
      handler: "notification.testreminder",
      config: {
        type: "content-api",
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "GET",
      path: "/preview/:postId",
      handler: "notification.preview",
      config: {
        type: "content-api",
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "POST",
      path: "/test-post/:postId/:userId?",
      handler: "notification.testPost",
      config: {
        type: "content-api",
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
  controllers: {
    notification: require("./controllers/notification"),
  },
  services: {
    notification: require("./services/notification"),
  },
};
