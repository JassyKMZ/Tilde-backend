'use strict';

/**
 * kurztipp service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::kurztipp.kurztipp');
