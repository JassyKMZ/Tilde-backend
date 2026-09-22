const { ApplicationError } = require("@strapi/utils").errors;

const requests = new Map();

module.exports = async (ctx, config, { strapi }) => {
  const ip = ctx.request.ip || "anonymous";
  const now = Date.now();

  const windowMs = 60000; // 1 Minute
  const max = 5; // max. 5 Requests pro Minute

  if (!requests.has(ip)) {
    requests.set(ip, []);
  }

  const timestamps = requests.get(ip).filter((ts) => now - ts < windowMs);
  timestamps.push(now);
  requests.set(ip, timestamps);

  if (timestamps.length > max) {
    throw new ApplicationError(
      "Zu viele Anfragen, bitte später erneut versuchen.",
      { status: 429 }
    );
  }

  return true;
};
