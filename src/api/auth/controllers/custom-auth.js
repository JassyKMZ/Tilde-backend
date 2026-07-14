"use strict";

module.exports = {
  async confirmRegistration(ctx) {
    const token =
      ctx.query?.token ||
      ctx.query?.confirmation ||
      ctx.request.body?.token ||
      ctx.request.body?.confirmation;

    if (!token) {
      return ctx.badRequest("Bestaetigungstoken erforderlich");
    }

    try {
      const userService = strapi.plugin("users-permissions").service("user");
      const users = await userService.fetchAll({
        filters: { confirmationToken: token },
        limit: 1,
      });
      const user = Array.isArray(users) ? users[0] : null;

      if (!user) {
        return ctx.badRequest(
          "Ungueltiger oder abgelaufener Bestaetigungstoken",
        );
      }

      if (!user.confirmed) {
        await userService.edit(user.id, {
          confirmed: true,
          confirmationToken: null,
        });
      }

      return ctx.send({
        ok: true,
        status: "confirmed",
        email: user?.email || null,
      });
    } catch (err) {
      const message = String(err?.message || "").toLowerCase();
      const isInvalidToken =
        message.includes("invalid token") ||
        message.includes("invalid") ||
        message.includes("expired") ||
        message.includes("already") ||
        message.includes("token");

      if (isInvalidToken) {
        return ctx.badRequest(
          "Ungueltiger oder bereits verwendeter Bestaetigungstoken",
        );
      }

      strapi.log.error("confirmRegistration error", err);
      return ctx.send({
        ok: false,
        status: "server_error",
        message: "Bestaetigung fehlgeschlagen",
      });
    }
  },
};
