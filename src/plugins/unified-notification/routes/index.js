// Content-API routes are served under /api/unified-notification/... and require an
// API token (Settings → API Tokens) or an explicit role permission.
module.exports = {
  "content-api": {
    type: "content-api",
    routes: [
      {
        method: "POST",
        path: "/test",
        handler: "notification.test",
        config: { policies: [], middlewares: [] },
      },
      {
        method: "POST",
        path: "/pushnotifications/testreminder",
        handler: "notification.testreminder",
        config: { policies: [], middlewares: [] },
      },
      {
        method: "GET",
        path: "/preview/:postId",
        handler: "notification.preview",
        config: { policies: [], middlewares: [] },
      },
      {
        method: "POST",
        path: "/test-post/:postId/:userId?",
        handler: "notification.testPost",
        config: { policies: [], middlewares: [] },
      },
    ],
  },
};
