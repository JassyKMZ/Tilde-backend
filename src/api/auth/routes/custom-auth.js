"use strict";

module.exports = {
  routes: [
    {
      method: "GET",
      path: "/auth/confirm-registration",
      handler: "custom-auth.confirmRegistration",
      config: {
        auth: false,
        policies: [
          { name: "global::rate-limit", config: { max: 10, windowMs: 10 * 60 * 1000 } },
        ],
      },
    },
  ],
};
