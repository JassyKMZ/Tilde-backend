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

    // Run every five minutes; send a reminder when an event is due in roughly 24h ± 5m.
    cron.schedule("*/5 * * * *", async () => {
      try {
        const now = Date.now();
        const reminderWindowStart = new Date(
          now + 23 * 60 * 60 * 1000 + 55 * 60 * 1000,
        );
        const reminderWindowEnd = new Date(
          now + 24 * 60 * 60 * 1000 + 5 * 60 * 1000,
        );

        const posts = await strapi.documents("api::post.post").findMany({
          filters: {
            postType: "event",
            eventDate: {
              $gte: reminderWindowStart.toISOString(),
              $lte: reminderWindowEnd.toISOString(),
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
          if (!post?.documentId) continue;

          const eventDate = post.eventDate ? new Date(post.eventDate) : null;
          if (!eventDate || Number.isNaN(eventDate.getTime())) continue;

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

    // Retry pending notifications every five minutes for up to 24 hours.
    cron.schedule("*/5 * * * *", async () => {
      console.log("Running new post notification check");

      try {
        const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Fetch recently published posts
        const recentPosts = await strapi.documents("api::post.post").findMany({
          filters: {
            publishedAt: { $gte: windowStart.toISOString() },
            notificationSent: false,
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

          // Keep failed sends pending so the next cron run can retry them.
          const delivery = await strapi
            .plugin("unified-notification")
            .service("notification")
            .sendNewPostNotifications(post, {
              deliveredUserIds: post.notificationDeliveredUserIds || [],
            });

          console.log(
            `Post notification result for ${post.documentId}:`,
            delivery,
          );

          const complete =
            delivery &&
            (delivery.matchedUsers === 0 || delivery.failedUsers === 0);
          const notificationDeliveredUserIds = [
            ...new Set(
              [
                ...(post.notificationDeliveredUserIds || []),
                ...(delivery?.deliveredUserIds || []),
              ].map(String),
            ),
          ];

          try {
            await strapi.documents("api::post.post").update(post.documentId, {
              data: {
                notificationDeliveredUserIds,
                ...(complete ? { notificationSent: true } : {}),
              },
            });
          } catch (err) {
            console.log(
              "Could not update post notification state:",
              err.message,
            );
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
