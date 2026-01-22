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
      strapi.plugins["unified-notification"].routes
    );
    console.log(
      "Unified notification controllers:",
      strapi.plugins["unified-notification"].controllers
    );

    // Make strapi available globally for cron callbacks
    global.strapi = strapi;

    // Schedule reminder notifications
    cron.schedule("0 9 * * *", async () => {
      const strapi = global.strapi;
      // Every day at 9 AM
      console.log("Running reminder notification job");
      try {
        const now = new Date();
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() + 2);
        targetDate.setHours(0, 0, 0, 0);

        console.log(`Now: ${now}`);
        console.log(`Target date: ${targetDate}`);

        const allEvents = await strapi.documents("api::post.post").findMany({
          filters: { isEvent: true },
          populate: ["user_reminders", "user_reminders.user"],
          status: "published",
        });
        console.log(`Total published events: ${allEvents.length}`);
        allEvents.forEach((post) =>
          console.log(
            `Event: ${post.titel}, isEvent: ${post.isEvent}, eventDate: ${post.eventDate}, user_reminders: ${post.user_reminders.length}`
          )
        );

        // Find posts that are events with eventDate exactly 2 days from now
        const allPosts = await strapi.documents("api::post.post").findMany({
          filters: { isEvent: true },
          populate: ["user_reminders", "user_reminders.user"],
          status: "published",
        });

        const posts = allPosts.filter((post) => {
          if (!post.eventDate) return false;
          const eventDate = new Date(post.eventDate);
          eventDate.setHours(0, 0, 0, 0);
          return eventDate.getTime() === targetDate.getTime();
        });

        console.log(`Filtered to ${posts.length} posts for reminders`);
        posts.forEach((post) =>
          console.log(
            `Post: ${post.titel}, eventDate: ${post.eventDate}, user_reminders: ${post.user_reminders.length}`
          )
        );

        for (const post of posts) {
          const users = post.user_reminders.filter(
            (user) => user.pushNotificationsEnabled
          );
          console.log(
            `Post ${post.titel}: ${users.length} users with push enabled`
          );
          for (const user of users) {
            console.log(
              `Sending reminder to user ${user.user.id} for ${post.titel}`
            );
            await strapi
              .plugin("unified-notification")
              .service("notification")
              .sendToUser(user.user.id, {
                title: `Reminder: ${post.titel}`,
                body: `Don't forget the event on ${new Date(post.eventDate).toDateString()}`,
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
        // Find posts published in the last 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        const recentPosts = await strapi.documents("api::post.post").findMany({
          filters: {
            publishedAt: { $gte: fiveMinutesAgo.toISOString() },
          },
          populate: ["kategories", "klasses"],
          status: "published",
        });

        console.log(`Found ${recentPosts.length} recently published posts`);

        for (const post of recentPosts) {
          // Check if already notified (simple check: if post has notified flag)
          if (!post.notificationSent) {
            console.log(`Sending notifications for post: ${post.titel}`);
            await strapi
              .plugin("unified-notification")
              .service("notification")
              .sendNewPostNotifications(post);

            // Mark as notified (if schema supports it)
            try {
              await strapi.documents("api::post.post").update(post.documentId, {
                data: { notificationSent: true },
              });
            } catch (err) {
              // Field might not exist, that's ok
              console.log("Could not mark post as notified:", err.message);
            }
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
  ],
  controllers: {
    notification: require("./controllers/notification"),
  },
  services: {
    notification: require("./services/notification"),
  },
};
