"use strict";

/**
 * fcm-token service
 * - upsert(token, meta)
 * - deleteByToken(token)
 * - findTokens({ filters, limit })
 * - findAll({ filters, start, limit })
 */

const { createCoreService } = require("@strapi/strapi").factories;

module.exports = createCoreService(
  "api::fcm-token.fcm-token",
  ({ strapi }) => ({
    async upsert(token, meta = {}) {
      if (!token) throw new Error("token required for upsert");
      const normalized = String(token).trim();

      const found = await strapi.entityService.findMany(
        "api::fcm-token.fcm-token",
        {
          filters: { token: normalized },
          limit: 1,
        }
      );

      if (found && found.length > 0) {
        const entry = found[0];
        const data = {};
        if (meta.guestId) data.guestId = meta.guestId;
        if (meta.platform) data.platform = meta.platform;
        if (meta.user) data.user = meta.user;

        const updated = await strapi.entityService.update(
          "api::fcm-token.fcm-token",
          entry.id,
          {
            data,
          }
        );
        return updated;
      }

      const createData = {
        token: normalized,
        ...(meta.guestId ? { guestId: meta.guestId } : {}),
        ...(meta.platform ? { platform: meta.platform } : {}),
        ...(meta.user ? { user: meta.user } : {}),
      };

      const created = await strapi.entityService.create(
        "api::fcm-token.fcm-token",
        {
          data: createData,
        }
      );

      return created;
    },

    async deleteByToken(token) {
      if (!token) return null;
      const normalized = String(token).trim();
      const found = await strapi.entityService.findMany(
        "api::fcm-token.fcm-token",
        {
          filters: { token: normalized },
          limit: 1,
        }
      );
      if (!found || found.length === 0) return null;
      const entry = found[0];
      await strapi.entityService.delete("api::fcm-token.fcm-token", entry.id);
      return entry;
    },

    async findTokens({ filters = {}, limit = 1000 } = {}) {
      const rows = await strapi.entityService.findMany(
        "api::fcm-token.fcm-token",
        {
          filters,
          limit,
          fields: ["token"],
        }
      );
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
  })
);
