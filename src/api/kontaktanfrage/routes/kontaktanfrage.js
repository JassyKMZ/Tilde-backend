module.exports = {
  routes: [
    {
      method: "POST",
      path: "/kontaktanfragen",
      handler: "kontaktanfrage.create",
      config: {
        // Public form: no login and no admin permission step needed. Spam protection
        // reuses the feedback form's policies.
        auth: false,
        policies: [
          "api::feedback.captcha",
          "api::feedback.honeypot",
          { name: "global::rate-limit", config: { max: 5, windowMs: 60 * 1000 } },
        ],
      },
    },
  ],
};
