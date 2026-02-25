"use strict";

module.exports = {
  routes: [
    {
      method: "POST",
      path: "/user/request-email-change",
      handler: "change-email.requestEmailChange",
      config: {
        auth: false,
      },
    },
    {
      method: "POST",
      path: "/user/confirm-email-change",
      handler: "change-email.confirmEmailChange",
      config: {
        auth: false,
      },
    },
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
