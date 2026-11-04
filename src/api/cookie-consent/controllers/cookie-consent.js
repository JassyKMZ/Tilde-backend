"use strict";

/**
 * cookie-consent controller
 */

const { createCoreController } = require("@strapi/strapi").factories;
const UID = "api::cookie-consent.cookie-consent";

module.exports = createCoreController(UID, ({ strapi }) => ({
  async create(ctx) {
    const input = ctx.request.body?.data;
    const isUuid = (value) =>
      typeof value === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      );

    if (
      !input ||
      !isUuid(input.consentId) ||
      typeof input.policyVersion !== "string" ||
      input.policyVersion.length > 32 ||
      input.necessary !== true ||
      typeof input.externalMedia !== "boolean"
    ) {
      return ctx.badRequest("Invalid consent record");
    }

    const existing = await strapi.documents(UID).findFirst({
      filters: { consentId: input.consentId },
    });
    if (existing) return this.transformResponse(existing);

    ctx.request.body = {
      data: {
        consentId: input.consentId,
        policyVersion: input.policyVersion,
        // Analytics/marketing categories were removed (none in use); older app
        // versions may still send them, they are ignored.
        necessary: true,
        externalMedia: input.externalMedia,
        timestamp: new Date().toISOString(),
      },
    };

    return super.create(ctx);
  },
}));
