"use strict";

// RateLimitError becomes a 429 response; a plain ApplicationError would be a 400.
const { RateLimitError } = require("@strapi/utils").errors;

// Simple per-IP limit for public routes that Strapi's own auth rate limit does not
// cover. Counts live in memory, so they reset when Strapi restarts.
// Usage in a route: { name: "global::rate-limit", config: { max: 5, windowMs: 60000 } }
const hits = new Map();
let lastCleanup = 0;

function cleanup(now) {
  if (now - lastCleanup < 60 * 1000) return;
  lastCleanup = now;
  for (const [key, entry] of hits) {
    if (entry.resetAt <= now) hits.delete(key);
  }
}

module.exports = (ctx, config = {}) => {
  const max = config.max ?? 5;
  const windowMs = config.windowMs ?? 60 * 1000;
  const now = Date.now();
  cleanup(now);

  // One bucket per route and client, so the limits of different routes don't add up.
  const key = `${ctx.request.method} ${ctx.request.path}|${ctx.request.ip || "unknown"}`;
  let entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    hits.set(key, entry);
  }
  entry.count += 1;

  if (entry.count > max) {
    // Policies get a copy of ctx without its helper methods, so set it on the response.
    ctx.response.set(
      "Retry-After",
      String(Math.ceil((entry.resetAt - now) / 1000)),
    );
    throw new RateLimitError(
      "Zu viele Anfragen, bitte später erneut versuchen.",
    );
  }

  return true;
};
