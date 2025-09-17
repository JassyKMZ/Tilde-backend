module.exports = ({ env }) => ({
  "users-permissions": {
    config: {
      providers: {
        local: { enabled: true },
      },
      register: {
        allowedFields: ["role"],
        defaultRole: "authenticated",
        isEmailUnique: true,
        isUsernameUnique: true,
      },
      jwt: {
        expiresIn: "2h", // This value should be lower than the refreshTokenExpiresIn below.
      },
    },
    options: {
      password: {
        minLength: 6,
        maxLength: 20,
        lowercase: true,
        uppercase: true,
        numbers: true,
        symbols: true,
      },
    },
    "refresh-token": {
      config: {
        refreshTokenExpiresIn: "30d",
        requestRefreshOnAll: false,
        refreshTokenSecret: env("REFRESH_JWT_SECRET") || "SomethingSecret",
        cookieResponse: true,
        refreshTokenRotation: true,
      },
    },
  },

  email: {
    config: {
      provider: 'nodemailer',
      providerOptions: {
        host: env("SMTP_HOST",  'mail.agenturserver.de'),
        port: env.int("SMTP_PORT", 587),
        secure: false,
        auth: {
          user: env("SMTP_USERNAME"),
          pass: env("SMTP_PASSWORD"),
        },
      },
      settings: {
        defaultFrom: env("SMTP_FROM", 'it-service@kmz-sbk.de'),
        defaultReplyTo: env("SMTP_REPLY_TO", 'it-service@kmz-sbk.de'),
      },
    },
  },

  upload: {
    config: {
      formidable: {
        maxFileSize: 1 * 1024 * 1024, // 1 MB
      },
    },
  },
});
