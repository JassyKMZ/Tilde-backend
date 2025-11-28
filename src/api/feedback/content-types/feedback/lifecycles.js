module.exports = {
  async beforeCreate(event) {
    const { data } = event.params;

    // Debug: Eingehende Daten loggen
    strapi.log.info(`Feedback eingehend: ${JSON.stringify(data)}`);

    // 🕵️ Honeypot
    if (data.website) {
      strapi.log.warn("Honeypot ausgelöst: website-Feld ausgefüllt.");
      throw new Error("Bot detected (honeypot field filled).");
    }

    // 🔢 Captcha
    if (!data.captcha || data.captcha.trim() !== "7") {
      strapi.log.warn("Captcha fehlgeschlagen.");
      throw new Error("Captcha falsch oder fehlt.");
    }

    // 🛡 Validation für nachricht
    if (!data.nachricht || data.nachricht.length < 5) {
      strapi.log.warn("Nachricht zu kurz.");
      throw new Error("Nachricht zu kurz.");
    }
    if (data.nachricht.length > 1000) {
      strapi.log.warn("Nachricht zu lang.");
      throw new Error("Nachricht zu lang.");
    }
    if (/<[^>]*>/g.test(data.nachricht)) {
      strapi.log.warn("HTML in Nachricht erkannt.");
      throw new Error("HTML nicht erlaubt.");
    }

    // 🚮 Zusatzfelder entfernen
    delete data.website;
    delete data.captcha;

    // Debug: Daten nach Bereinigung
    strapi.log.info(`Feedback nach Bereinigung: ${JSON.stringify(data)}`);
  },

  async afterCreate(event) {
    const { result } = event;

    const category = result.kategorie || "";
    const message = result.nachricht || "(kein Text)";
    const sender = result.name ? `Von: ${result.name}\n\n` : "";

    // Debug: Gespeicherte Daten loggen
    strapi.log.info(
      `Feedback gespeichert: Kategorie=${category}, Name=${result.name || "-"}, Nachricht=${message}`
    );

    try {
      await strapi
        .plugin("email")
        .service("email")
        .send({
          to: "feedback@tilde-app.de",
          subject: `Neues Feedback: ${category}`,
          text: `${sender}${message}`,
        });
      strapi.log.info("Feedback-Mail erfolgreich gesendet.");
    } catch (err) {
      strapi.log.error("Feedback-Mail konnte nicht gesendet werden:", err);
    }
  },
};
