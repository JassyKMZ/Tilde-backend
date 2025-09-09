"use strict";

module.exports = {
  async ping(ctx) {
    ctx.send({ status: "pong 🎾" });
  },

  async update(ctx) {
    const authHeader = ctx.request.header.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return ctx.unauthorized("Kein Token bereitgestellt");
    }
    let me;
    try {
      me = await strapi.service("plugin::users-permissions.jwt").verify(token);
    } catch (err) {
      console.log("JWT verify error:", err);
      return ctx.unauthorized("Ungültiger Token");
    }

    const { email } = ctx.request.body;
    if (!email || !email.includes("@")) {
      return ctx.badRequest("Bitte gib eine gültige E-Mail an.");
    }

    const exists = await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({ where: { email } });

    if (exists && exists.id !== me.id) {
      return ctx.conflict("Diese E-Mail ist bereits vergeben.");
    }

    const updated = await strapi.entityService.update(
      "plugin::users-permissions.user",
      me.id,
      { data: { email } }
    );

    return ctx.send({ email: updated.email });
  },
};
