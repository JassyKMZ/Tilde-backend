"use strict";

console.log("🔧 Notification service loaded");

module.exports = ({ strapi }) => {
  // Base URL used for notification links (service worker can open relative or absolute)
  const PUSH_FRONTEND_URL = (
    process.env.PUSH_FRONTEND_URL || "https://tilde-app.de"
  ).replace(/\/$/, "");

  /**
   * Normalize a relative path into an absolute URL for notifications.
   * If payload.data.url is already absolute, keep it.
   */
  function makeAbsoluteUrl(path) {
    if (!path) return PUSH_FRONTEND_URL;
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    // ensure leading slash
    const p = path.startsWith("/") ? path : `/${path}`;
    return `${PUSH_FRONTEND_URL}${p}`;
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
      payload.data.url = PUSH_FRONTEND_URL;
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
    const normalizeAge = (value) => {
      if (value == null || value === "") return null;
      const number = Number(value);
      if (!Number.isFinite(number)) return null;
      return Math.max(0, Math.min(19, Math.trunc(number)));
    };
    const minA = normalizeAge(firstMin) ?? 0;
    const maxA = normalizeAge(firstMax) ?? 19;
    const minB = normalizeAge(secondMin) ?? 0;
    const maxB = normalizeAge(secondMax) ?? 19;
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

      // Keep the standard fields at the root for older service workers.
      const webpushPayload = {
        web_push: 8030,
        notification: {
          title: payload.title,
          body: payload.body,
          navigate: payload.data.url,
          silent: false,
          ...(payload.icon ? { icon: payload.icon } : {}),
          ...(payload.badge ? { badge: payload.badge } : {}),
          ...(payload.image ? { image: payload.image } : {}),
          ...(payload.data ? { data: payload.data } : {}),
          ...(payload.tag ? { tag: payload.tag } : {}),
          ...(payload.renotify ? { renotify: true } : {}),
        },
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
      const postPath = `/beitrag/${post.documentId}`;
      const absolutePostUrl = `${PUSH_FRONTEND_URL}${postPath}`;

      // Test mode: send only to one user with a clear test payload
      if (testUserId) {
        const testPayload = {
          title: "Test: Neuer Beitrag",
          body: `Test für Post: ${post.titel}`,
          icon: `${PUSH_FRONTEND_URL}/icons/icon-192.png`,
          badge: `${PUSH_FRONTEND_URL}/icons/badge.png`,
          image: post.heroImageUrl
            ? `${PUSH_FRONTEND_URL}${post.heroImageUrl}`
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
      const previouslyDelivered = new Set(
        (options.deliveredUserIds || []).map(String),
      );
      const pendingMatches = matches.filter(
        (match) => !previouslyDelivered.has(String(match.userId)),
      );

      console.log(
        `Matched ${pendingMatches.length} pending users for post ${post.titel}`,
      );

      // Send notifications to each matched user
      let deliveredUsers = 0;
      let failedUsers = 0;
      const deliveredUserIds = [];
      for (const match of pendingMatches) {
        const matchedTypes = Array.isArray(match.matchTypes)
          ? match.matchTypes
          : [];
        const hasUserMatch = matchedTypes.includes("user");
        const hasKidMatch = matchedTypes.includes("kid");
        const matchType =
          hasUserMatch && hasKidMatch ? "both" : hasKidMatch ? "kid" : "user";

        const payload = {
          title:
            matchType === "both"
              ? "Neuer Beitrag für dich und deine Kinder"
              : matchType === "kid"
                ? "Neuer Beitrag für deine Kinder"
                : "Neuer Beitrag für dich",
          body:
            matchType === "both"
              ? `${post.titel} passt zu dir und deinen Kindern.`
              : matchType === "kid"
                ? `${post.titel} passt zu deinen Kinderprofilen.`
                : post.titel,
          icon: `${PUSH_FRONTEND_URL}/icons/icon-192.png`,
          badge: `${PUSH_FRONTEND_URL}/icons/badge.png`,
          image: post.heroImageUrl
            ? `${PUSH_FRONTEND_URL}${post.heroImageUrl}`
            : undefined,
          data: {
            url: absolutePostUrl,
            matchType,
            matchTypes: matchedTypes,
          },
          tag: `post-${post.documentId}`,
          renotify: false,
        };

        try {
          const result = await this.sendToUser(match.userId, payload);
          const delivered =
            Number(result?.fcm?.successCount || 0) > 0 ||
            Number(result?.webpush?.successCount || 0) > 0;
          if (delivered) {
            deliveredUsers += 1;
            deliveredUserIds.push(match.userId);
          } else {
            failedUsers += 1;
          }
        } catch (err) {
          failedUsers += 1;
          strapi.log.error(
            `Failed to send new-post notification to user ${match.userId}:`,
            err,
          );
        }
      }

      return {
        matchedUsers: pendingMatches.length,
        deliveredUsers,
        failedUsers,
        deliveredUserIds,
      };
    },

    /**
     * (Optional) Send reminder notifications for an event post.
     * Send a reminder for an event starting approximately 24 hours from now.
     */
    async sendReminderNotification(post, userId) {
      const eventDate = post.eventDate ? new Date(post.eventDate) : null;
      const dateText = eventDate ? eventDate.toLocaleDateString("de-DE") : "";

      const postPath = `/beitrag/${post.documentId}`;
      const absolutePostUrl = `${PUSH_FRONTEND_URL}${postPath}`;

      const payload = {
        title: `Erinnerung - ${post.titel}`,
        body: eventDate ? `${dateText} — morgen` : `Erinnerung: ${post.titel}`,
        icon: `${PUSH_FRONTEND_URL}/icons/icon-192.png`,
        badge: `${PUSH_FRONTEND_URL}/icons/badge.png`,
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
        const hasUserAge = profile.minAge != null || profile.maxAge != null;
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

        const userMatch = !hasUserPreferences || categoryMatch || ageMatch;
        const kidMatch = (profile.kinder || []).some((kid) => {
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

        const matchedTypes = [];
        if (userMatch) matchedTypes.push("user");
        if (kidMatch) matchedTypes.push("kid");

        if (matchedTypes.length && profile.user?.id) {
          matches.push({
            userId: profile.user.id,
            userName: profile.user.username,
            profileId: profile.documentId,
            matchTypes: matchedTypes,
          });
        }
      }

      return matches;
    },
  };
};
