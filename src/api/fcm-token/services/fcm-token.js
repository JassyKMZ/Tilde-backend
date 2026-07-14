"use strict";

const { createCoreService } = require("@strapi/strapi").factories;

module.exports = createCoreService(
  "api::fcm-token.fcm-token",
  ({ strapi }) => ({
    async upsert(token, meta = {}) {
      if (!token) throw new Error("token required for upsert");
      const normalized = String(token).trim();

      const found = await strapi
        .documents("api::fcm-token.fcm-token")
        .findMany({
          filters: { token: normalized },
          limit: 1,
        });

      if (found && found.length > 0) {
        const entry = found[0];
        const data = {};
        if (meta.guestId) data.guestId = meta.guestId;
        if (meta.platform) data.platform = meta.platform;
        if (meta.user) data.user = meta.user;

        const updated = await strapi
          .documents("api::fcm-token.fcm-token")
          .update(entry.documentId, { data });
        return updated;
      }

      const createData = {
        token: normalized,
        ...(meta.guestId ? { guestId: meta.guestId } : {}),
        ...(meta.platform ? { platform: meta.platform } : {}),
        ...(meta.user ? { user: meta.user } : {}),
      };

      return await strapi
        .documents("api::fcm-token.fcm-token")
        .create({ data: createData });
    },

    async deleteByToken(token) {
      if (!token) return null;
      const normalized = String(token).trim();

      const found = await strapi
        .documents("api::fcm-token.fcm-token")
        .findMany({
          filters: { token: normalized },
          limit: 1,
        });

      if (!found || found.length === 0) return null;

      const entry = found[0];

      await strapi
        .documents("api::fcm-token.fcm-token")
        .delete(entry.documentId);

      return entry;
    },

    async findTokens({ filters = {}, limit = 1000 } = {}) {
      const rows = await strapi.documents("api::fcm-token.fcm-token").findMany({
        filters,
        limit,
        fields: ["token"],
      });

      return rows
        .map((r) => (r.token ? String(r.token).trim() : null))
        .filter(Boolean);
    },

    async findAll({ filters = {}, start = 0, limit = 50 } = {}) {
      return await strapi.entityService.findMany("api::fcm-token.fcm-token", {
        filters,
        start,
        limit,
      });
    },

    /* -------------------------------------------------------
     * NEW: Find all FCM tokens for a specific user
     * ----------------------------------------------------- */
    async findByUser(userId) {
      if (!userId) return [];

      return await strapi.documents("api::fcm-token.fcm-token").findMany({
        filters: { user: userId },
        fields: ["token"],
        limit: 200,
      });
    },

    /* -------------------------------------------------------
     * NEW: Send a push notification to multiple FCM tokens
     * ----------------------------------------------------- */
    async sendToTokens(tokens, payload) {
      if (!tokens || tokens.length === 0) {
        return { successCount: 0, failureCount: 0 };
      }

      const registrationTokens = tokens.map((t) => t.token).filter(Boolean);

      if (registrationTokens.length === 0) {
        return { successCount: 0, failureCount: 0 };
      }

      try {
        const firebaseService = require("../../../services/firebase");
        const response = await firebaseService.sendToTokens(
          registrationTokens,
          {
            data: payload.data || {},
            notification: payload.notification,
          }
        );
        return response;
      } catch (err) {
        strapi.log.error("FCM send failed:", err);
        return { error: err.message };
      }
    },
  })
);
