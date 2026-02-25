module.exports = {
  routes: [
    {
      method: "POST",
      path: "/auth/local/register",
      handler: "auth.register",
      config: {
        auth: false,
      },
    },
    {
      method: "POST",
      path: "/users/check-email",
      handler: "user.checkEmail",
      config: {
        auth: false,
      },
    },
    {
      method: "PUT",
      path: "/users/change-email",
      handler: "user.changeEmail",
      config: {
        auth: { strategies: ["jwt"], scope: [] },
      },
    },
  ],
};
