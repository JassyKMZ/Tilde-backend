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

    // Make strapi available globally for cron callbacks
    global.strapi = strapi;

    // Schedule reminder notifications
    cron.schedule("0 9 * * *", async () => {
      const strapi = global.strapi;
      console.log("Running reminder notification job");

      try {
        const now = new Date();
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() + 2);

        // Compare only YYYY-MM-DD to avoid timezone issues
        const targetDateStr = targetDate.toISOString().slice(0, 10);

        // Fetch all published events once
        const events = await strapi.documents("api::post.post").findMany({
          filters: { isEvent: true },
          populate: ["user_reminders", "user_reminders.user"],
          status: "published",
        });

        // Filter events happening exactly 2 days from now
        const posts = events.filter((post) => {
          if (!post.eventDate) return false;
          const eventDateStr = new Date(post.eventDate)
            .toISOString()
            .slice(0, 10);
          return eventDateStr === targetDateStr;
        });

        console.log(`Found ${posts.length} events happening in 2 days`);

        for (const post of posts) {
          // Correct user filtering
          const users = post.user_reminders
            .map((rem) => rem.user)
            .filter((user) => user?.pushNotificationsEnabled);

          console.log(
            `Post "${post.titel}" → ${users.length} users with push enabled`,
          );

          for (const user of users) {
            await strapi
              .plugin("unified-notification")
              .service("notification")
              .sendToUser(user.id, {
                title: `Reminder: ${post.titel}`,
                body: `Don't forget the event on ${new Date(
                  post.eventDate,
                ).toDateString()}`,
              });
          }
        }
      } catch (error) {
        console.error("Error in reminder job:", error);
      }
    });

    // Schedule notifications for recently published posts (every 5 minutes)
    cron.schedule("*/5 * * * *", async () => {
      const strapi = global.strapi;
      console.log("Running new post notification check");

      try {
        // Add a buffer to avoid missing posts due to timestamp rounding
        const windowStart = new Date(Date.now() - 6 * 60 * 1000);

        // Fetch recently published posts
        const recentPosts = await strapi.documents("api::post.post").findMany({
          filters: {
            publishedAt: { $gte: windowStart.toISOString() },
          },
          populate: ["kategories", "klasses"],
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
