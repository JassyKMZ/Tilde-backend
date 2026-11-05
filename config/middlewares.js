module.exports = ({ env }) => [
  "strapi::errors",
  {
    name: "strapi::security",
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "script-src": ["'self'", "'unsafe-inline'", "editor.unlayer.com"],
          "frame-src": ["'self'", "editor.unlayer.com"],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: "strapi::cors",
    config: {
      // Comma-separated in .env; locally e.g.
      // CORS_ORIGINS=http://localhost:4173,http://192.168.88.142:4173
      origin: env.array("CORS_ORIGINS", ["https://tilde-app.de"]),
      headers: ["Content-Type", "Authorization", "Origin", "Accept"],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
      credentials: true,
      keepHeadersOnError: true,
    },
  },
  "strapi::poweredBy",
  "strapi::logger",
  "strapi::query",
  "strapi::body",
  "strapi::session",
  "strapi::favicon",
  "strapi::public",

  // Spam protection runs as route policies, see src/policies/rate-limit.js and
  // src/api/feedback/policies.
];
