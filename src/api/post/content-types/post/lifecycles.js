"use strict";

function normalizeIds(values = []) {
  return [
    ...new Set(
      (Array.isArray(values) ? values : [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];
}

function extractRelationIds(value) {
  const ids = [];
  const pushValue = (item) => {
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

    if (Array.isArray(item.connect)) item.connect.forEach(pushValue);
    if (Array.isArray(item.set)) item.set.forEach(pushValue);
    if (Array.isArray(item.data)) item.data.forEach(pushValue);
  };

  if (Array.isArray(value)) value.forEach(pushValue);
  else if (value && typeof value === "object") pushValue(value);

  return [...new Set(ids)];
}

function syncTargetRolesAndIdentity(data) {
  if (!data || typeof data !== "object") return;

  const hasTargetRoles = Object.prototype.hasOwnProperty.call(
    data,
    "target_roles",
  );
  const hasIdentity = Object.prototype.hasOwnProperty.call(data, "identity");

  if (!hasTargetRoles && !hasIdentity) return;

  if (hasTargetRoles) {
    const relationIds = extractRelationIds(data.target_roles);
    data.identity = relationIds;
    return;
  }

  if (hasIdentity) {
    const identityIds = normalizeIds(data.identity);
    data.identity = identityIds;
    data.target_roles = { set: identityIds.map((id) => ({ id })) };
  }
}

// Send E-Mail to roles Super Admin and Supervisor when a post is ready for review (inside post: publish is set to true)
function isReviewRole(role) {
  const code = String(role?.code || "").toLowerCase();
  const name = String(role?.name || "").toLowerCase();
  return (
    code === "strapi-super-admin" ||
    code.includes("supervisor") ||
    name.includes("supervisor")
  );
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

async function notifyReviewers(post) {
  if (!post?.publish) return;

  try {
    const admins = await strapi.db.query("admin::user").findMany({
      populate: { roles: true },
    });
    const recipients = [
      ...new Set(
        admins
          .filter((admin) => admin.email && admin.roles?.some(isReviewRole))
          .map((admin) => admin.email),
      ),
    ];
    const title = post.titel || "Ohne Titel";
    const escapedTitle = escapeHtml(title);

    for (const recipient of recipients) {
      try {
        await strapi
          .plugin("email")
          .service("email")
          .send({
            to: recipient,
            subject: `Post zur Prüfung bereit: ${title}`,
            text: `Der Post "${title}" wurde zur Veröffentlichung eingereicht. Bitte prüfe ihn im Strapi-Adminbereich. Bitte antworten Sie nicht auf diese E-Mail, da sie automatisch generiert wurde. Mit freundlichen Grüßen, Ihr Tilde-Team`,
            html: `<p>Der Post <strong>${escapedTitle}</strong> wurde zur Veröffentlichung eingereicht.</p><p>Bitte prüfe ihn im Strapi-Adminbereich.</p><p>Bitte antworten Sie nicht auf diese E-Mail, da sie automatisch generiert wurde.</p><br/><p>Mit freundlichen Grüßen,<br/>Ihr Tilde-Team</p>
            `,
          });
      } catch (error) {
        strapi.log.error(`Failed to email post reviewer ${recipient}:`, error);
      }
    }
  } catch (error) {
    strapi.log.error("Failed to find post reviewers:", error);
  }
}

module.exports = {
  async beforeCreate(event) {
    syncTargetRolesAndIdentity(event?.params?.data);
  },
  async afterCreate(event) {
    await notifyReviewers(event?.result);
  },
  async beforeUpdate(event) {
    syncTargetRolesAndIdentity(event?.params?.data);

    if (event?.params?.where) {
      const existing = await strapi.db.query("api::post.post").findOne({
        where: event.params.where,
        select: ["publish"],
      });
      event.state = {
        ...event.state,
        wasPublishRequested: existing?.publish === true,
      };
    }
  },
  async afterUpdate(event) {
    if (
      event?.result?.publish === true &&
      event.state?.wasPublishRequested !== true
    ) {
      await notifyReviewers(event.result);
    }
  },
};
