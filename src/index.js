"use strict";

const cron = require("node-cron");

module.exports = {
  register({ strapi }) {},
  async bootstrap({ strapi }) {
    // Override email service to always use correct FROM address
    const emailService = strapi.plugin("email").service("email");
    const originalSend = emailService.send.bind(emailService);

    emailService.send = async function (options) {
      // Replace any "no-reply" sender with the authenticated SMTP user
      const correctedOptions = {
        ...options,
        from: process.env.SMTP_FROM || process.env.SMTP_USERNAME,
      };

      strapi.log.info(
        `[Email Override] Sending email FROM: ${correctedOptions.from} TO: ${correctedOptions.to}`,
      );

      try {
        return await originalSend(correctedOptions);
      } catch (error) {
        strapi.log.error("[Email Override] Send failed:", error);
        throw error;
      }
    };

    strapi.log.info("[Bootstrap] Email service override complete");

    // Delete user profile when user is deleted
    strapi.db.lifecycles.subscribe({
      models: ["plugin::users-permissions.user"],
      async beforeDelete(event) {
        if (event.params.where && event.params.where.id) {
          const user = await strapi.db
            .query("plugin::users-permissions.user")
            .findOne({
              where: { id: event.params.where.id },
              populate: { user_profile: true },
            });
          if (user && user.user_profile && user.user_profile.id) {
            event.params.dataToDeleteProfile = user.user_profile.id;
          }
        }
      },
      async afterDelete(event) {
        if (event.params.dataToDeleteProfile) {
          try {
            await strapi.db.query("api::user-profile.user-profile").delete({
              where: { id: event.params.dataToDeleteProfile },
            });
            strapi.log.info(
              `Cascade: deleted associated user profile with id ${event.params.dataToDeleteProfile}`,
            );
          } catch (error) {
            strapi.log.error(
              "Error during cascade deletion of associated user profile:",
              error,
            );
          }
        }
      },
    });

    // Schedule daily job to unpublish events older than 14 days
    // Runs every day at 2:00 AM (02:00 UTC)
    cron.schedule("0 2 * * *", async () => {
      try {
        strapi.log.info(
          "[Cron] Starting daily job to archive events older than 14 days",
        );

        const now = new Date();
        const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
        const cutoffDate = new Date(now.getTime() - twoWeeksMs);

        // Find all published events where eventDate is older than 14 days
        const expiredPosts = await strapi.db.query("api::post.post").findMany({
          where: {
            isEvent: true,
            eventDate: {
              $lt: cutoffDate, // eventDate is before cutoff
            },
            publishedAt: {
              $notNull: true, // only published posts
            },
          },
          select: ["id", "documentId", "titel", "eventDate"],
        });

        if (expiredPosts.length === 0) {
          strapi.log.info("[Cron] No expired events found to archive");
          return;
        }

        strapi.log.info(
          `[Cron] Found ${expiredPosts.length} expired events to unpublish`,
        );

        // Unpublish each expired event
        for (const post of expiredPosts) {
          try {
            await strapi.db.query("api::post.post").update({
              where: { id: post.id },
              data: {
                publishedAt: null, // Unpublish
              },
            });

            strapi.log.debug(
              `[Cron] Unpublished expired event: ${post.titel} (ID: ${post.documentId})`,
            );
          } catch (error) {
            strapi.log.error(
              `[Cron] Failed to unpublish event ${post.documentId}:`,
              error,
            );
          }
        }

        strapi.log.info(
          `[Cron] Daily archive job completed: ${expiredPosts.length} events unpublished`,
        );
      } catch (error) {
        strapi.log.error("[Cron] Error in daily archive job:", error);
      }
    });

    strapi.log.info(
      "[Bootstrap] Daily event archival cron job scheduled (runs daily at 2:00 AM UTC)",
    );

    // Prune stale FCM tokens daily at 03:30 UTC
    cron.schedule("30 3 * * *", async () => {
      try {
        const PRUNE_DAYS = Number(process.env.FCM_PRUNE_DAYS || 180);
        const cutoff = new Date(
          Date.now() - PRUNE_DAYS * 24 * 60 * 60 * 1000,
        ).toISOString();

        strapi.log.info(
          `[Cron] Pruning FCM tokens not seen since ${cutoff} (threshold ${PRUNE_DAYS} days)`,
        );

        // Prefer lastSeen field if you added it; otherwise use updatedAt
        const staleTokens = await strapi.entityService.findMany(
          "api::fcm-token.fcm-token",
          {
            filters: {
              $or: [
                { lastSeen: { $lt: cutoff } },
                { lastSeen: null, updatedAt: { $lt: cutoff } },
              ],
            },
            limit: 1000,
            select: ["id", "token", "lastSeen", "updatedAt"],
          },
        );

        if (!staleTokens || staleTokens.length === 0) {
          strapi.log.info("[Cron] No stale FCM tokens found to prune");
          return;
        }

        strapi.log.info(
          `[Cron] Found ${staleTokens.length} stale FCM tokens to prune`,
        );

        // Delete in small batches to avoid DB pressure
        for (const t of staleTokens) {
          try {
            await strapi.entityService.delete("api::fcm-token.fcm-token", t.id);
            strapi.log.info(`[Cron] Pruned FCM token id=${t.id}`);
          } catch (err) {
            strapi.log.warn("[Cron] Failed to delete FCM token", t.id, err);
          }
        }

        strapi.log.info("[Cron] FCM token prune job completed");
      } catch (err) {
        strapi.log.error("[Cron] Error in FCM token prune job:", err);
      }
    });
  },
};
