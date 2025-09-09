// @ts-nocheck
"use strict";

const { createCoreRouter } = require("@strapi/strapi").factories;

const customRoutes = [
  {
    method: "GET",
    path: "/me-bookmarks",
    handler: "user-profile.bookmarks",
    config: {
      auth: { strategies: ["jwt"] },
    },
  },
  {
    method: "PUT",
    path: "/update-bookmarks",
    handler: "user-profile.updateBookmarks",
    config: {
      auth: { strategies: ["jwt"] },
    },
  },

  {
    method: "PUT",
    path: "/:documentId", // <-- captures your string key
    handler: "user-profile.updateByDocumentId",
    config: {
      auth: {
        mode: "required",
        strategies: ["plugin::users-permissions.jwt"],
        scope: [],
      },
    },
  },
];

module.exports = createCoreRouter(
  "api::user-profile.user-profile",
  ({ router }) => ({
    routes: [...customRoutes, ...router.routes],
  })
);
