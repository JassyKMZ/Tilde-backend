"use strict";

module.exports = {
  routes: [
    {
      method: "GET",
      path: "/sitemap.xml",
      handler: "sitemap.index",
      config: {
        // Public: search engines fetch it. It only lists published posts.
        auth: false,
        policies: [
          {
            name: "global::rate-limit",
            config: { max: 30, windowMs: 60 * 1000 },
          },
        ],
      },
    },
  ],
};
