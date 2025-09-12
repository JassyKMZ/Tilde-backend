module.exports = ({ env }) => ({
  host: env("HOST", "0.0.0.0"),
  port: env.int("PORT", 1337),
  url: env("PUBLIC_URL", "https://nice-horse-9d5c65cdc5.strapiapp.com"),
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
