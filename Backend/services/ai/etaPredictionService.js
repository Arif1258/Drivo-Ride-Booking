/**
 * Forwarder for etaService
 */
const etaService = require('../etaService');

async function predictRideETA(params) {
    const result = await etaService.predictPreBookingETA(params);
    return {
        aiEtaMinutes: result.estimatedMinutes,
        tripDurationMinutes: result.tripDurationMinutes,
        pickupEtaMinutes: result.pickupEtaMinutes,
        trafficDelayMinutes: Math.max(0, result.estimatedMinutes - result.tripDurationMinutes - result.pickupEtaMinutes),
        compositeTrafficFactor: result.trafficMultiplier,
        trafficLevel: result.trafficCondition?.toUpperCase() || 'NORMAL',
        dispatchBufferMinutes: 2,
        explanation: `Traffic level: ${result.trafficCondition}. Estimated arrival: ${result.readable}.`,
        targetArrivalTime: new Date(Date.now() + result.estimatedMinutes * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ...result
    };
}

module.exports = {
    predictRideETA,
    ...etaService
};
