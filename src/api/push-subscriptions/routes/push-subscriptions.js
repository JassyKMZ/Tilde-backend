module.exports = {
  routes: [
    {
      method: "POST",
      path: "/push-subscriptions",
      handler: "push-subscriptions.create",
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/push-subscriptions/send",
      handler: "push-subscriptions.send",
      config: {
        auth: {
          type: "api-token",
          scope: ["push-subscriptions.send"],
        },
        policies: ["admin::isAuthenticatedAdmin"],
      },
    },
    {
      method: "DELETE",
      path: "/push-subscriptions/:id",
      handler: "push-subscriptions.delete",
      config: {
        auth: false,
      },
    },
  ],
};
