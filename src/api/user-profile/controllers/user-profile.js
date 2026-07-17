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

    async myProfile(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized("You must be logged in");

      const profileId = user.profileId;
      if (!profileId) return ctx.notFound("User profile not found");

      const profile = await strapi.entityService.findOne(
        "api::user-profile.user-profile",
        profileId,
        {
          populate: {
            kategories: true,
            kinder: { populate: { favoriteCategories: true } },
            bookmarks: { populate: "bild" },
            reminders: true,
            gruppen: {
              populate: {
                kinder: true,
                kategories: true,
              },
            },
            user: { fields: ["email", "fullName"] },
          },
        },
      );

      return ctx.send({ data: profile });
    },

    async setMyRoles(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized("You must be logged in");

      const profileId = user.profileId;
      if (!profileId) return ctx.notFound("User profile not found");

      const incomingRoleIds =
        ctx.request.body?.roleIds ?? ctx.request.body?.data?.roleIds ?? [];

      const roleIds = [
        ...new Set(
          (Array.isArray(incomingRoleIds) ? incomingRoleIds : [])
            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id) && id > 0),
        ),
      ];

      const updated = await strapi.entityService.update(
        "api::user-profile.user-profile",
        profileId,
        {
          data: {
            identity: roleIds,
          },
          populate: {
            user: { fields: ["email", "fullName"] },
          },
        },
      );

      return ctx.send({ ok: true, profile: updated });
    },

    async updateByDocumentId(ctx) {
      const { documentId } = ctx.params;
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized();

      const normalizeRoleIds = (value) => {
        const ids = [];
        const pushId = (item) => {
          if (item === null || item === undefined) return;
          if (typeof item === "number" || typeof item === "string") {
            const parsed = Number(item);
            if (Number.isFinite(parsed) && parsed > 0) ids.push(parsed);
            return;
          }
          if (typeof item !== "object") return;
          const direct = item.id ?? item.documentId ?? item.value;
          if (direct !== undefined && direct !== null && direct !== "") {
            const parsed = Number(direct);
            if (Number.isFinite(parsed) && parsed > 0) ids.push(parsed);
          }
          if (Array.isArray(item.connect)) item.connect.forEach(pushId);
          if (Array.isArray(item.set)) item.set.forEach(pushId);
          if (Array.isArray(item.data)) item.data.forEach(pushId);
        };

        if (Array.isArray(value)) value.forEach(pushId);
        else if (value && typeof value === "object") pushId(value);

        return [...new Set(ids)];
      };

      // Verify the profile belongs to the authenticated user
      const profile = await strapi.db
        .query("api::user-profile.user-profile")
        .findOne({ where: { documentId, user: user.id } });
      if (!profile) return ctx.notFound();

      const requestData = ctx.request.body?.data || {};
      const { roleIds, ...otherDataRaw } = requestData;
      const otherData = { ...otherDataRaw };

      const queryRoleIdsRaw = ctx.query?.roleIds;
      const queryRoleIds =
        typeof queryRoleIdsRaw === "string"
          ? queryRoleIdsRaw
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean)
          : queryRoleIdsRaw;

      const requestedRoleInput = roleIds !== undefined ? roleIds : queryRoleIds;

      const requestedRoleIds =
        requestedRoleInput !== undefined
          ? normalizeRoleIds(requestedRoleInput)
          : undefined;

      if (requestedRoleIds !== undefined) {
        otherData.identity = requestedRoleIds;
      }

      const wantsOnboardingComplete = otherData?.onboardingComplete === true;
      if (wantsOnboardingComplete) {
        const existingProfile = await strapi.entityService.findOne(
          "api::user-profile.user-profile",
          profile.id,
          {},
        );

        const fullNameCandidate =
          typeof otherData.fullName === "string"
            ? otherData.fullName.trim()
            : String(existingProfile?.fullName || "").trim();

        if (!fullNameCandidate) {
          return ctx.badRequest(
            "Onboarding kann nur abgeschlossen werden, wenn Name gesetzt ist",
          );
        }

        otherData.fullName = fullNameCandidate;
      }

      // Avoid accidental key-shape collisions in Document Service updates.
      delete otherData.roleIds;

      // Update non-role fields via Document Service
      if (Object.keys(otherData).length > 0) {
        await strapi.documents("api::user-profile.user-profile").update({
          documentId,
          data: otherData,
        });
      }

      const updated = await strapi.entityService.findOne(
        "api::user-profile.user-profile",
        profile.id,
        {
          populate: {
            user: { fields: ["email", "fullName"] },
            kategories: true,
            bookmarks: { populate: "bild" },
            reminders: true,
            gruppen: {
              populate: {
                kinder: true,
                kategories: true,
              },
            },
          },
        },
      );

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
        const normalizeIds = (value) => {
          if (!Array.isArray(value)) return [];
          return [
            ...new Set(
              value
                .map((id) => Number(id))
                .filter((id) => Number.isFinite(id) && id > 0),
            ),
          ];
        };

        const allowed = {
          onboardingComplete: true,
        };

        if (typeof incoming.fullName === "string" && incoming.fullName.trim()) {
          allowed.fullName = incoming.fullName.trim();
        }

        const roleIds = normalizeIds(incoming.identity);
        allowed.identity = roleIds;

        const categoryIds = normalizeIds(incoming.kategories);
        if (categoryIds.length) {
          allowed.kategories = categoryIds;
        }

        if (incoming.kinder !== undefined) {
          allowed.kinder = Array.isArray(incoming.kinder)
            ? incoming.kinder
            : [];
        }

        if (incoming.minAge !== undefined) {
          allowed.minAge =
            incoming.minAge === null ? null : Number(incoming.minAge);
        }
        if (incoming.maxAge !== undefined) {
          allowed.maxAge =
            incoming.maxAge === null ? null : Number(incoming.maxAge);
        }

        if (!allowed.fullName) {
          return ctx.badRequest(
            "Onboarding kann nur abgeschlossen werden, wenn fullName gesetzt ist",
          );
        }

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
