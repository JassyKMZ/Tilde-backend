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

module.exports = {
  async beforeCreate(event) {
    syncTargetRolesAndIdentity(event?.params?.data);
  },
  async beforeUpdate(event) {
    syncTargetRolesAndIdentity(event?.params?.data);
  },
};
