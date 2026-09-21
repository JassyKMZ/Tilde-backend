"use strict";

module.exports = {
  async check(ctx) {
    const { email } = ctx.request.body;
    if (!email) {
      return ctx.badRequest("E-Mail ist erforderlich.");
    }

    // look for a Strapi user with that email
    const existing = await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({ where: { email } });

    // send back { exists: true|false }
    ctx.send({ exists: !!existing });
  },
};
