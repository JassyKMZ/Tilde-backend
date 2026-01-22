"use strict";

module.exports = {
  routes: [
    {
      method: "POST",
      path: "/webpush-subscriptions",
      handler: "webpush-subscription.create",
      config: {
        auth: false, // or true if you want auth only
      },
    },
    {
      method: "DELETE",
      path: "/webpush-subscriptions",
      handler: "webpush-subscription.delete",
      config: {
        auth: false,
      },
    },
  ],
};
