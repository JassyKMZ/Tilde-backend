'use strict';

/**
 * cookie-consent service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::cookie-consent.cookie-consent');
