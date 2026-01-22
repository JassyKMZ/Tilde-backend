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
    ],
  },
};
