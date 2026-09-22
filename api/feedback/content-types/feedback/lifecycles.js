const { ValidationError } = require("@strapi/utils").errors;

module.exports = {
  async beforeCreate(event) {
    const { data } = event.params;

    strapi.log.info(`Feedback Lifecycle Daten: ${JSON.stringify(data)}`);

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

  // async afterCreate(event) {
  //   const { result } = event;

  //   const category = result.kategorie || "";
  //   const message = result.nachricht || "(kein Text)";
  //   const sender = result.name ? `Von: ${result.name}\n\n` : "";

  //   // Debug: Gespeicherte Daten loggen
  //   strapi.log.info(
  //     `Feedback gespeichert: Kategorie=${category}, Name=${result.name || "-"}, Nachricht=${message}`
  //   );

  // try {
  //   await strapi
  //     .plugin("email")
  //     .service("email")
  //     .send({
  //       to: "feedback@tilde-app.de",
  //       subject: `Neues Feedback: ${category}`,
  //       text: `${sender}${message}`,
  //     });
  //   strapi.log.info("Feedback-Mail erfolgreich gesendet.");
  // } catch (err) {
  //   strapi.log.error("Feedback-Mail konnte nicht gesendet werden:", err);
  // }
  // },
};
