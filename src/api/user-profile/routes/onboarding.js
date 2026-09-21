"use strict";

module.exports = {
  routes: [
    {
      method: "POST",
      path: "/user/onboarding/complete",
      handler: "user-profile.completeOnboarding",
      config: {
        auth: { strategies: ["plugin::users-permissions.jwt"] },
      },
    },
  ],
};
