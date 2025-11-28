module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    if (ctx.request.body?.data?.website) {
      ctx.throw(400, "Bot detected (honeypot field filled).");
    }
    await next();
  };
};
