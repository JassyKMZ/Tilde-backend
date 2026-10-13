"use strict";

console.log("🔧 Notification service loaded");

module.exports = ({ strapi }) => {
  // Base URL used for notification links (service worker can open relative or absolute)
  const FRONTEND_URL = (
    process.env.FRONTEND_URL || "http://localhost:4173"
  ).replace(/\/$/, "");

  /**
   * Normalize a relative path into an absolute URL for notifications.
   * If payload.data.url is already absolute, keep it.
   */
  function makeAbsoluteUrl(path) {
    if (!path) return FRONTEND_URL;
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    // ensure leading slash
    const p = path.startsWith("/") ? path : `/${path}`;
    return `${FRONTEND_URL}${p}`;
  }

  /**
   * Ensure payload.data.url is absolute and does not lose the post path.
   * Mutates payload.data.url in place.
   */
  function ensureAbsoluteDataUrl(payload) {
    payload.data = payload.data || {};
    if (payload.data.url) {
      try {
        // If already absolute, keep it
        const u = new URL(payload.data.url);
        payload.data.url = u.toString();
      } catch {
        // relative -> make absolute
        payload.data.url = makeAbsoluteUrl(payload.data.url);
      }
    } else {
      payload.data.url = FRONTEND_URL;
    }
  }

  function categoryValues(categories = []) {
    const values = new Set();
    for (const category of Array.isArray(categories) ? categories : []) {
      if (category && typeof category === "object") {
        if (category.id != null) values.add(String(category.id));
        if (category.documentId) values.add(String(category.documentId));
        const title = category.title || category.name;
        if (title) values.add(String(title).trim().toLowerCase());
      } else if (category != null) {
        const value = String(category).trim();
        if (value) values.add(value.toLowerCase());
      }
    }
    return values;
  }

  function categoriesOverlap(first, second) {
    const firstValues = categoryValues(first);
    return [...categoryValues(second)].some((value) => firstValues.has(value));
  }

  function ageRangeOverlaps(firstMin, firstMax, secondMin, secondMax) {
    const minA =
      firstMin != null && Number.isFinite(Number(firstMin))
        ? Number(firstMin)
        : 0;
    const maxA =
      firstMax != null && Number.isFinite(Number(firstMax))
        ? Number(firstMax)
        : 99;
    const minB =
      secondMin != null && Number.isFinite(Number(secondMin))
        ? Number(secondMin)
        : 0;
    const maxB =
      secondMax != null && Number.isFinite(Number(secondMax))
        ? Number(secondMax)
        : 99;
    return minA <= maxB && maxA >= minB;
  }

  return {
    /**
     * Send a prepared payload to a single user.
     * payload is expected to contain: title, body, icon, badge, image, data (object), tag, renotify
     */
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
        `User ${userId} - FCM tokens: ${fcmTokens?.length || 0}, WebPush subs: ${webpushSubs?.length || 0}`,
      );

      // Ensure data.url is absolute for service worker openWindow
      ensureAbsoluteDataUrl(payload);

      // Log final payload for debugging (redact if necessary)
      try {
        console.log(
          `Final notification payload for user ${userId}:`,
          JSON.stringify(payload),
        );
      } catch {
        console.log(
          "Final notification payload for user (could not stringify)",
        );
      }

      // Map to FCM message shape (HTTP v1 compatible)
      // NOTE: do NOT include `icon` in message.notification for FCM v1; use image or data fields.
      const fcmMessage = {
        notification: {
          title: payload.title,
          body: payload.body,
          ...(payload.image ? { image: payload.image } : {}),
        },
        data: {
          // include url and UI hints in data so client/service worker can use them
          url: payload.data.url,
          icon: payload.icon || "",
          badge: payload.badge || "",
          image: payload.image || "",
          tag: payload.tag || "",
          renotify: payload.renotify ? "true" : "false",
          // include any other custom data fields (stringify non-strings)
          ...Object.fromEntries(
            Object.entries(payload.data || {}).map(([k, v]) => [
              k,
              typeof v === "string" ? v : JSON.stringify(v),
            ]),
          ),
        },
      };

      // Map to WebPush payload shape expected by your web-push helper
      const webpushPayload = {
        title: payload.title,
        body: payload.body,
        icon: payload.icon,
        badge: payload.badge,
        image: payload.image,
        data: payload.data,
        tag: payload.tag,
        renotify: payload.renotify,
      };

      let fcmResult = null;
      let webpushResult = null;

      if (fcmTokens?.length) {
        try {
          console.log(
            `Sending FCM to user ${userId} with ${fcmTokens.length} tokens`,
          );
          fcmResult = await strapi
            .service("api::fcm-token.fcm-token")
            .sendToTokens(fcmTokens, fcmMessage);
          console.log(`FCM send result for user ${userId}:`, fcmResult);
        } catch (err) {
          strapi.log.error("FCM send failed:", err);
        }
      }

      if (webpushSubs?.length) {
        try {
          console.log(
            `Sending WebPush to user ${userId} with ${webpushSubs.length} subscriptions`,
          );
          const webPush = require("../../../services/web-push");
          webpushResult = await webPush.sendToSubscriptions(
            webpushSubs,
            webpushPayload,
          );
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

    /**
     * Send notifications for a newly published post.
     * options.testUserId -> if provided, only send to that user (test mode)
     */
    async sendNewPostNotifications(post, options = {}) {
      const testUserId = options.testUserId;

      // Build absolute post URL reliably
      const postPath = `/post/${post.documentId}`;
      const absolutePostUrl = `${FRONTEND_URL}${postPath}`;

      // Test mode: send only to one user with a clear test payload
      if (testUserId) {
        const testPayload = {
          title: "Test: Neuer Beitrag",
          body: `Test für Post: ${post.titel}`,
          icon: `${FRONTEND_URL}/icons/icon-192.png`,
          badge: `${FRONTEND_URL}/icons/badge.png`,
          image: post.heroImageUrl
            ? `${FRONTEND_URL}${post.heroImageUrl}`
            : undefined,
          data: { url: absolutePostUrl },
          tag: `test-post-${post.documentId}`,
          renotify: false,
        };

        return this.sendToUser(testUserId, testPayload);
      }

      console.log("Sending new post notifications for post:", post.titel);

      // Get matching users
      const matches = await this.getMatchingUsersForPost(post);

      console.log(`Matched ${matches.length} users for post ${post.titel}`);

      // Send notifications to each matched user
      for (const match of matches) {
        const payload = {
          title: "Neuer Beitrag der dir gefallen könnte",
          body: post.titel,
          icon: `${FRONTEND_URL}/icons/icon-192.png`,
          badge: `${FRONTEND_URL}/icons/badge.png`,
          image: post.heroImageUrl
            ? `${FRONTEND_URL}${post.heroImageUrl}`
            : undefined,
          data: { url: absolutePostUrl },
          tag: `post-${post.documentId}`,
          renotify: false,
        };

        try {
          await this.sendToUser(match.userId, payload);
        } catch (err) {
          strapi.log.error(
            `Failed to send new-post notification to user ${match.userId}:`,
            err,
          );
        }
      }
    },

    /**
     * (Optional) Send reminder notifications for an event post.
     * Send a reminder for an event starting approximately 24 hours from now.
     */
    async sendReminderNotification(post, userId) {
      const eventDate = post.eventDate ? new Date(post.eventDate) : null;
      const dateText = eventDate ? eventDate.toLocaleDateString("de-DE") : "";

      const postPath = `/post/${post.documentId}`;
      const absolutePostUrl = `${FRONTEND_URL}${postPath}`;

      const payload = {
        title: `Erinnerung - ${post.titel}`,
        body: eventDate ? `${dateText} — morgen` : `Erinnerung: ${post.titel}`,
        icon: `${FRONTEND_URL}/icons/icon-192.png`,
        badge: `${FRONTEND_URL}/icons/badge.png`,
        data: { url: absolutePostUrl },
        tag: `reminder-${post.documentId}`,
        renotify: true,
      };

      return this.sendToUser(userId, payload);
    },

    /**
     * Determine which users should receive a notification for a post.
     * Returns an array of { userId, userName, profileId }.
     */
    async getMatchingUsersForPost(post) {
      const userProfiles = await strapi
        .documents("api::user-profile.user-profile")
        .findMany({
          filters: { pushNotificationsEnabled: true },
          populate: [
            "user",
            "kategories",

            "kinder",
            "kinder.favoriteCategories",
          ],
        });

      const postCategories = post.kategories || [];
      const postMinAge = post.minAge;
      const postMaxAge = post.maxAge;

      const matches = [];

      for (const profile of userProfiles) {
        const userCategories = profile.kategories || [];
        const hasUserCategories = userCategories.length > 0;
        const hasUserAge = profile.minAge != null && profile.maxAge != null;
        const hasUserPreferences = hasUserCategories || hasUserAge;
        const categoryMatch =
          hasUserCategories &&
          categoriesOverlap(userCategories, postCategories);
        const ageMatch =
          hasUserAge &&
          ageRangeOverlaps(
            profile.minAge,
            profile.maxAge,
            postMinAge,
            postMaxAge,
          );

        const userMatches = !hasUserPreferences || categoryMatch || ageMatch;
        const kidMatches = (profile.kinder || []).some((kid) => {
          const kidCategories = kid.favoriteCategories || [];
          const hasKidCategories = kidCategories.length > 0;
          const hasKidAge =
            kid.alter != null && Number.isFinite(Number(kid.alter));
          if (!hasKidCategories && !hasKidAge) return true;

          const kidAgeMatch =
            !hasKidAge ||
            ageRangeOverlaps(kid.alter, kid.alter, postMinAge, postMaxAge);
          const kidCategoryMatch =
            !hasKidCategories ||
            categoriesOverlap(kidCategories, postCategories);
          return kidAgeMatch && kidCategoryMatch;
        });

        if ((userMatches || kidMatches) && profile.user?.id) {
          matches.push({
            userId: profile.user.id,
            userName: profile.user.username,
            profileId: profile.documentId,
          });
        }
      }

      return matches;
    },
  };
};
