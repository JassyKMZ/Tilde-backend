const { ValidationError } = require("@strapi/utils").errors;

module.exports = async (ctx) => {
  const captcha = ctx.request.body.data?.captcha;

  strapi.log.info(`Captcha erhalten: ${captcha}`);

  if (!captcha || captcha.trim() !== "7") {
    throw new ValidationError("Captcha falsch oder fehlt.");
  }

  return true; // nicht löschen!
};
