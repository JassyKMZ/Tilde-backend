const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController(
  "api::kontaktanfrage.kontaktanfrage",
  ({ strapi }) => ({
    async create(ctx) {
      const { anliegen, name, email, institution, telefon, nachricht } =
        ctx.request.body.data || {};

      // Only pass on the fields the form is allowed to set ("erledigt" stays admin-only).
      ctx.request.body.data = {
        anliegen,
        name,
        email,
        institution,
        telefon,
        nachricht,
      };

      const response = await super.create(ctx);

      // No message text or contact details in the log, they are personal data.
      strapi.log.info(`Kontaktanfrage gespeichert: Anliegen=${anliegen}`);

      // Sent here rather than in a lifecycle, so entries created in the admin send no mails.
      // Uses the values that passed validation in the lifecycle's beforeCreate.
      const { confirmationSent } = await strapi
        .service("api::kontaktanfrage.kontaktanfrage")
        .sendMails(ctx.request.body.data);

      // Only report success; the request's data never goes back to the browser.
      return {
        data: { documentId: response?.data?.documentId, confirmationSent },
      };
    },
  }),
);
