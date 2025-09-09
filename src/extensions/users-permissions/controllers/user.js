"use strict";

module.exports = {
  async checkEmail(ctx) {
    const { email } = ctx.request.body;

    if (!email) return ctx.badRequest("E-Mail ist erforderlich.");

    const user = await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({
        where: { email },
      });

    ctx.send({ exists: !!user });
  },

  async changeEmail(ctx) {
    const me = ctx.state.user;
    if (!me) {
      return ctx.unauthorized("You must be logged in");
    }

    const { email } = ctx.request.body;
    if (!email || !email.includes("@")) {
      return ctx.badRequest("Bitte gib eine gültige E-Mail ein.");
    }

    // check duplicate
    const exists = await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({ where: { email } });

    if (exists) {
      return ctx.conflict("Diese E-Mail-Adresse ist bereits vergeben.");
    }

    // update the user record
    const updated = await strapi.entityService.update(
      "plugin::users-permissions.user",
      me.id, // authenticated user’s id
      { data: { email } }
    );

    // return the updated user (or just a success message)
    ctx.send({ email: updated.email });
  },
};
