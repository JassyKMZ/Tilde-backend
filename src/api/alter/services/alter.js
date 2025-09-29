'use strict';

/**
 * alter service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::alter.alter');
