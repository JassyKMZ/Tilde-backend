module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    const captcha = ctx.request.body?.data?.captcha;
    if (!captcha || captcha.trim() !== "7") {
      ctx.throw(400, "Captcha falsch oder fehlt.");
    }
    delete ctx.request.body.data.captcha; // nicht speichern
    await next();
  };
};
