"use strict";

const MIN_ALLOWED = 0;
const MAX_ALLOWED = 99;

function toIntOrNull(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return Math.trunc(n);
}

function validateRange(data) {
  // Normalize possible string inputs to integers
  const minRaw = data.minAge;
  const maxRaw = data.maxAge;
  const minAge = toIntOrNull(minRaw);
  const maxAge = toIntOrNull(maxRaw);

  // If neither provided, nothing to validate
  if (minAge === null && maxAge === null) return;

  // If one provided but not the other, validate bounds for provided one
  if (minAge !== null) {
    if (minAge < MIN_ALLOWED || minAge > MAX_ALLOWED) {
      throw new Error(`minAge out of bounds (${MIN_ALLOWED}–${MAX_ALLOWED})`);
    }
  }
  if (maxAge !== null) {
    if (maxAge < MIN_ALLOWED || maxAge > MAX_ALLOWED) {
      throw new Error(`maxAge out of bounds (${MIN_ALLOWED}–${MAX_ALLOWED})`);
    }
  }

  // If both present, ensure logical order
  if (minAge !== null && maxAge !== null && minAge > maxAge) {
    throw new Error("minAge must be less than or equal to maxAge");
  }

  // Persist normalized ints back into data so the DB receives integers
  if (minAge !== null) data.minAge = minAge;
  if (maxAge !== null) data.maxAge = maxAge;
}

function extractRelationIds(value) {
  const ids = [];

  const pushValue = (item) => {
    if (item === null || item === undefined) return;
    if (typeof item === "number" || typeof item === "string") {
      const parsed = Number(item);
      if (Number.isFinite(parsed)) ids.push(parsed);
      return;
    }

    if (typeof item !== "object") return;

    const directId = item.id ?? item.documentId ?? item.value;
    if (directId !== undefined && directId !== null && directId !== "") {
      const parsed = Number(directId);
      if (Number.isFinite(parsed)) ids.push(parsed);
    }

    if (Array.isArray(item.connect)) item.connect.forEach(pushValue);
    if (Array.isArray(item.set)) item.set.forEach(pushValue);
    if (Array.isArray(item.data)) item.data.forEach(pushValue);
  };

  if (Array.isArray(value)) {
    value.forEach(pushValue);
  } else if (value && typeof value === "object") {
    if (Array.isArray(value.connect)) value.connect.forEach(pushValue);
    if (Array.isArray(value.set)) value.set.forEach(pushValue);
    if (Array.isArray(value.data)) value.data.forEach(pushValue);
  }

  return [...new Set(ids)];
}

function hasNonEmptyName(value) {
  return typeof value === "string" && value.trim().length > 0;
}

async function validateOnboardingCompletion(data, where) {
  if (data?.onboardingComplete !== true) return;

  let existing = null;
  if (where && typeof where === "object") {
    const whereId = where.id ?? null;
    const whereDocumentId = where.documentId ?? null;
    if (whereId || whereDocumentId) {
      existing = await strapi.db
        .query("api::user-profile.user-profile")
        .findOne({
          where: whereId ? { id: whereId } : { documentId: whereDocumentId },
        });
    }
  }

  const effectiveName = hasNonEmptyName(data.fullName)
    ? data.fullName.trim()
    : hasNonEmptyName(existing?.fullName)
      ? existing.fullName.trim()
      : "";

  if (!effectiveName) {
    throw new Error(
      "Onboarding kann nur abgeschlossen werden, wenn fullName gesetzt ist",
    );
  }

  data.fullName = effectiveName;
}

module.exports = {
  async beforeCreate(event) {
    const { data } = event.params;
    if (!data) return;
    validateRange(data);
    await validateOnboardingCompletion(data, null);
  },

  async beforeUpdate(event) {
    const { data, where } = event.params;
    if (!data) return;
    validateRange(data);
    await validateOnboardingCompletion(data, where);
  },
  async afterCreate(event) {
    const { result } = event;

    if (result && result.id && result.user) {
      // Ensure user gets linked to their profile
      await strapi.entityService.update(
        "plugin::users-permissions.user",
        result.user.id,
        {
          data: {
            user_profile: result.id, // Link the newly created profile to the user
          },
        },
      );
    }
  },
};
