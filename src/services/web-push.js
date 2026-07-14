"use strict";

let webPushLib = null;
let initialized = false;

function getWebPushModule() {
  if (webPushLib) return webPushLib;
  try {
    webPushLib = require("web-push");
    return webPushLib;
  } catch (err) {
    strapi.log.warn("web-push module not installed; Web Push disabled");
    return null;
  }
}

function hasVapidConfig() {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT
  );
}

function init() {
  if (initialized) return { ok: true, webPush: webPushLib };

  const webPush = getWebPushModule();
  if (!webPush) return { ok: false, reason: "module_missing" };

  if (!hasVapidConfig()) {
    strapi.log.warn("Missing VAPID env vars");
    return { ok: false, reason: "credentials_missing" };
  }

  try {
    webPush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    initialized = true;
    strapi.log.info("Web Push initialized");
    return { ok: true, webPush };
  } catch (err) {
    strapi.log.error("Web Push initialization failed:", err);
    return { ok: false, reason: "init_failed", error: err };
  }
}

async function sendToSubscriptions(subscriptions = [], payload = {}) {
  if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
    return { successCount: 0, failureCount: 0, invalidEndpoints: [] };
  }

  const boot = init();
  if (!boot.ok) {
    return { error: boot.reason, details: boot.error || null };
  }

  const webPush = boot.webPush;
  const notificationPayload = JSON.stringify(payload);

  const invalidEndpoints = [];
  let successCount = 0;
  let failureCount = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webPush.sendNotification(pushSub, notificationPayload);
        successCount += 1;
      } catch (err) {
        failureCount += 1;

        if ([404, 410].includes(err?.statusCode)) {
          invalidEndpoints.push(sub.endpoint);
        }

        strapi.log.warn(
          "Web Push send failed:",
          sub.endpoint,
          err?.statusCode || err?.code || err.message
        );
      }
    })
  );

  return { successCount, failureCount, invalidEndpoints };
}

module.exports = {
  init,
  sendToSubscriptions,
};
