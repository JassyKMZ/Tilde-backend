"use strict";

let sanitize;
try {
  // attempt to load sanitize; if not available we'll fall back
  sanitize = require("@strapi/utils")?.sanitize;
} catch (e) {
  sanitize = null;
}

/**
 * Helper: produce a safe output using Strapi sanitize when available,
 * otherwise return the raw entity.
 */
async function safeOutput(entity, modelUid) {
  if (!entity) return entity;
  try {
    if (
      sanitize &&
      sanitize.contentAPI &&
      typeof sanitize.contentAPI.output === "function"
    ) {
      // eslint-disable-next-line
      return await sanitize.contentAPI.output(
        entity,
        strapi.getModel(modelUid)
      );
    }
  } catch (err) {
    strapi.log.warn(
      "sanitize.contentAPI.output failed, returning raw entity",
      err
    );
  }
  return entity;
}

module.exports = {
  /**
   * Create or update (upsert) an FCM token record.
   */
  async create(ctx) {
    try {
      const payload = ctx.request.body?.data || {};
      const token = payload.token && String(payload.token).trim();
      const guestId = payload.guestId && String(payload.guestId).trim();
      const platform = payload.platform && String(payload.platform).trim();

      if (!token) {
        return ctx.badRequest("token is required");
      }

      const userId = ctx.state.user?.id || null;

      const record = await strapi
        .service("api::fcm-token.fcm-token")
        .upsert(token, { guestId, platform, user: userId });

      // If user is authenticated, enable push notifications in user-profile
      if (userId) {
        const userProfiles = await strapi.entityService.findMany(
          "api::user-profile.user-profile",
          {
            filters: { user: userId },
            limit: 1,
          }
        );
        if (userProfiles.length > 0) {
          await strapi.entityService.update(
            "api::user-profile.user-profile",
            userProfiles[0].id,
            {
              data: { pushNotificationsEnabled: true },
            }
          );
        }
      }

      const safe = await safeOutput(record, "api::fcm-token.fcm-token");

      return ctx.created({ data: safe });
    } catch (err) {
      strapi.log.error("Failed to save FCM token:", err);
      return ctx.internalServerError(err?.message || "Save FCM token failed");
    }
  },

  /**
   * List tokens (with optional paging)
   */
  async find(ctx) {
    try {
      const results = await strapi.entityService.findMany(
        "api::fcm-token.fcm-token",
        {
          limit: ctx.query?.limit ? Number(ctx.query.limit) : 50,
          start: ctx.query?.start ? Number(ctx.query.start) : 0,
          filters: ctx.query?.filters || {},
          sort: ctx.query?.sort || ["createdAt:DESC"],
        }
      );

      const safe = await safeOutput(results, "api::fcm-token.fcm-token");

      return ctx.send({ data: safe });
    } catch (err) {
      strapi.log.error("Failed to list FCM tokens:", err);
      return ctx.internalServerError("List FCM tokens failed");
    }
  },

  /**
   * Get single token by id
   */
  async findOne(ctx) {
    try {
      const { id } = ctx.params;
      if (!id) return ctx.badRequest("id is required");

      const result = await strapi.entityService.findOne(
        "api::fcm-token.fcm-token",
        id
      );

      if (!result) return ctx.notFound();

      const safe = await safeOutput(result, "api::fcm-token.fcm-token");

      return ctx.send({ data: safe });
    } catch (err) {
      strapi.log.error("Failed to get FCM token:", err);
      return ctx.internalServerError("Get FCM token failed");
    }
  },

  /**
   * Update by id
   */
  async update(ctx) {
    try {
      const { id } = ctx.params;
      if (!id) return ctx.badRequest("id is required");

      const payload = ctx.request.body?.data || {};
      const updateData = {};
      if (payload.token) updateData.token = String(payload.token).trim();
      if (payload.guestId) updateData.guestId = String(payload.guestId).trim();
      if (payload.platform)
        updateData.platform = String(payload.platform).trim();

      const updated = await strapi.entityService.update(
        "api::fcm-token.fcm-token",
        id,
        {
          data: updateData,
        }
      );

      const safe = await safeOutput(updated, "api::fcm-token.fcm-token");

      return ctx.send({ data: safe });
    } catch (err) {
      strapi.log.error("Failed to update FCM token:", err);
      return ctx.internalServerError("Update FCM token failed");
    }
  },

  /**
   * Delete by id (handler required by Strapi default DELETE route)
   */
  async delete(ctx) {
    try {
      const { id } = ctx.params;
      if (!id) return ctx.badRequest("id is required");

      const deleted = await strapi.entityService.delete(
        "api::fcm-token.fcm-token",
        id
      );

      if (!deleted) return ctx.notFound();

      const safe = await safeOutput(deleted, "api::fcm-token.fcm-token");

      return ctx.send({ data: safe });
    } catch (err) {
      strapi.log.error("Failed to delete FCM token by id:", err);
      return ctx.internalServerError("Delete FCM token failed");
    }
  },

  /**
   * Delete by token string (admin/prune)
   * Accepts body { token: "<token>" }
   */
  async deleteByToken(ctx) {
    try {
      const token =
        ctx.request.body?.token && String(ctx.request.body.token).trim();
      if (!token) return ctx.badRequest("token is required");

      const deleted = await strapi
        .service("api::fcm-token.fcm-token")
        .deleteByToken(token);
      if (!deleted) return ctx.notFound();

      const safe = await safeOutput(deleted, "api::fcm-token.fcm-token");

      return ctx.send({ data: safe });
    } catch (err) {
      strapi.log.error("Failed to delete FCM token:", err);
      return ctx.internalServerError("Delete FCM token failed");
    }
  },
};
