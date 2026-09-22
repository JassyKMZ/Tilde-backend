"use strict";

module.exports = {
  routes: [
    {
      method: "GET",
      path: "/auth/confirm-registration",
      handler: "custom-auth.confirmRegistration",
      config: {
        auth: false,
      },
    },
  ],
};
