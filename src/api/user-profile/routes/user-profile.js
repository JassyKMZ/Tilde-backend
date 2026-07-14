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
    method: "GET",
    path: "/my-profile",
    handler: "user-profile.myProfile",
    config: {
      auth: { strategies: ["jwt"] },
    },
  },
  {
    method: "POST",
    path: "/actions/set-my-roles",
    handler: "user-profile.setMyRoles",
    config: {
      auth: { strategies: ["jwt"] },
    },
  },

  {
    method: "PUT",
    path: "/:documentId", // <-- captures your string key
    handler: "user-profile.updateByDocumentId",
    config: {
      auth: { strategies: ["plugin::users-permissions.jwt"] },
    },
  },
  // {
  //   method: "POST",
  //   path: "/create-for-me",
  //   handler: "user-profile.createForMe",
  //   config: {
  //     auth: true,
  //     policies: [],
  //   },
  // },
];

module.exports = createCoreRouter(
  "api::user-profile.user-profile",
  ({ router }) => ({
    routes: [...customRoutes, ...router.routes],
  }),
);
