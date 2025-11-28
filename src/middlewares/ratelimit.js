const ratelimit = require("koa-ratelimit");

module.exports = (config, { strapi }) => {
  return ratelimit({
    driver: "memory", // kein Redis nötig
    db: new Map(), // interner Speicher
    duration: 60000, // 1 Minute
    errorMessage: "Zu viele Anfragen, bitte später erneut versuchen.",
    id: (ctx) => ctx.ip, // IP als Schlüssel
    max: 5, // max. 5 Requests pro Minute
  });
};
