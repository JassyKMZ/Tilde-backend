"use strict";

const USER_UID = "plugin::users-permissions.user";
const PROFILE_UID = "api::user-profile.user-profile";
const WEBPUSH_UID = "api::webpush-subscription.webpush-subscription";

async function resolveUserId(ctx) {
  try {
    const payload = await strapi
      .plugin("users-permissions")
      .service("jwt")
      .getToken(ctx);
    return payload?.id || null;
  } catch {
    return null;
  }
}

module.exports = {
  /**
   * Deletes the caller's account and everything linked to it (Art. 17 DSGVO):
   * profile incl. children's data, push subscriptions, login sessions, user.
   * Requires the current password, so a stolen or forgotten-open session alone
   * cannot wipe an account.
   */
  async deleteMe(ctx) {
    const userId = await resolveUserId(ctx);
    if (!userId) return ctx.unauthorized("Bitte melde dich erneut an.");

    const password = ctx.request.body?.password;
    if (typeof password !== "string" || !password) {
      return ctx.badRequest("Bitte gib dein Passwort ein.");
    }

    const user = await strapi.db.query(USER_UID).findOne({
      where: { id: userId },
      select: ["id", "password"],
    });
    if (!user) return ctx.unauthorized("Bitte melde dich erneut an.");

    const validPassword = await strapi
      .plugin("users-permissions")
      .service("user")
      .validatePassword(password, user.password);
    if (!validPassword) {
      return ctx.badRequest("Das Passwort ist nicht korrekt.");
    }

    await strapi.db.query(WEBPUSH_UID).deleteMany({ where: { user: userId } });
    await strapi.db.query(PROFILE_UID).deleteMany({ where: { user: userId } });
    await strapi
      .sessionManager("users-permissions")
      .invalidateRefreshToken(String(userId));
    await strapi.db.query(USER_UID).delete({ where: { id: userId } });

    strapi.log.info(`[account] Deleted account ${userId} on user request`);
    ctx.status = 204;
  },
};
