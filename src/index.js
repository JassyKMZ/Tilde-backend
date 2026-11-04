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
            postType: "event",
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

    // Consent records prove a choice for the limitation period (3 years, § 195 BGB);
    // the privacy policy promises deletion afterwards. Runs daily at 2:30 AM UTC.
    const CONSENT_RETENTION_YEARS = 3;
    cron.schedule("30 2 * * *", async () => {
      try {
        const cutoff = new Date();
        cutoff.setFullYear(cutoff.getFullYear() - CONSENT_RETENTION_YEARS);
        const { count } = await strapi.db
          .query("api::cookie-consent.cookie-consent")
          .deleteMany({ where: { timestamp: { $lt: cutoff } } });
        if (count) {
          strapi.log.info(`[Cron] Deleted ${count} consent records older than 3 years`);
        }
      } catch (error) {
        strapi.log.error("[Cron] Error deleting old consent records:", error);
      }
    });

    // Registrations never confirmed by email are useless and often hold someone
    // else's address (typos, spam); the privacy policy promises deletion after
    // 30 days. Bulk deletes skip lifecycles, so linked records go first.
    // Runs daily at 2:45 AM UTC.
    const UNCONFIRMED_RETENTION_DAYS = 30;
    cron.schedule("45 2 * * *", async () => {
      try {
        const cutoff = new Date(
          Date.now() - UNCONFIRMED_RETENTION_DAYS * 24 * 60 * 60 * 1000,
        );
        const users = await strapi.db
          .query("plugin::users-permissions.user")
          .findMany({
            where: { confirmed: false, createdAt: { $lt: cutoff } },
            select: ["id"],
          });
        if (!users.length) return;

        const ids = users.map((u) => u.id);
        await strapi.db
          .query("api::webpush-subscription.webpush-subscription")
          .deleteMany({ where: { user: { id: { $in: ids } } } });
        await strapi.db
          .query("api::user-profile.user-profile")
          .deleteMany({ where: { user: { id: { $in: ids } } } });
        await strapi.db
          .query("plugin::users-permissions.user")
          .deleteMany({ where: { id: { $in: ids } } });

        strapi.log.info(
          `[Cron] Deleted ${ids.length} registrations unconfirmed for ${UNCONFIRMED_RETENTION_DAYS} days`,
        );
      } catch (error) {
        strapi.log.error("[Cron] Error deleting unconfirmed registrations:", error);
      }
    });
  },
};
