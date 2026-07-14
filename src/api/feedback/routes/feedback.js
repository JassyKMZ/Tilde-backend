module.exports = {
  routes: [
    {
      method: "POST",
      path: "/feedbacks",
      handler: "feedback.create",
      config: {
        policies: [
          "api::feedback.captcha",
          "api::feedback.honeypot",
          "api::feedback.ratelimit",
        ],
      },
    },
  ],
};
