"use strict";

/**
 * post controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::post.post", {
  /**
   * Custom find action that automatically filters out events older than 14 days
   * while allowing all non-events regardless of date.
   *
   * This ensures pagination.total only counts displayable posts and prevents
   * loading pages of expired events.
   */
  async find(ctx) {
    // Check if the request already includes custom eventDate filtering
    const queryString = new URLSearchParams(ctx.request.query).toString();
    const hasExplicitEventDateFilter = queryString.includes("eventDate");

    // Only apply automatic expiration filter if no custom date filter exists
    if (!hasExplicitEventDateFilter) {
      const now = new Date();
      const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
      const cutoffDate = new Date(now.getTime() - twoWeeksMs);
      const cutoffISO = cutoffDate.toISOString();

      // Get existing filters from context, or create empty object
      const existingFilters = ctx.query.filters || {};

      // Build auto-expiry filter:
      // Show (isEvent = false) OR (isEvent = true AND (eventDate >= cutoff OR eventDate is null))
      // This includes:
      // - All non-events, regardless of date
      // - Recent events (with dates >= cutoff)
      // - On-demand events without dates (eventDate: null)
      const autoExpiryFilter = {
        ...existingFilters,
        $or: [
          { isEvent: { $eq: false } }, // All non-events, regardless of date
          {
            // Events: both recent events and on-demand events without dates
            $and: [
              { isEvent: { $eq: true } },
              {
                // Recent events OR events without dates (on-demand/flexible)
                $or: [
                  { eventDate: { $gte: cutoffISO } }, // Recent events with dates
                  { eventDate: { $eq: null } }, // On-demand events without dates
                ],
              },
            ],
          },
        ],
      };

      // Update the query filters with our auto-expiry logic
      ctx.query.filters = autoExpiryFilter;
    }

    // Call the core controller's find method with the potentially modified filters
    return super.find(ctx);
  },
});
