"use strict";

const MIN_ALLOWED = 0;
const MAX_ALLOWED = 18;

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

module.exports = {
  async beforeCreate(event) {
    const { data } = event.params;
    if (!data) return;
    validateRange(data);
  },

  async beforeUpdate(event) {
    const { data } = event.params;
    if (!data) return;
    validateRange(data);
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
        }
      );
    }
  },
};
