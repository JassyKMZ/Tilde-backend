const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController(
  "api::feedback.feedback",
  ({ strapi }) => ({
    async create(ctx) {
      const { name, nachricht, kategorie } = ctx.request.body.data || {};

      // Nur erlaubte Felder weitergeben
      ctx.request.body.data = { name, nachricht, kategorie };

      // Standard create aufrufen
      const response = await super.create(ctx);

      // No name or message text in the log, they can contain personal data.
      strapi.log.info(`Feedback gespeichert: Kategorie=${kategorie || "-"}`);

      // Sent here rather than in a lifecycle, so entries created in the admin send no mail.
      await strapi
        .service("api::feedback.feedback")
        .sendMail(ctx.request.body.data);

      return response;
    },
  }),
);
