module.exports = async (ctx, config, { strapi }) => {
  const website = ctx.request.body.data?.website;

  if (website && website.trim() !== "") {
    return ctx.badRequest("Bot detected (honeypot field filled).");
  }

  // Feld entfernen, damit es nicht gespeichert wird
  delete ctx.request.body.data.website;

  return true;
};
