module.exports = {
  routes: [
    {
      method: "POST",
      path: "/test",
      handler: "pushnotification.test",
      config: { auth: false, policies: [], middlewares: [] },
    },
    {
      method: "POST",
      path: "/testreminder",
      handler: "pushnotification.testreminder",
      config: { auth: false, policies: [], middlewares: [] },
    },
  ],
};
