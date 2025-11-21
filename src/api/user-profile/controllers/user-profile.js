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
          }
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
          }
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

      const profile = await strapi.db
        .query("api::user-profile.user-profile")
        .findOne({ where: { documentId, user: user.id } });
      if (!profile) return ctx.notFound();

      const updated = await strapi.entityService.update(
        "api::user-profile.user-profile",
        profile.id,
        {
          data: ctx.request.body.data,
          populate: {
            user: { fields: ["email", "fullName"] },
            kategories: true,
            bookmarks: { populate: "bild" },
            notificationPreferences: true,
          },
        }
      );

      return ctx.send(updated);
    },

    // async createForMe(ctx) {
    //   try {
    //     // ensure authenticated
    //     const authUser = ctx.state.user;
    //     if (!authUser || !authUser.id) {
    //       return ctx.unauthorized("Not authenticated");
    //     }

    //     // incoming data under ctx.request.body.data (follow Strapi conventions)
    //     const incoming = ctx.request.body?.data || {};

    //     // whitelist and sanitize allowed fields only
    //     const data = {
    //       user: authUser.id,
    //       fullName: incoming.fullName || "",
    //       roleType: incoming.roleType || null,
    //       workplace: incoming.workplace || null,
    //       // onboardingCompleted:
    //       //   incoming.onboardingCompleted === true ? true : false,
    //     };

    //     // Prevent duplicate creation: check existing profile for this user
    //     const existing = await strapi.db
    //       .query("api::user-profile.user-profile")
    //       .findOne({ where: { user: authUser.id } });

    //     if (existing) {
    //       // If profile exists, optionally update missing fields instead of creating duplicate
    //       const updateData = {};
    //       for (const [k, v] of Object.entries(data)) {
    //         if (k === "user") continue;
    //         if (v != null && v !== "" && (!existing[k] || existing[k] === "")) {
    //           updateData[k] = v;
    //         }
    //       }
    //       if (Object.keys(updateData).length) {
    //         const updated = await strapi.entityService.update(
    //           "api::user-profile.user-profile",
    //           existing.id,
    //           { data: updateData }
    //         );
    //         return ctx.send({ ok: true, updated });
    //       }
    //       return ctx.send({
    //         ok: true,
    //         message: "Profile already exists",
    //         profile: existing,
    //       });
    //     }

    //     // Create profile
    //     const created = await strapi.entityService.create(
    //       "api::user-profile.user-profile",
    //       {
    //         data,
    //       }
    //     );

    //     return ctx.created({ ok: true, profile: created });
    //   } catch (err) {
    //     strapi.log.error("createForMe error:", err);
    //     return ctx.internalServerError("Could not create profile");
    //   }
    // },
  })
);
