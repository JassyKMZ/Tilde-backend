module.exports = [
  "strapi::errors",
  "strapi::security",
  {
    name: "strapi::cors",
    config: {
      origin: ["http://localhost:4173", "https://tilde-app.de"],
      headers: ["Content-Type", "Authorization", "Origin", "Accept"],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
      credentials: true,
    },
  },
  "strapi::poweredBy",
  "strapi::logger",
  "strapi::query",
  "strapi::body",
  "strapi::session",
  "strapi::favicon",
  "strapi::public",
];
