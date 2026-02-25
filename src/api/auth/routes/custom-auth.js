module.exports = [
  {
    method: "POST",
    path: "/auth/forgot-password-custom",
    handler: "api::auth.custom-auth.forgotPasswordCustom",
    config: { auth: false },
  },
  {
    method: "POST",
    path: "/auth/safe-reset",
    handler: "api::auth.custom-auth.safeResetPassword",
    config: { auth: false },
  },
  {
    method: "POST",
    path: "/auth/send-confirmation-email",
    handler: "api::auth.custom-auth.sendConfirmationEmail",
    config: { auth: false },
  },
  {
    method: "GET",
    path: "/auth/confirm-registration",
    handler: "api::auth.custom-auth.confirmRegistration",
    config: { auth: false },
  },
];
