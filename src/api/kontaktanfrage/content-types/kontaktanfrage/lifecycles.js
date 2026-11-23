const { ValidationError } = require("@strapi/utils").errors;

const HTML_PATTERN = /<[^>]*>/;

// Upper length limits per field; keeps spam and accidental pastes out of the admin.
const MAX_LENGTH = {
  anliegen: 100,
  name: 100,
  institution: 150,
  telefon: 40,
  nachricht: 2000,
};

module.exports = {
  async beforeCreate(event) {
    const { data } = event.params;

    if (!data.name || data.name.trim().length < 2) {
      throw new ValidationError("Bitte gib deinen Namen an.");
    }
    if (!data.email) {
      throw new ValidationError("Bitte gib eine E-Mail-Adresse an.");
    }
    if (!data.nachricht || data.nachricht.trim().length < 5) {
      throw new ValidationError("Nachricht zu kurz.");
    }

    for (const [field, max] of Object.entries(MAX_LENGTH)) {
      const value = data[field];
      if (!value) continue;
      if (value.length > max) {
        throw new ValidationError(`Eingabe im Feld „${field}“ ist zu lang.`);
      }
      if (HTML_PATTERN.test(value)) {
        throw new ValidationError("HTML nicht erlaubt.");
      }
      // Single-line fields end up in mail subjects, so no line breaks there.
      if (field !== "nachricht" && /[\r\n]/.test(value)) {
        throw new ValidationError(`Ungültige Eingabe im Feld „${field}“.`);
      }
    }
  },
};
