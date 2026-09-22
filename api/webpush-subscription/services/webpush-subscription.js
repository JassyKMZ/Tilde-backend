"use strict";

const { createCoreService } = require("@strapi/strapi").factories;

module.exports = createCoreService(
  "api::webpush-subscription.webpush-subscription",
  ({ strapi }) => ({
    async upsert(endpoint, meta = {}) {
      if (!endpoint) throw new Error("endpoint required for upsert");
      const normalized = String(endpoint).trim();

      const found = await strapi
        .documents("api::webpush-subscription.webpush-subscription")
        .findMany({
          filters: { endpoint: normalized },
          limit: 1,
        });

      if (found && found.length > 0) {
        const entry = found[0];
        const data = {};

        if (meta.p256dh) data.p256dh = meta.p256dh;
        if (meta.auth) data.auth = meta.auth;
        if (meta.browser) data.browser = meta.browser;
        if (meta.userAgent) data.userAgent = meta.userAgent;
        if (meta.user) data.user = meta.user;

        const updated = await strapi
          .documents("api::webpush-subscription.webpush-subscription")
          .update(entry.documentId, { data });
        return updated;
      }

      const createData = {
        endpoint: normalized,
        ...(meta.p256dh ? { p256dh: meta.p256dh } : {}),
        ...(meta.auth ? { auth: meta.auth } : {}),
        ...(meta.browser ? { browser: meta.browser } : {}),
        ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
        ...(meta.user ? { user: meta.user } : {}),
      };

      const created = await strapi
        .documents("api::webpush-subscription.webpush-subscription")
        .create({ data: createData });

      return created;
    },

    async deleteByEndpoint(endpoint) {
      if (!endpoint) return null;
      const normalized = String(endpoint).trim();

      const found = await strapi
        .documents("api::webpush-subscription.webpush-subscription")
        .findMany({
          filters: { endpoint: normalized },
          limit: 1,
        });
      if (!found || found.length === 0) return null;

      const entry = found[0];

      await strapi
        .documents("api::webpush-subscription.webpush-subscription")
        .delete(entry.documentId);

      return entry;
    },

    async findByUser(userId, { limit = 100 } = {}) {
      if (!userId) return [];
      return await strapi
        .documents("api::webpush-subscription.webpush-subscription")
        .findMany({
          filters: { user: userId },
          limit,
        });
    },
  })
);
