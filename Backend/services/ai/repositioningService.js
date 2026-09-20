/**
 * Forwarder for driverRepositioningService
 */
const driverRepositioningService = require('../driverRepositioningService');

module.exports = {
    getRepositioningAdvice: driverRepositioningService.getDriverRepositioningAdvice,
    ...driverRepositioningService
};
