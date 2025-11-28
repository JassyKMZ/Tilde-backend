const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController(
  "api::feedback.feedback",
  ({ strapi }) => ({
    async create(ctx) {
      const { name, nachricht, kategorie, website, captcha } =
        ctx.request.body.data;

      // 🕵️ Honeypot
      if (website) {
        return ctx.badRequest("Bot detected (honeypot field filled).");
      }

      // 🔢 Captcha
      if (!captcha || captcha.trim() !== "7") {
        return ctx.badRequest("Captcha falsch oder fehlt.");
      }

      // 🛡 Validation
      if (!nachricht || nachricht.length < 5) {
        return ctx.badRequest("Nachricht zu kurz.");
      }
      if (nachricht.length > 1000) {
        return ctx.badRequest("Nachricht zu lang.");
      }
      if (/<[^>]*>/g.test(nachricht)) {
        return ctx.badRequest("HTML nicht erlaubt.");
      }

      // Nur erlaubte Felder weitergeben
      const sanitizedData = { name, nachricht, kategorie };

      // Standard create aufrufen
      const response = await super.create({
        ...ctx,
        request: { body: { data: sanitizedData } },
      });

      // Debug-Log
      strapi.log.info(
        `Feedback gespeichert: Kategorie=${kategorie}, Name=${name || "-"}, Nachricht=${nachricht}`
      );

      return response;
    },
  })
);
