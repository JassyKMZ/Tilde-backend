'use strict';

/**
 * alter router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::alter.alter');
