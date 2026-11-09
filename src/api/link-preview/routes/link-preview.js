"use strict";

module.exports = {
  routes: [
    {
      method: "GET",
      path: "/link-preview/:id",
      handler: "link-preview.post",
      config: {
        // Public: nginx on tilde-app.de forwards link-preview bots (WhatsApp, LinkedIn, …)
        // here. It only shows published posts.
        auth: false,
        policies: [
          {
            name: "global::rate-limit",
            config: { max: 120, windowMs: 60 * 1000 },
          },
        ],
      },
    },
  ],
};
