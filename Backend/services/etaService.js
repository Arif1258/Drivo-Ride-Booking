/**
 * Centralized Intelligent ETA Engine for Drivo
 *
 * Implements:
 * ETA = Driver-to-Pickup Time + Expected Pickup/Waiting Time + Pickup-to-Destination Travel Time + Traffic/Route Delays
 *
 * Reused across:
 * - Customer App (live tracking & pre-booking)
 * - Driver App (pickup navigation & trip timing)
 * - Admin Dashboard (operational latency metrics)
 * - Zen AI Support Agent (instant genuine ETA responses)
 */

const mapService = require('./maps.service');

// Hourly traffic multiplier curve (24 hours)
const TRAFFIC_HOUR_CURVE = [
    1.00, 1.00, 1.00, 1.00, 1.00, 1.05, // 00 - 05 (Night/Early morning)
    1.15, 1.35, 1.50, 1.40, 1.25, 1.15, // 06 - 11 (Morning Rush)
    1.25, 1.20, 1.15, 1.20, 1.35, 1.45, // 12 - 17 (Afternoon / Midday)
    1.55, 1.50, 1.35, 1.20, 1.10, 1.00  // 18 - 23 (Evening Rush & Night)
];

// Area congestion sensitivity keywords
const AREA_CONGESTION_FACTORS = {
    'station': 1.25,
    'railway': 1.25,
    'market': 1.30,
    'bazar': 1.30,
    'bazaar': 1.30,
    'hospital': 1.20,
    'airport': 1.20,
    'junction': 1.25,
    'highway': 0.85,
    'bypass': 0.90,
    'campus': 1.10
};

// Haversine distance helper in kilometers
function haversineKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 3.0;
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
}

function getTrafficMultiplier(pickup = '', destination = '', targetDate = new Date()) {
    const hour = targetDate.getHours();
    const day = targetDate.getDay();
    const isWeekend = (day === 0 || day === 6);

    const baseHourFactor = TRAFFIC_HOUR_CURVE[hour] || 1.1;
    const dayFactor = isWeekend && hour >= 17 ? 1.15 : (isWeekend ? 0.95 : 1.05);

    const text = `${pickup} ${destination}`.toLowerCase();
    let areaFactor = 1.0;
    for (const [kw, factor] of Object.entries(AREA_CONGESTION_FACTORS)) {
        if (text.includes(kw)) {
            areaFactor = Math.max(areaFactor, factor);
        }
    }

    return parseFloat((baseHourFactor * dayFactor * areaFactor).toFixed(2));
}

/**
 * Calculates accurate ETA for an active or created ride.
 *
 * @param {Object} ride - Mongoose ride document or plain object
 * @param {Object} [driverLocation] - { ltd, lng }
 * @returns {Promise<Object>} Detailed ETA report
 */
