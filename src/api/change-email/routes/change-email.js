"use strict";

module.exports = {
  routes: [
    {
      method: "PUT",
      path: "/change-email",
      handler: "change-email.update",
      config: {
        auth: false,
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
