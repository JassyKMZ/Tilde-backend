"use strict";

module.exports = {
  routes: [
    {
      method: "DELETE",
      path: "/account",
      handler: "account.deleteMe",
      config: {
        // The controller checks the token and the password itself, so no role
        // permission has to be enabled in the admin panel for this route.
        auth: false,
        // Checks the password, so limit guessing.
        policies: [
          { name: "global::rate-limit", config: { max: 5, windowMs: 15 * 60 * 1000 } },
        ],
      },
    },
  ],
};
