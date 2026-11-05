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
          { name: "global::rate-limit", config: { max: 5, windowMs: 60 * 1000 } },
        ],
      },
    },
  ],
};