async function calculateRideETA(ride, driverLocation = null) {
    if (!ride) {
        return {
            totalEtaMinutes: 15,
            pickupEtaMinutes: 5,
            tripDurationMinutes: 10,
            status: 'unknown',
            readable: '12-18 mins',
            breakdown: { driverToPickup: 5, waitingDelay: 2, tripDuration: 10, trafficDelay: 1 }
        };
    }

    // Terminal states
    if (ride.status === 'completed') {
        return {
            totalEtaMinutes: 0,
            pickupEtaMinutes: 0,
            tripDurationMinutes: 0,
            status: 'completed',
            readable: 'Arrived at Destination',
            breakdown: { driverToPickup: 0, waitingDelay: 0, tripDuration: 0, trafficDelay: 0 }
        };
    }
    if (ride.status === 'cancelled') {
        return {
            totalEtaMinutes: 0,
            pickupEtaMinutes: 0,
            tripDurationMinutes: 0,
            status: 'cancelled',
            readable: 'Ride Cancelled',
            breakdown: { driverToPickup: 0, waitingDelay: 0, tripDuration: 0, trafficDelay: 0 }
        };
    }

    const trafficFactor = getTrafficMultiplier(ride.pickup, ride.destination);

    // 1. Calculate Base Trip Duration (Pickup -> Destination)
    let tripDurationMinutes = 12;
    let tripDistanceMeters = ride.distance || 4000;

    if (ride.duration) {
        tripDurationMinutes = Math.max(1, Math.round(ride.duration / 60));
    } else if (ride.pickup && ride.destination) {
        try {
            const distanceTime = await mapService.getDistanceTime(ride.pickup, ride.destination);
            if (distanceTime?.duration?.value) {
                tripDurationMinutes = Math.max(1, Math.round(distanceTime.duration.value / 60));
            }
            if (distanceTime?.distance?.value) {
                tripDistanceMeters = distanceTime.distance.value;
            }
        } catch (err) {
            // Heuristic fallback: ~2.4 mins per km
            const distKm = tripDistanceMeters / 1000;
            tripDurationMinutes = Math.max(2, Math.round(distKm * 2.4));
        }
    }

    // 2. Calculate Driver-to-Pickup Time
    let pickupEtaMinutes = 4;
    let driverPickupDistanceKm = 1.5;

    // Resolve driver coordinates
    let dLat = driverLocation?.ltd;
    let dLng = driverLocation?.lng;
    if (!dLat && ride.captain?.location?.coordinates?.length === 2) {
        dLng = ride.captain.location.coordinates[0];
        dLat = ride.captain.location.coordinates[1];
    }

    // Resolve pickup coordinates
    const pLat = ride.originCoordinates?.ltd;
    const pLng = ride.originCoordinates?.lng;

    if (dLat && dLng && pLat && pLng) {
        driverPickupDistanceKm = haversineKm(pLat, pLng, dLat, dLng);
        // ~2.5 mins per km in city + 1 min dispatch reaction
        pickupEtaMinutes = Math.max(1, Math.round(1 + driverPickupDistanceKm * 2.5));
    } else if (ride.status === 'pending') {
        pickupEtaMinutes = 6; // searching/dispatch buffer
    }

    // 3. Expected Pickup / Waiting Delay (Boarding time)
    const waitingDelayMinutes = ride.status === 'accepted' ? 2 : 0;

    // 4. Traffic Delay Component
    const trafficDelayMinutes = Math.max(0, Math.round((tripDurationMinutes * (trafficFactor - 1.0))));

    // Total ETA according to current state
    let totalEtaMinutes;
    let readable;

    if (ride.status === 'ongoing') {
        // Driver is currently driving passenger to destination
        // Deduct elapsed time since ride started if available
        let elapsedMins = 0;
        if (ride.startedAt) {
            elapsedMins = Math.round((Date.now() - new Date(ride.startedAt).getTime()) / 60000);
        }
        totalEtaMinutes = Math.max(2, (tripDurationMinutes + trafficDelayMinutes) - elapsedMins);
        pickupEtaMinutes = 0;
        readable = `${Math.max(1, totalEtaMinutes - 2)}-${totalEtaMinutes + 2} mins to destination`;
    } else {
        // Driver heading to pickup + trip
        totalEtaMinutes = pickupEtaMinutes + waitingDelayMinutes + tripDurationMinutes + trafficDelayMinutes;
        readable = `Driver arriving in ~${pickupEtaMinutes} mins (Trip: ${tripDurationMinutes + trafficDelayMinutes} mins)`;
    }

    const arrivalDate = new Date(Date.now() + totalEtaMinutes * 60000);
    const targetArrivalFormatted = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return {
        totalEtaMinutes,
        pickupEtaMinutes,
        tripDurationMinutes: tripDurationMinutes + trafficDelayMinutes,
        status: ride.status,
        readable,
        targetArrivalTime: targetArrivalFormatted,
        trafficCondition: trafficFactor >= 1.3 ? 'Heavy Traffic' : trafficFactor >= 1.15 ? 'Moderate' : 'Smooth Flow',
        trafficMultiplier: trafficFactor,
        breakdown: {
            driverToPickupMinutes: pickupEtaMinutes,
            waitingDelayMinutes,
            baseTripMinutes: tripDurationMinutes,
            trafficDelayMinutes
        }
    };
}

