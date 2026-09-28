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

      strapi.log.info(
        `Feedback gespeichert: Kategorie=${kategorie}, Name=${name || "-"}, Nachricht=${nachricht}`,
      );

      return response;
    },
  }),
);
