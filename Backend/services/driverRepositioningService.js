/**
 * Intelligent Driver Repositioning Service for Drivo
 */

const { predictAllZones } = require('./demandPredictionService');
const { haversineKm } = require('./etaService');

async function getDriverRepositioningAdvice(driverLocation = null, options = {}) {
    const maxRadiusKm = options.maxDistanceKm || 12;

    const dLat = driverLocation?.ltd || 22.3300;
    const dLng = driverLocation?.lng || 87.3200;

    const allZonePredictions = await predictAllZones();

    const scoredZones = allZonePredictions.map(zone => {
        const distanceKm = haversineKm(dLat, dLng, zone.center.ltd, zone.center.lng);
        const estimatedTravelMinutes = Math.max(1, Math.round(distanceKm * 2.5));
        const supplyDeficitRatio = zone.predictedRequests / Math.max(1, zone.availableDrivers);
        const distancePenalty = 1 + (0.20 * distanceKm);
        const utilityScore = parseFloat(((supplyDeficitRatio * 10) / distancePenalty).toFixed(2));
        const probabilityBoost = Math.max(15, Math.min(75, Math.round((supplyDeficitRatio - 0.7) * 32)));

        return {
            ...zone,
            distanceKm,
            estimatedTravelMinutes,
            utilityScore,
            probabilityBoostPercent: probabilityBoost,
            isNearby: distanceKm <= maxRadiusKm
        };
    });

    // Check if driver is already inside or right next to any peak zone (< 0.8 km)
    const closestZone = [...scoredZones].sort((a, b) => a.distanceKm - b.distanceKm)[0];
    const isStationedInZone = closestZone && closestZone.distanceKm <= 0.8;

    const feasibleZones = scoredZones
        .filter(z => z.isNearby)
        .sort((a, b) => b.utilityScore - a.utilityScore);

    const topZone = isStationedInZone ? closestZone : (feasibleZones[0] || scoredZones[0]);
    const isAlreadyInZone = topZone.distanceKm <= 0.8;

    let recommendationMessage = '';
    if (isAlreadyInZone) {
        recommendationMessage = `You are currently stationed in ${topZone.name || topZone.area}, which has peak ride demand (${topZone.predictedRequests} rides expected). Remain active nearby to receive priority ride requests.`;
    } else {
        recommendationMessage = `High demand expected near ${topZone.name || topZone.area} over the next 30 minutes. Moving ${topZone.distanceKm} km toward this zone could increase your ride probability by ${topZone.probabilityBoostPercent}%.`;
    }

    const alternatives = feasibleZones.slice(1, 4).map(z => ({
        name: z.name || z.area,
        area: z.area,
        distanceKm: z.distanceKm,
        expectedDemand: z.demandLevel || z.predictedDemand,
        demandSupplyRatio: z.demandSupplyRatio,
        probabilityBoostPercent: z.probabilityBoostPercent
    }));

    return {
        timestamp: new Date().toISOString(),
        driverLocation: { ltd: dLat, lng: dLng },
        hasRecommendation: !isAlreadyInZone,
        isAlreadyInOptimalZone: isAlreadyInZone,
        distanceKm: topZone.distanceKm,
        message: recommendationMessage,
        recommendedZone: {
            id: topZone.zoneId,
            name: topZone.name || topZone.area,
            area: topZone.area,
            center: topZone.center,
            distanceKm: topZone.distanceKm,
            estimatedTravelMinutes: topZone.estimatedTravelMinutes,
            expectedDemand: topZone.demandLevel || topZone.predictedDemand,
            predictedDemand: topZone.demandLevel || topZone.predictedDemand,
            predictedRequests: topZone.predictedRequests,
            expectedRides: topZone.predictedRequests,
            availableDrivers: topZone.availableDrivers,
            probabilityBoostPercent: topZone.probabilityBoostPercent,
            utilityScore: topZone.utilityScore
        },
        alternatives,
        alternativeZones: alternatives
    };
}

async function getRepositionAdviceForCaptain(captainId, options = {}) {
    let driverLoc = null;
    if (captainId) {
        try {
            const captainModel = require('../models/captain.model');
            const captain = await captainModel.findById(captainId);
            if (captain?.location?.coordinates && captain.location.coordinates.length === 2) {
                driverLoc = {
                    lng: captain.location.coordinates[0],
                    ltd: captain.location.coordinates[1]
                };
            }
        } catch (err) {
            console.warn('Could not fetch captain location for repositioning:', err.message);
        }
    }
    const advice = await getDriverRepositioningAdvice(driverLoc, options);
    return {
        ...advice,
        shouldReposition: advice.hasRecommendation
    };
}

module.exports = {
    getDriverRepositioningAdvice,
    getRepositioningAdvice: getDriverRepositioningAdvice,
    getRepositionAdviceForCaptain
};
