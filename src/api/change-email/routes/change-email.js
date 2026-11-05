"use strict";

module.exports = {
  routes: [
    {
      method: "POST",
      path: "/user/request-email-change",
      handler: "change-email.requestEmailChange",
      config: {
        // The controller checks the token itself.
        auth: false,
        policies: [
          {
            name: "global::rate-limit",
            config: { max: 5, windowMs: 60 * 60 * 1000 },
          },
        ],
      },
    },
    {
      method: "POST",
      path: "/user/confirm-email-change",
      handler: "change-email.confirmEmailChange",
      config: {
        auth: false,
        policies: [
          {
            name: "global::rate-limit",
            config: { max: 10, windowMs: 10 * 60 * 1000 },
          },
        ],
      },
    },
    {
      method: "GET",
      path: "/change-email/ping",
      handler: "change-email.ping",
      config: {
        auth: false,
      },
    },
  ],
};
