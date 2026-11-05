module.exports = ({ env }) => ({
  host: env("HOST", "0.0.0.0"),
  port: env.int("PORT", 1337),
  url: env("FRONTEND_URL", "https://tilde-app.de"),
  // Plesk runs Strapi behind nginx. Trusting its X-Forwarded-For header gives rate
  // limits the real client IP instead of the proxy's (see PROXY_HOPS in src/index.js).
  proxy: { koa: env.bool("IS_PROXIED", true) },
  app: {
    keys: env.array("APP_KEYS"),
  },
  webhooks: {
    populateRelations: env.bool("WEBHOOKS_POPULATE_RELATIONS", false),
  },
  // ssl: {
  //   enabled: true,
  //   key: env("SSL_KEY_PATH", "./vue-frontend/cert/localhost-key.pem"),
  //   cert: env("SSL_CERT_PATH", "./vue-frontend/cert/localhost.pem"),
  // },
});
