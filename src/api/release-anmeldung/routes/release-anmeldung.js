module.exports = {
  routes: [
    {
      method: "POST",
      path: "/release-anmeldungen",
      handler: "release-anmeldung.create",
      config: {
        // Public form: no login and no admin permission step needed. Spam protection
        // reuses the feedback form's policies.
        auth: false,
        policies: [
          "api::feedback.captcha",
          "api::feedback.honeypot",
          { name: "global::rate-limit", config: { max: 5, windowMs: 60 * 1000 } },
        ],
      },
    },
    {
      // Date, time and place for the registration page (see event.js).
      method: "GET",
      path: "/release-anmeldungen/event",
      handler: "release-anmeldung.event",
      config: { auth: false },
    },
    {
      // Calendar file, linked from the confirmation mail.
      method: "GET",
      path: "/release-anmeldungen/event.ics",
      handler: "release-anmeldung.ics",
      config: { auth: false },
    },
    {
      // Personal link from the confirmation mail: show the registration,
      method: "POST",
      path: "/release-anmeldungen/status",
      handler: "release-anmeldung.status",
      config: {
        auth: false,
        policies: [
          { name: "global::rate-limit", config: { max: 10, windowMs: 60 * 1000 } },
        ],
      },
    },
    {
      // change the number of persons (or register again),
      method: "POST",
      path: "/release-anmeldungen/aendern",
      handler: "release-anmeldung.change",
      config: {
        auth: false,
        policies: [
          { name: "global::rate-limit", config: { max: 10, windowMs: 60 * 1000 } },
        ],
      },
    },
    {
      // or cancel.
      method: "POST",
      path: "/release-anmeldungen/abmelden",
      handler: "release-anmeldung.cancel",
      config: {
        auth: false,
        policies: [
          { name: "global::rate-limit", config: { max: 10, windowMs: 60 * 1000 } },
        ],
      },
    },
    {
      // List for the team, protected by RELEASE_EXPORT_KEY (see controller).
      method: "GET",
      path: "/release-anmeldungen/export",
      handler: "release-anmeldung.export",
      config: {
        auth: false,
        policies: [
          { name: "global::rate-limit", config: { max: 10, windowMs: 60 * 1000 } },
        ],
      },
    },
  ],
};
