/**
 * AI ETA Prediction Service
 * 
 * Predicts accurate ride arrival and trip duration by combining base map estimates
 * with time-of-day traffic models, day-of-week patterns, and localized congestion indices.
 */

const mapService = require('../maps.service');

// Congestion multipliers by hour (24 hours)
const TRAFFIC_HOUR_CURVE = [
    1.00, 1.00, 1.00, 1.00, 1.00, 1.05, // 00 - 05
    1.15, 1.35, 1.50, 1.40, 1.20, 1.15, // 06 - 11 (Morning rush)
    1.25, 1.20, 1.15, 1.20, 1.35, 1.45, // 12 - 17
    1.55, 1.50, 1.30, 1.15, 1.05, 1.00  // 18 - 23 (Evening rush)
];

// Area congestion multipliers for known traffic bottlenecks
const AREA_CONGESTION_FACTORS = {
    'station': 1.25,
    'railway': 1.25,
    'market': 1.30,
    'bazar': 1.30,
    'bazaar': 1.30,
    'hospital': 1.20,
    'highway': 0.85,
    'bypass': 0.90,
    'campus': 1.10
};

function detectZoneCongestionMultiplier(pickup = '', destination = '') {
    const text = `${pickup} ${destination}`.toLowerCase();
    let multiplier = 1.0;

    for (const [keyword, factor] of Object.entries(AREA_CONGESTION_FACTORS)) {
        if (text.includes(keyword)) {
            multiplier = Math.max(multiplier, factor);
        }
    }

    return multiplier;
}

/**
 * Predicts ride ETA using distance, time-of-day traffic, and localized congestion.
 * 
 * @param {Object} params
 * @param {string} params.pickup
 * @param {string} params.destination
 * @param {number} [params.baseDistanceMeters]
 * @param {number} [params.baseDurationSeconds]
 * @param {Date} [params.targetTime]
 * @returns {Object} AI ETA prediction with explainable breakdown
 */
async function predictRideETA({ pickup, destination, baseDistanceMeters, baseDurationSeconds, targetTime = new Date() }) {
    let distanceMeters = baseDistanceMeters;
    let baseDuration = baseDurationSeconds;

    // Fetch Mapbox distance and duration if not provided
    if ((!distanceMeters || !baseDuration) && pickup && destination) {
        try {
            const distanceTime = await mapService.getDistanceTime(pickup, destination);
            if (distanceTime?.distance?.value) distanceMeters = distanceTime.distance.value;
            if (distanceTime?.duration?.value) baseDuration = distanceTime.duration.value;
        } catch (err) {
            console.warn('Mapbox ETA lookup fallback to heuristic:', err.message);
        }
    }

    // Default fallback if distance is still unknown (assume 4 km trip)
    if (!distanceMeters) distanceMeters = 4000;
    if (!baseDuration) baseDuration = Math.round((distanceMeters / 1000) * 150); // ~24 km/h baseline

    const baseMinutes = Math.max(1, Math.round(baseDuration / 60));
    const hour = targetTime.getHours();
    const day = targetTime.getDay();

    // 1. Time-of-day traffic multiplier
    const timeOfDayMultiplier = TRAFFIC_HOUR_CURVE[hour] || 1.1;

    // 2. Day of week multiplier (weekend evenings slightly heavier)
    const isWeekend = (day === 0 || day === 6);
    const dayMultiplier = isWeekend && hour >= 17 ? 1.15 : (isWeekend ? 0.95 : 1.05);

    // 3. Area / Bottleneck congestion multiplier
    const zoneMultiplier = detectZoneCongestionMultiplier(pickup, destination);

    // 4. Combined Traffic Index
    const compositeTrafficFactor = parseFloat((timeOfDayMultiplier * dayMultiplier * zoneMultiplier).toFixed(2));

    // Dynamic buffer for dispatch, boarding & stop lights (1.5 - 3 mins depending on distance)
    const dispatchBufferMinutes = distanceMeters > 5000 ? 2 : 1;

    // AI Predicted ETA
    const aiEtaMinutes = Math.max(
        baseMinutes,
        Math.round((baseMinutes * compositeTrafficFactor) + dispatchBufferMinutes)
    );

    const trafficDelayMinutes = Math.max(0, aiEtaMinutes - baseMinutes);
    const confidencePercent = Math.min(94, Math.max(82, 90 - (trafficDelayMinutes * 2)));

    // Human-readable summary
    let trafficCondition = 'Normal Flow';
    if (compositeTrafficFactor >= 1.4) {
        trafficCondition = 'Heavy Congestion';
    } else if (compositeTrafficFactor >= 1.2) {
        trafficCondition = 'Moderate Congestion';
    } else if (compositeTrafficFactor < 1.0) {
        trafficCondition = 'Fast Flow';
    }

    return {
        aiEtaMinutes,
        baseEtaMinutes: baseMinutes,
        trafficDelayMinutes,
        confidencePercent,
        trafficCondition,
        badgeText: `AI Estimated Arrival: ${aiEtaMinutes} min`,
        factors: {
            distanceKm: parseFloat((distanceMeters / 1000).toFixed(1)),
            compositeTrafficFactor,
            timeOfDayMultiplier,
            dayMultiplier,
            zoneMultiplier,
            dispatchBufferMinutes
        },
        explanation: `Base duration ${baseMinutes}m adjusted by ${compositeTrafficFactor}x traffic factor (${trafficCondition}) at ${String(hour).padStart(2, '0')}:00.`
    };
}

module.exports = {
    predictRideETA,
    TRAFFIC_HOUR_CURVE,
    detectZoneCongestionMultiplier
};
