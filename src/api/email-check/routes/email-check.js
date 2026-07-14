"use strict";

module.exports = {
  routes: [
    {
      method: "POST",
      path: "/email-check",
      handler: "email-check.check",
      config: {
        auth: false, // public
      },
    },
  ],
};
