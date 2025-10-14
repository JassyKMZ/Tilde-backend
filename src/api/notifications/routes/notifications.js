const { auth } = require("google-auth-library");

export default [
  {
    method: "POST",
    path: "/notifications/sendTest",
    handler: "api::notifications.notifications.sendTest",
    config: { auth: false },
  },
];
