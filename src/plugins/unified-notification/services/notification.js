"use strict";

console.log("🔧 Notification service loaded");

module.exports = ({ strapi }) => ({
  async sendToUser(userId, payload) {
    console.log("sendToUser called for userId:", userId);
    strapi.log.info(`Sending unified notification to user ${userId}`);

    const fcmTokens = await strapi
      .service("api::fcm-token.fcm-token")
      .findByUser(userId);

    const webpushSubs = await strapi
      .service("api::webpush-subscription.webpush-subscription")
      .findByUser(userId);

    console.log(
      `User ${userId} - FCM tokens: ${fcmTokens?.length || 0}, WebPush subs: ${webpushSubs?.length || 0}`
    );

    let fcmResult = null;
    let webpushResult = null;

    if (fcmTokens?.length) {
      try {
        console.log(
          `Sending FCM to user ${userId} with ${fcmTokens.length} tokens`
        );
        fcmResult = await strapi
          .service("api::fcm-token.fcm-token")
          .sendToTokens(fcmTokens, payload);
        console.log(`FCM send result for user ${userId}:`, fcmResult);
      } catch (err) {
        strapi.log.error("FCM send failed:", err);
      }
    }

    if (webpushSubs?.length) {
      try {
        console.log(
          `Sending WebPush to user ${userId} with ${webpushSubs.length} subscriptions`
        );
        const webPush = require("../../../services/web-push");
        webpushResult = await webPush.sendToSubscriptions(webpushSubs, payload);
        console.log(`WebPush send result for user ${userId}:`, webpushResult);
      } catch (err) {
        strapi.log.error("WebPush send failed:", err);
      }
    }

    return {
      fcm: fcmResult || { successCount: 0, failureCount: 0 },
      webpush: webpushResult || { successCount: 0, failureCount: 0 },
    };
  },

  async sendNewPostNotifications(post) {
    console.log("Sending new post notifications for post:", post.titel);
    // Get all user profiles with push enabled
    const userProfiles = await strapi
      .documents("api::user-profile.user-profile")
      .findMany({
        filters: { pushNotificationsEnabled: true },
        populate: [
          "user",
          "kategories",
          "klasses",
          "kinder",
          "kinder.favoriteCategories",
        ],
      });

    console.log("Found user profiles with push enabled:", userProfiles.length);

    const postCategories = post.kategories?.map((c) => c.id) || [];
    const postKlasses = post.klasses?.map((k) => k.id) || [];
    const postMinAge = post.minAge || 0;
    const postMaxAge = post.maxAge || 18;

    for (const profile of userProfiles) {
      const userCategories = profile.kategories?.map((c) => c.id) || [];
      const userKlasses = profile.klasses?.map((k) => k.id) || [];
      const userMinAge = profile.minAge || 0;
      const userMaxAge = profile.maxAge || 18;

      let userMatches = false;
      let kidMatches = [];

      // TEMP: For testing, always match user
      userMatches = true;

      // Send notifications
      const url = `/post/${post.documentId}`;

      if (userMatches) {
        console.log(
          "Sending user match notification to user:",
          profile.user.id
        );
        await this.sendToUser(profile.user.id, {
          title: "New Post Published",
          body: "A new post that you might like was published",
          data: { url },
        });
      }

      for (const kidName of kidMatches) {
        console.log(
          "Sending kid match notification to user:",
          profile.user.id,
          "for kid:",
          kidName
        );
        await this.sendToUser(profile.user.id, {
          title: "New Post Published",
          body: `A post that ${kidName} might like, was published`,
          data: { url },
        });
      }
    }
  },
});
