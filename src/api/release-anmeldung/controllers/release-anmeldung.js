const { createCoreController } = require("@strapi/strapi").factories;
const { ValidationError } = require("@strapi/utils").errors;

const UID = "api::release-anmeldung.release-anmeldung";
const CONTACT_INBOX = process.env.KONTAKT_EMAIL || "info@tilde-app.de";

function clean(value) {
  return typeof value === "string" ? value.trim() : value;
}

module.exports = createCoreController(UID, ({ strapi }) => ({
  async create(ctx) {
    const { name, institution, email, personen, anmerkung } =
      ctx.request.body.data || {};

    // Only pass on the fields the form is allowed to set ("abgesagt" stays admin-only).
    const data = {
      name: clean(name) || null,
      institution: clean(institution) || null,
      email: clean(email)?.toLowerCase(),
      personen: Number(personen) || 1,
      anmerkung: clean(anmerkung) || null,
    };

    // One registration per address, so nobody is counted twice. Changes go by mail.
    if (data.email) {
      const existing = await strapi
        .documents(UID)
        .findFirst({ filters: { email: { $eqi: data.email } } });
      if (existing) {
        throw new ValidationError(
          `Mit dieser E-Mail-Adresse besteht bereits eine Anmeldung. Für Änderungen schreiben Sie uns bitte an ${CONTACT_INBOX}.`,
        );
      }
    }

    ctx.request.body.data = data;
    const response = await super.create(ctx);

    // No names or addresses in the log, they are personal data.
    strapi.log.info(`Release-Anmeldung gespeichert: Personen=${data.personen}`);

    const { confirmationSent } = await strapi
      .service(UID)
      .sendConfirmation(data);

    // Only report success; the registration's data never goes back to the browser.
    return {
      data: { documentId: response?.data?.documentId, confirmationSent },
    };
  },
}));
