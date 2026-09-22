const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController(
  "api::feedback.feedback",
  ({ strapi }) => ({
    async create(ctx) {
      const { name, nachricht, kategorie, captcha, website } =
        ctx.request.body.data;

      // 🕵️ Honeypot
      if (website && website.trim() !== "") {
        return ctx.badRequest("Bot detected (honeypot field filled).");
      }

      // 🔢 Captcha
      if (!captcha || captcha.trim() !== "7") {
        return ctx.badRequest("Bitte das Captcha korrekt ausfüllen.");
      }

      // Nur erlaubte Felder weitergeben
      ctx.request.body.data = { name, nachricht, kategorie };

      // Standard create aufrufen
      const response = await super.create(ctx);

      strapi.log.info(
        `Feedback gespeichert: Kategorie=${kategorie}, Name=${name || "-"}, Nachricht=${nachricht}`
      );

      return response;
    },
  })
);
