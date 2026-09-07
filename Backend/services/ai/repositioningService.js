/**
 * Intelligent Driver Repositioning Service
 * 
 * Recommends high-opportunity geographic zones to drivers to minimize idle time
 * and balance supply-demand across city sectors.
 */

const { predictAllZones, calculateDistanceKm, ZONES } = require('./demandPredictionService');

/**
 * Calculates repositioning opportunities for a driver.
 * 
 * @param {Object} driverLocation - { ltd, lng }
 * @param {Object} options - { maxDistanceKm: 12 }
 * @returns {Object} Repositioning recommendations with explainable metrics
 */
async function getRepositioningAdvice(driverLocation, options = {}) {
    const maxRadius = options.maxDistanceKm || 12;

    // Default to city center coordinates if driver has not shared GPS yet
    const driverLat = driverLocation?.ltd || 22.3300;
    const driverLng = driverLocation?.lng || 87.3200;

    // Get current zone predictions
    const zonePredictions = await predictAllZones();

    // Evaluate utility for each zone relative to driver's location
    const scoredOpportunities = zonePredictions.map(zone => {
        const distanceKm = calculateDistanceKm(driverLat, driverLng, zone.center.ltd, zone.center.lng);

        // Distance decay factor: further zones require more fuel/time
        const distancePenalty = 1 + (0.18 * distanceKm);
        
        // Supply deficit ratio: expected rides per driver
        const supplyDeficit = zone.expectedRides / Math.max(1, zone.availableDrivers);

        // Utility: High deficit + close proximity = highest utility
        const utilityScore = parseFloat(((supplyDeficit * 10) / distancePenalty).toFixed(2));

        // Estimated probability increase compared to staying in a stagnant zone
        const baseProb = 40; // baseline 40% chance in average zone
        const boost = Math.min(65, Math.round((supplyDeficit - 0.8) * 28));
        const probabilityBoostPercent = Math.max(12, boost);

        return {
            ...zone,
            distanceKm,
            utilityScore,
            probabilityBoostPercent
        };
    });

    // Filter zones within feasible driving range and sort by utility
    const feasibleZones = scoredOpportunities
        .filter(z => z.distanceKm <= maxRadius)
        .sort((a, b) => b.utilityScore - a.utilityScore);

    const bestZone = feasibleZones[0] || scoredOpportunities[0];

    // Check if driver is already inside the top zone (< 0.8 km)
    const isAlreadyInZone = bestZone.distanceKm <= 0.8;

    let recommendationMessage = '';
    if (isAlreadyInZone) {
        recommendationMessage = `You are currently stationed in ${bestZone.area}, which is in peak demand (${bestZone.expectedRides} rides expected). Remain active nearby to receive priority ride requests.`;
    } else {
        recommendationMessage = `High demand expected near ${bestZone.area} over the next 30 minutes. Moving ${bestZone.distanceKm} km toward this zone could increase your ride probability by ${bestZone.probabilityBoostPercent}%.`;
    }

    return {
        timestamp: new Date().toISOString(),
        driverLocation: { ltd: driverLat, lng: driverLng },
        isAlreadyInOptimalZone: isAlreadyInZone,
        recommendedZone: {
            id: bestZone.zoneId,
            name: bestZone.area,
            center: bestZone.center,
            distanceKm: bestZone.distanceKm,
            predictedDemand: bestZone.predictedDemand,
            expectedRides: bestZone.expectedRides,
            availableDrivers: bestZone.availableDrivers,
            demandSupplyRatio: bestZone.demandSupplyRatio,
            probabilityBoostPercent: bestZone.probabilityBoostPercent,
            utilityScore: bestZone.utilityScore
        },
        message: recommendationMessage,
        alternatives: feasibleZones.slice(1, 3).map(z => ({
            name: z.area,
            distanceKm: z.distanceKm,
            predictedDemand: z.predictedDemand,
            demandSupplyRatio: z.demandSupplyRatio,
            probabilityBoostPercent: z.probabilityBoostPercent
        }))
    };
}

module.exports = {
    getRepositioningAdvice
};
