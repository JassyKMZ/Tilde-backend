"use strict";

/**
 * Safe Firebase service for Strapi v5
 * - lazy requires firebase-admin so Strapi can boot without firebase-admin or missing envs
 * - does not throw at import time; returns meaningful errors from functions
 * - logs via strapi.log
 */

let adminSdk = null;
let initialized = false;

function getAdminModule() {
  if (adminSdk) return adminSdk;
  try {
    adminSdk = require("firebase-admin");
    return adminSdk;
  } catch (err) {
    strapi?.log?.warn?.(
      "firebase-admin module not installed; Firebase features disabled"
    );
    return null;
  }
}

function hasCredentials() {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
  );
}

function init() {
  if (initialized) return { ok: true, admin: adminSdk };
  const admin = getAdminModule();
  if (!admin) return { ok: false, reason: "module_missing" };

  if (!hasCredentials()) {
    strapi?.log?.warn?.(
      "Firebase credentials missing in env; skipping initialization"
    );
    return { ok: false, reason: "credentials_missing" };
  }

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || "";

    // handle escaped newlines stored in .env
    privateKey = privateKey.replace(/\\n/g, "\n");

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });

    initialized = true;
    adminSdk = admin;
    strapi.firebase = admin; // Make it available as strapi.firebase
    strapi?.log?.info?.(`Firebase Admin initialized for project: ${projectId}`);
    return { ok: true, admin: adminSdk };
  } catch (err) {
    strapi?.log?.error?.("Firebase admin initialization failed:", err);
    return { ok: false, reason: "init_failed", error: err };
  }
}

/**
 * sendToTokens(tokens, { data, url })
 * - returns object with successCount, failureCount, invalidTokens, raw when successful
 * - when firebase-admin missing/credentials missing returns { error: '...' }
 */
async function sendToTokens(
  tokens = [],
  { data = {}, notification, url = "/" } = {}
) {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return { successCount: 0, failureCount: 0, invalidTokens: [] };
  }

  const boot = init();
  if (!boot.ok) {
    return {
      error: boot.reason || "firebase_not_initialized",
      details: boot.error || null,
    };
  }

  const admin = boot.admin;
  const messaging = admin.messaging();
  if (!messaging || typeof messaging.sendEach !== "function") {
    return { error: "sendEach_not_available" };
  }
  try {
    const stringifiedData = {};
    Object.keys(data || {}).forEach((k) => {
      stringifiedData[k] = String(data[k]);
    });

    const messages = tokens.map((token) => ({
      token,
      data: stringifiedData,
      webpush: {
        fcmOptions: { link: data.url || "/" },
      },
      ...(notification ? { notification } : {}),
    }));

    const res = await admin.messaging().sendEach(messages);

    const invalidTokens = [];
    res.responses.forEach((r, idx) => {
      if (!r.success) {
        const err = r.error || {};
        if (
          [
            "messaging/registration-token-not-registered",
            "messaging/invalid-registration-token",
          ].includes(err.code)
        ) {
          invalidTokens.push(tokens[idx]);
        }
      }
    });

    return {
      successCount: res.successCount,
      failureCount: res.failureCount,
      invalidTokens,
      raw: res,
    };
  } catch (err) {
    strapi?.log?.error?.("Firebase sendEach error:", err);
    return { error: "send_failed", details: err };
  }
}

module.exports = {
  init,
  sendToTokens,
};
