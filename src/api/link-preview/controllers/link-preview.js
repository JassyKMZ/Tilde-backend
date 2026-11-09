"use strict";

// Link previews for shared posts. WhatsApp, Signal, LinkedIn, Facebook & co. read the
// page's meta tags without running JavaScript, so on tilde-app.de/beitrag/<id> they only
// see the defaults in index.html. nginx sends those bots here instead (see README), and
// this answers with the post's own title, summary and image. Google still gets the app.

const SITE_URL = (
  process.env.PUBLIC_SITE_URL || "https://tilde-app.de"
).replace(/\/$/, "");
// Address of Strapi itself, for images uploaded to /uploads/: server.url, which
// config/server.js takes from FRONTEND_URL.
function apiUrl() {
  return (
    strapi.config.get("server.url") || "https://api.tilde-app.de"
  ).replace(/\/$/, "");
}

const APP_NAME = "Tilde App";
const DEFAULT_DESCRIPTION =
  "Veranstaltungen, Beiträge und Tipps für Eltern und Fachkräfte im Schwarzwald-Baar-Kreis – übersichtlich an einem Ort, für Weiterbildung und Austausch.";
const DEFAULT_IMAGE = {
  url: `${SITE_URL}/img/linkPreview-1200x630.png`,
  width: 1200,
  height: 630,
  alt: "Tilde-Logo",
};

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[<>&'"]/g,
    (char) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&#39;",
        '"': "&quot;",
      })[char],
  );
}

// Same rule as toMetaDescription in the frontend, a little longer for previews.
function shorten(text, maxLength = 200) {
  const plain = String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= maxLength) return plain;
  const cut = plain.slice(0, maxLength - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), maxLength / 2)).trimEnd()}…`;
}

function absolute(url) {
  if (!url) return null;
  return /^https?:\/\//i.test(url)
    ? url
    : `${apiUrl()}${url.startsWith("/") ? "" : "/"}${url}`;
}

// The "large" format (1000 px) loads fast in previews; originals can be several MB.
function previewImage(media) {
  if (!media?.url) return DEFAULT_IMAGE;
  const file = media.formats?.large ?? media;
  return {
    url: absolute(file.url),
    width: file.width,
    height: file.height,
    alt: media.alternativeText || "",
  };
}

function page({ title, description, url, image, type, status }) {
  const meta = (attribute, key, content) =>
    content == null || content === ""
      ? null
      : `<meta ${attribute}="${key}" content="${escapeHtml(content)}">`;
  return [
    "<!doctype html>",
    '<html lang="de">',
    "<head>",
    '<meta charset="utf-8">',
    `<title>${escapeHtml(title)}</title>`,
    meta("name", "description", description),
    status === 404 ? meta("name", "robots", "noindex") : null,
    `<link rel="canonical" href="${escapeHtml(url)}">`,
    meta("property", "og:type", type),
    meta("property", "og:site_name", APP_NAME),
    meta("property", "og:locale", "de_DE"),
    meta("property", "og:title", title),
    meta("property", "og:description", description),
    meta("property", "og:url", url),
    meta("property", "og:image", image.url),
    meta("property", "og:image:width", image.width),
    meta("property", "og:image:height", image.height),
    meta("property", "og:image:alt", image.alt),
    meta("name", "twitter:card", "summary_large_image"),
    "</head>",
    "<body>",
    `<h1>${escapeHtml(title)}</h1>`,
    `<p>${escapeHtml(description)}</p>`,
    `<p><a href="${escapeHtml(url)}">In der Tilde App öffnen</a></p>`,
    // People who end up here (e.g. a link a bot redirected) go on to the app. Bots don't
    // run scripts; a meta refresh would send some of them, Facebook's included, in a loop.
    `<script>location.replace(${JSON.stringify(url).replace(/</g, "\\u003c")})</script>`,
    "</body>",
    "</html>",
    "",
  ]
    .filter(Boolean)
    .join("\n");
}

module.exports = {
  async post(ctx) {
    const { id } = ctx.params;
    const url = `${SITE_URL}/beitrag/${encodeURIComponent(id)}`;

    const post = /^[a-z0-9]{1,64}$/i.test(id)
      ? await strapi.documents("api::post.post").findOne({
          documentId: id,
          status: "published",
          fields: ["titel", "summary", "postType"],
          populate: {
            bild: {
              fields: ["url", "formats", "width", "height", "alternativeText"],
            },
          },
        })
      : null;

    ctx.set("Content-Type", "text/html; charset=utf-8");
    ctx.set("Cache-Control", "public, max-age=600");

    if (!post) {
      ctx.status = 404;
      ctx.body = page({
        title: `Beitrag nicht verfügbar – ${APP_NAME}`,
        description: DEFAULT_DESCRIPTION,
        url,
        image: DEFAULT_IMAGE,
        type: "website",
        status: 404,
      });
      return;
    }

    ctx.body = page({
      title: `${post.titel} – ${APP_NAME}`,
      description: shorten(post.summary) || DEFAULT_DESCRIPTION,
      url,
      image: previewImage(post.bild),
      type: "article",
    });
  },
};
