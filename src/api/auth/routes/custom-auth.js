export default [
  {
    method: "POST",
    path: "/forgot-password-custom",
    handler: "api::auth.custom-auth.forgotPasswordCustom",
    config: { auth: false },
  },
  {
    method: "POST",
    path: "/safe-reset",
    handler: "api::auth.custom-auth.safeResetPassword",
    config: { auth: false },
  },
];
