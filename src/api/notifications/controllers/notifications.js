import { sendToToken } from "../../../services/fcm.js";

export default {
  async sendTest(ctx) {
    const { token } = ctx.request.body;
    if (!token) return ctx.badRequest("token required");
    try {
      const res = await sendToToken(token, {
        notification: { title: "Hello", body: "Test from Strapi" },
        data: { url: "/messages/1" },
      });
      return ctx.send({ success: true, res });
    } catch (e) {
      strapi.log.error("FCM send error", e);
      return ctx.internalServerError({
        error: e.message,
        details: e.body || null,
      });
    }
  },
};
