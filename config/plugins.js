module.exports = {
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
        expiresIn: "2h",
      },
      enableEMail: true,
      sendConfirmationEmail: true,
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
        refreshTokenSecret: process.env.REFRESH_JWT_SECRET || "SomethingSecret",
        cookieResponse: false,
        refreshTokenRotation: true,
      },
    },
  },

  email: {
    config: {
      provider: "nodemailer",
      providerOptions: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10),
        secure: false,
        auth: {
          user: process.env.SMTP_USERNAME,
          pass: process.env.SMTP_PASSWORD,
        },
      },
      settings: {
        defaultFrom: process.env.SMTP_FROM,
        defaultReplyTo: process.env.SMTP_REPLY_TO,
      },
    },
  },

  upload: {
    config: {
      formidable: {
        maxFileSize: 1 * 1024 * 1024,
      },
    },
  },

  "unified-notification": {
    enabled: true,
    resolve: "./src/plugins/unified-notification",
  },
};
