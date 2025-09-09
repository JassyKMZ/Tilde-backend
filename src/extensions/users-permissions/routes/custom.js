module.exports = {
  routes: [
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
