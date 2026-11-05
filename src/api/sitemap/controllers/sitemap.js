"use strict";

// XML sitemap for search engines, built from the published posts. tilde-app.de/robots.txt
// points here; search engines accept a sitemap on another host when robots.txt names it.

// Own variable: FRONTEND_URL is used as Strapi's own address in config/server.js.
const SITE_URL = (
  process.env.PUBLIC_SITE_URL || "https://tilde-app.de"
).replace(/\/$/, "");

// Public pages of the app; personal and one-off pages are left out on purpose.
const STATIC_PAGES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/beitraege", changefreq: "daily", priority: "0.9" },
  { path: "/tipps", changefreq: "weekly", priority: "0.8" },
  { path: "/about", changefreq: "monthly", priority: "0.5" },
  { path: "/roadmap", changefreq: "monthly", priority: "0.3" },
  { path: "/feedback", changefreq: "yearly", priority: "0.3" },
  { path: "/barrierefreiheit", changefreq: "yearly", priority: "0.2" },
  { path: "/impressum", changefreq: "yearly", priority: "0.2" },
];

// The app hides events that ended more than two weeks ago from its lists.
const EVENT_ARCHIVE_MS = 14 * 24 * 60 * 60 * 1000;
const PAGE_SIZE = 200;

function escapeXml(value) {
  return String(value).replace(
    /[<>&'"]/g,
    (char) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&apos;",
        '"': "&quot;",
      })[char],
  );
}

function urlEntry({ loc, lastmod, changefreq, priority }) {
  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod
      ? `    <lastmod>${new Date(lastmod).toISOString()}</lastmod>`
      : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

async function publishedPosts() {
  const posts = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const batch = await strapi.documents("api::post.post").findMany({
      status: "published",
      fields: ["documentId", "postType", "eventDate", "updatedAt"],
      sort: ["updatedAt:desc"],
      start,
      limit: PAGE_SIZE,
    });
    posts.push(...batch);
    if (batch.length < PAGE_SIZE) return posts;
  }
}

module.exports = {
  async index(ctx) {
    const cutoff = Date.now() - EVENT_ARCHIVE_MS;
    const posts = (await publishedPosts()).filter(
      (post) =>
        post.postType !== "event" ||
        !post.eventDate ||
        new Date(post.eventDate).getTime() >= cutoff,
    );

    const entries = [
      ...STATIC_PAGES.map((page) =>
        urlEntry({ ...page, loc: `${SITE_URL}${page.path}` }),
      ),
      ...posts.map((post) =>
        urlEntry({
          loc: `${SITE_URL}/beitrag/${post.documentId}`,
          lastmod: post.updatedAt,
          changefreq: post.postType === "event" ? "weekly" : "monthly",
          priority: post.postType === "event" ? "0.7" : "0.6",
        }),
      ),
    ];

    ctx.set("Content-Type", "application/xml; charset=utf-8");
    ctx.set("Cache-Control", "public, max-age=3600");
    ctx.body = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...entries,
      "</urlset>",
      "",
    ].join("\n");
  },
};
