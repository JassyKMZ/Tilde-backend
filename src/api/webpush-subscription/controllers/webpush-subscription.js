"use strict";

const { sanitize } = require("@strapi/utils");

async function safeOutput(entity, modelUid) {
  if (!entity) return entity;
  try {
    if (
      sanitize &&
      sanitize.contentAPI &&
      typeof sanitize.contentAPI.output === "function"
    ) {
      return await sanitize.contentAPI.output(
        entity,
        strapi.getModel(modelUid)
      );
    }
  } catch (err) {
    strapi.log.warn(
      "sanitize.contentAPI.output failed for webpush-subscription, returning raw entity",
      err
    );
  }
  return entity;
}

/**
 * The routes use `auth: false`, which makes Strapi skip JWT parsing entirely,
 * so ctx.state.user is never set. Resolve the user from the Bearer token here.
 */
async function resolveUserId(ctx) {
  if (ctx.state.user?.id) return ctx.state.user.id;
  try {
    const payload = await strapi
      .plugin("users-permissions")
      .service("jwt")
      .getToken(ctx);
    return payload?.id || null;
  } catch {
    return null;
  }
}

module.exports = {
  async create(ctx) {
    try {
      const payload = ctx.request.body?.data || {};
      const endpoint = payload.endpoint && String(payload.endpoint).trim();
      const p256dh = payload.p256dh && String(payload.p256dh).trim();
      const auth = payload.auth && String(payload.auth).trim();
      const browser = payload.browser && String(payload.browser).trim();
      const userAgent =
        ctx.request.headers["user-agent"] || payload.userAgent || null;

      if (!endpoint || !p256dh || !auth) {
        return ctx.badRequest("endpoint, p256dh and auth are required");
      }

      const userId = await resolveUserId(ctx);

      const record = await strapi
        .service("api::webpush-subscription.webpush-subscription")
        .upsert(endpoint, {
          p256dh,
          auth,
          browser,
          userAgent,
          user: userId,
        });

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

      const safe = await safeOutput(
        record,
        "api::webpush-subscription.webpush-subscription"
      );

      return ctx.created({ data: safe });
    } catch (err) {
      strapi.log.error("Failed to save WebPush subscription:", err);
      return ctx.internalServerError(
        err?.message || "Save WebPush subscription failed"
      );
    }
  },

  async delete(ctx) {
    try {
      const endpoint =
        ctx.request.body?.endpoint && String(ctx.request.body.endpoint).trim();
      if (!endpoint) return ctx.badRequest("endpoint is required");

      const deleted = await strapi
        .service("api::webpush-subscription.webpush-subscription")
        .deleteByEndpoint(endpoint);

      if (!deleted) return ctx.notFound();

      // Without any device left, exclude the user from new-post matching.
      const userId = deleted.user?.id;
      if (userId) {
        const [subscriptions, tokens] = await Promise.all([
          strapi
            .service("api::webpush-subscription.webpush-subscription")
            .findByUser(userId, { limit: 1 }),
          strapi.service("api::fcm-token.fcm-token").findByUser(userId),
        ]);
        if (!subscriptions.length && !tokens.length) {
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
                data: { pushNotificationsEnabled: false },
              }
            );
          }
        }
      }

      // Respond with the endpoint only: `deleted` has the populated user, and
      // safeOutput returns raw entities on Strapi 5 (no sanitize.contentAPI).
      return ctx.send({ data: { endpoint: deleted.endpoint } });
    } catch (err) {
      strapi.log.error("Failed to delete WebPush subscription:", err);
      return ctx.internalServerError("Delete WebPush subscription failed");
    }
  },
};
