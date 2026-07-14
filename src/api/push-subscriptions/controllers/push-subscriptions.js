"use strict";
const webpush = require("web-push");

module.exports = {
  async send(ctx) {
    const { title, body, url } = ctx.request.body;

    // read directly from process.env
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT; // e.g. 'mailto:you@domain.com'

    webpush.setVapidDetails(subject, publicKey, privateKey);

    const subs = await strapi.db
      .query("api::push-subscriptions.push-subscription")
      .findMany();

    const payload = JSON.stringify({ title, body, url });
    await Promise.all(
      subs.map((sub) =>
        webpush.sendNotification(sub, payload).catch(console.error)
      )
    );

    ctx.send({ sent: true, count: subs.length });
  },
  async create(ctx) {
    // Pull the subscription object out of `body.data`
    const subscription = ctx.request.body?.data;
    if (!subscription || !subscription.endpoint) {
      return ctx.badRequest("No valid PushSubscription provided");
    }

    // Avoid duplicates by endpoint
    const exists = await strapi.db
      .query("api::push-subscriptions.push-subscription")
      .findOne({ where: { endpoint: subscription.endpoint } });

    if (!exists) {
      await strapi.db
        .query("api::push-subscriptions.push-subscription")
        .create({ data: subscription });
    }

    // Return the saved record (you can also fetch it fresh if you like)
    return ctx.send({ data: subscription });
  },
  // delete a subscription by its ID
  async delete(ctx) {
    const { id } = ctx.params;

    // ensure it exists
    const record = await strapi.db
      .query("api::push-subscriptions.push-subscription")
      .findOne({ where: { id } });

    if (!record) {
      return ctx.notFound("Push subscription not found");
    }

    // perform deletion
    await strapi.db
      .query("api::push-subscriptions.push-subscription")
      .delete({ where: { id } });

    ctx.send({ ok: true, id });
  },
};
