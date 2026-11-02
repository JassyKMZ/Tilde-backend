module.exports = {
  routes: [
    {
      method: "POST",
      path: "/test",
      handler: "pushnotification.test",
      // Requires an API token (Settings → API Tokens) or an explicit role permission.
      config: { policies: [], middlewares: [] },
    },
    {
      method: "POST",
      path: "/testreminder",
      handler: "pushnotification.testreminder",
      // Requires an API token (Settings → API Tokens) or an explicit role permission.
      config: { policies: [], middlewares: [] },
    },
  ],
};
