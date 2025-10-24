const { auth } = require("google-auth-library");
module.exports = [
  {
    method: "POST",
    path: "/notifications/sendTest",
    handler: "api::notifications.notifications.sendTest",
    config: { auth: false },
  },
];