function detectZoneCongestionMultiplier(pickup = '', destination = '') {
    const text = `${pickup} ${destination}`.toLowerCase();
    let multiplier = 1.0;
    for (const [kw, factor] of Object.entries(AREA_CONGESTION_FACTORS)) {
        if (text.includes(kw)) {
            multiplier = Math.max(multiplier, factor);
        }
    }
    return multiplier;
}

/**
 * Pre-booking ETA prediction before ride is created.
 */
async function predictPreBookingETA({
    pickup,
    destination,
    vehicleType = 'car',
    baseDistanceMeters = null,
    baseDurationSeconds = null,
    targetTime = new Date()
}) {
    if (!pickup || !destination) {
        return {
            aiEtaMinutes: 15,
            estimatedMinutes: 15,
            baseEtaMinutes: 10,
            tripDurationMinutes: 10,
            pickupEtaMinutes: 4,
            trafficDelayMinutes: 1,
            confidencePercent: 85,
            badgeText: 'AI Estimated Arrival: ~15 mins',
            trafficMultiplier: 1.1,
            trafficCondition: 'Normal',
            factors: { compositeTrafficFactor: 1.1, timeOfDayMultiplier: 1.0 },
            readable: '12-16 mins'
        };
    }

    const targetDate = targetTime instanceof Date ? targetTime : new Date(targetTime);
    const hour = targetDate.getHours();
    const baseHourFactor = TRAFFIC_HOUR_CURVE[hour] || 1.1;
    const trafficFactor = getTrafficMultiplier(pickup, destination, targetDate);

    let durationSec = baseDurationSeconds;
    let distanceM = baseDistanceMeters;

    if ((!durationSec || !distanceM) && pickup && destination) {
        try {
            const distanceTime = await mapService.getDistanceTime(pickup, destination);
            if (distanceTime?.duration?.value) durationSec = distanceTime.duration.value;
            if (distanceTime?.distance?.value) distanceM = distanceTime.distance.value;
        } catch (err) {
            console.warn('Mapbox pre-booking ETA fallback:', err.message);
        }
    }

    if (!durationSec) durationSec = 600;
    if (!distanceM) distanceM = 3500;

    const baseMinutes = Math.max(1, Math.round(durationSec / 60));
    const vehicleFactor = vehicleType === 'motorcycle' ? 0.85 : vehicleType === 'auto' ? 1.05 : 1.0;
    const tripMinutes = Math.max(2, Math.round(baseMinutes * trafficFactor * vehicleFactor));
    const pickupEtaMinutes = 3;
    const totalMinutes = tripMinutes + pickupEtaMinutes;
    const trafficDelayMinutes = Math.max(0, totalMinutes - baseMinutes);

    return {
        aiEtaMinutes: totalMinutes,
        estimatedMinutes: totalMinutes,
        baseEtaMinutes: baseMinutes,
        tripDurationMinutes: tripMinutes,
        pickupEtaMinutes,
        trafficDelayMinutes,
        confidencePercent: 88,
        badgeText: `AI Estimated Arrival: ~${totalMinutes} mins`,
        trafficMultiplier: trafficFactor,
        trafficCondition: trafficFactor >= 1.3 ? 'Heavy' : trafficFactor >= 1.15 ? 'Moderate' : 'Normal',
        factors: {
            compositeTrafficFactor: trafficFactor,
            timeOfDayMultiplier: baseHourFactor,
            zoneCongestionMultiplier: detectZoneCongestionMultiplier(pickup, destination)
        },
        readable: `${Math.max(1, totalMinutes - 3)}-${totalMinutes + 3} mins`
    };
}

module.exports = {
    calculateRideETA,
    predictPreBookingETA,
    getTrafficMultiplier,
    detectZoneCongestionMultiplier,
    haversineKm
};
