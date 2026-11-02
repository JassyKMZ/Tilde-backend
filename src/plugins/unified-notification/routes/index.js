module.exports = {
  "content-api": {
    type: "content-api",
    routes: [
      {
        method: "POST",
        path: "/test",
        handler: "notification.test",
        config: {
          policies: [],
          middlewares: ["strapi::body"],
        },
      },
      {
        method: "GET",
        path: "/preview/:postId",
        handler: "notification.preview",
        config: {
          policies: [],
          middlewares: [],
        },
      },
      {
        method: "POST",
        path: "/test-post/:postId/:userId?",
        handler: "notification.testPost",
        config: {
          type: "content-api",
          policies: [],
          middlewares: [],
        },
      },
    ],
  },
};
