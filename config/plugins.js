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
      // Strapi's built-in access/refresh tokens: POST /api/auth/refresh rotates the
      // refresh token, POST /api/auth/logout ends the session of one device.
      jwtManagement: "refresh",
      sessions: {
        accessTokenLifespan: 60 * 60, // 1 hour (seconds)
        // "Remember me": stay logged in while the app is used at least every
        // 30 days, but log in again at the latest after 90 days.
        idleRefreshTokenLifespan: 30 * 24 * 60 * 60,
        maxRefreshTokenLifespan: 90 * 24 * 60 * 60,
      },
      enableEMail: true,
      // sendConfirmationEmail: false,
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
  },

  email: {
    config: {
      provider: "nodemailer",
      providerOptions: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10),
        secure: true,
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
