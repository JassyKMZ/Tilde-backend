// @ts-nocheck
"use strict";
const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController(
  "api::user-profile.user-profile",
  ({ strapi, super: core }) => ({
    ...core,

    async updateBookmarks(ctx) {
      const { bookmarks: docId } = ctx.request.body.data || {}; // Expect a single docId
      if (!docId) return ctx.badRequest("bookmark must be a valid documentId");

      const user = ctx.state.user;
      if (!user) return ctx.unauthorized("You must be logged in");

      const profileId = user.profileId;
      if (!profileId) return ctx.notFound("User profile not found");

      try {
        // Find the current profile with existing bookmarks
        const profile = await strapi.entityService.findOne(
          "api::user-profile.user-profile",
          profileId,
          {
            populate: { bookmarks: true },
          },
        );

        if (!profile) return ctx.notFound("Profile not found");

        // Convert existing bookmarks into an array of numeric post IDs
        const existingBookmarks = profile.bookmarks.map((b) => b.id);

        // Check if the bookmark exists, toggle it
        const posts = await strapi.entityService.findMany("api::post.post", {
          filters: { documentId: docId },
          limit: 1,
        });
        if (!posts.length)
          return ctx.throw(400, `Post with documentId ${docId} not found`);

        const postId = posts[0].id;
        const updatedBookmarks = existingBookmarks.includes(postId)
          ? existingBookmarks.filter((id) => id !== postId) // Remove if it exists
          : [...existingBookmarks, postId]; // Add if missing

        // Update only the bookmarks field
        const updatedProfile = await strapi.entityService.update(
          "api::user-profile.user-profile",
          profileId,
          {
            data: { bookmarks: updatedBookmarks },
          },
        );

        return ctx.send(updatedProfile);
      } catch (err) {
        console.error("Error updating bookmarks:", err);
        return ctx.throw(500, err);
      }
    },

    async updateByDocumentId(ctx) {
      const { documentId } = ctx.params;
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized();

      // Verify the profile belongs to the authenticated user
      const profile = await strapi.db
        .query("api::user-profile.user-profile")
        .findOne({ where: { documentId, user: user.id } });
      if (!profile) return ctx.notFound();

      const { profile_roles: roleIds, ...otherData } =
        ctx.request.body?.data || {};

      // Update non-role fields via Document Service
      if (Object.keys(otherData).length > 0) {
        await strapi.documents("api::user-profile.user-profile").update({
          documentId,
          data: otherData,
        });
      }

      // profile_roles: Document Service rejects this field (collectionName collision).
      // Use entityService instead — same proven path as updateBookmarks.
      if (roleIds !== undefined) {
        const ids = Array.isArray(roleIds)
          ? roleIds.filter(Number.isFinite)
          : [];
        if (!ids.length)
          return ctx.badRequest("Bitte mindestens eine Rolle auswählen");
        await strapi.entityService.update(
          "api::user-profile.user-profile",
          profile.id,
          { data: { profile_roles: ids } },
        );
      }

      const updated = await strapi
        .documents("api::user-profile.user-profile")
        .findOne({
          documentId,
          populate: {
            user: { fields: ["email", "fullName"] },
            kategories: true,
            bookmarks: { populate: "bild" },
            profile_roles: true,
          },
        });

      return ctx.send(updated);
    },

    async completeOnboarding(ctx) {
      try {
        const authUser = ctx.state.user;
        if (!authUser || !authUser.id)
          return ctx.unauthorized("Not authenticated");

        const profileId = authUser.profileId;
        if (!profileId) return ctx.notFound("User profile not found");

        const incoming = ctx.request.body?.data || {};
        // whitelist fields
        const allowed = {};
        if (typeof incoming.fullName === "string")
          allowed.fullName = incoming.fullName;
        if (incoming.roleType) allowed.roleType = incoming.roleType;
        allowed.onboardingComplete = true;

        const updated = await strapi.entityService.update(
          "api::user-profile.user-profile",
          profileId,
          {
            data: allowed,
            populate: { user: { fields: ["email"] } },
          },
        );

        return ctx.send({ ok: true, profile: updated });
      } catch (err) {
        strapi.log.error("completeOnboarding error:", err);
        return ctx.internalServerError("Could not complete onboarding");
      }
    },
  }),
);
