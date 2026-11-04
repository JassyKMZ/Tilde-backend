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
      },
    },
  ],
};
