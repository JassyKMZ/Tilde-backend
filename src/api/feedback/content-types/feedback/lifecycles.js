const { ValidationError } = require("@strapi/utils").errors;

module.exports = {
  async beforeCreate(event) {
    const { data } = event.params;

    if (!data.nachricht || data.nachricht.length < 5) {
      throw new ValidationError("Nachricht zu kurz.");
    }
    if (data.nachricht.length > 1000) {
      throw new ValidationError("Nachricht zu lang.");
    }
    if (/<[^>]*>/g.test(data.nachricht)) {
      throw new ValidationError("HTML nicht erlaubt.");
    }
  },
};
