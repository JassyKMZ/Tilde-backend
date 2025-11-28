module.exports = {
  routes: [
    {
      method: "POST",
      path: "/feedbacks",
      handler: "feedback.create",
      config: {
        middlewares: ["global::ratelimit"], // nur hier aktiv
      },
    },
  ],
};
