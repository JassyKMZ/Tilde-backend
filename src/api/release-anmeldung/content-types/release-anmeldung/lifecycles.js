const { ValidationError } = require("@strapi/utils").errors;

const HTML_PATTERN = /<[^>]*>/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PERSONS = 10;

// Upper length limits per field; keeps spam and accidental pastes out of the admin.
const MAX_LENGTH = {
  name: 100,
  institution: 150,
  email: 200,
  anmerkung: 500,
};

module.exports = {
  async beforeCreate(event) {
    const { data } = event.params;

    // Either a person's name or an institution is enough to know who is coming.
    const name = (data.name || "").trim();
    const institution = (data.institution || "").trim();
    if (name.length < 2 && institution.length < 2) {
      throw new ValidationError(
        "Bitte geben Sie Ihren Namen oder Ihre Institution an.",
      );
    }
    if (!data.email || !EMAIL_PATTERN.test(data.email)) {
      throw new ValidationError("Bitte geben Sie eine gültige E-Mail-Adresse an.");
    }

    const persons = Number(data.personen);
    if (!Number.isInteger(persons) || persons < 1 || persons > MAX_PERSONS) {
      throw new ValidationError(
        `Bitte geben Sie zwischen 1 und ${MAX_PERSONS} Personen an.`,
      );
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
      if (field !== "anmerkung" && /[\r\n]/.test(value)) {
        throw new ValidationError(`Ungültige Eingabe im Feld „${field}“.`);
      }
    }
  },
};
