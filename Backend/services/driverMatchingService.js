/**
 * Smart Multi-Factor Driver Matching Service for Drivo
 *
 * Chooses the MOST SUITABLE driver for the ride, NOT simply the closest driver.
 *
 * Scoring Formula:
 * Driver Score = (w_eta * S_eta) +
 *                (w_proximity * S_proximity) +
 *                (w_reliability * S_reliability) +
 *                (w_acceptance * S_acceptance) +
 *                (w_rating * S_rating) +
 *                (w_vehicle * S_vehicle) +
 *                (w_idletime * S_idletime)
 */

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
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

function estimatePickupEta(distanceKm) {
    const dispatchDelayMin = 1.0;
    const minutesPerKm = 2.4;
    return Math.max(1, Math.round(dispatchDelayMin + (distanceKm * minutesPerKm)));
}

const DEFAULT_MATCHING_WEIGHTS = {
    eta: 0.25,
    proximity: 0.20,
    reliability: 0.15,
    acceptance: 0.15,
    rating: 0.10,
    vehicle: 0.10,
    idleTime: 0.05
};

const DEFAULT_WEIGHTS = DEFAULT_MATCHING_WEIGHTS;

function scoreCandidateDriver(captain, pickupCoords, rideRequirements = {}, weights = DEFAULT_MATCHING_WEIGHTS) {
    let driverLng = null;
    let driverLat = null;

    if (captain.location?.coordinates?.length === 2) {
        driverLng = captain.location.coordinates[0];
        driverLat = captain.location.coordinates[1];
    } else if (captain.latitude && captain.longitude) {
        driverLat = captain.latitude;
        driverLng = captain.longitude;
    }

    const distanceKm = (driverLat && driverLng && pickupCoords?.ltd && pickupCoords?.lng)
        ? calculateHaversineDistance(pickupCoords.ltd, pickupCoords.lng, driverLat, driverLng)
        : 3.0;

    const pickupEtaMinutes = estimatePickupEta(distanceKm);

    const rating = typeof captain.rating === 'number' ? captain.rating : 4.8;
    const acceptanceRate = typeof captain.acceptanceRate === 'number' ? captain.acceptanceRate : 92;
    const cancellationRate = typeof captain.cancellationRate === 'number' ? captain.cancellationRate : 3;
    const onTimeRate = typeof captain.onTimeRate === 'number' ? captain.onTimeRate : 96;
    const captainStatus = captain.status || 'active';

    const proximityScore = Math.max(0, Math.min(100, Math.round(100 - (distanceKm * 10))));
    const etaScore = Math.max(0, Math.min(100, Math.round(100 - (pickupEtaMinutes * 6))));
    const ratingScore = Math.max(0, Math.min(100, Math.round(((rating - 3.0) / 2.0) * 100)));
    const acceptanceScore = Math.max(0, Math.min(100, acceptanceRate));
    const reliabilityScore = Math.max(0, Math.min(100, Math.round(onTimeRate - (cancellationRate * 3.5))));

    const requestedVehicle = (rideRequirements.vehicleType || 'car').toLowerCase();
    const captainVehicle = (captain.vehicle?.vehicleType || 'car').toLowerCase();
    let vehicleScore = 70;
    if (captainVehicle === requestedVehicle) {
        vehicleScore = 100;
    } else if (requestedVehicle === 'auto' && captainVehicle === 'car') {
        vehicleScore = 80;
    } else {
        vehicleScore = 50;
    }

    const idleTimeScore = 75;
    const availabilityMultiplier = captainStatus === 'active' ? 1.0 : 0.6;

    const rawScore = (
        (proximityScore * (weights.proximity || 0.20)) +
        (etaScore * (weights.eta || 0.25)) +
        (reliabilityScore * (weights.reliability || 0.15)) +
        (acceptanceScore * (weights.acceptance || 0.15)) +
        (ratingScore * (weights.rating || 0.10)) +
        (vehicleScore * (weights.vehicle || 0.10)) +
        (idleTimeScore * (weights.idleTime || 0.05))
    ) * availabilityMultiplier;

    const matchScore = parseFloat(Math.min(100, Math.max(10, rawScore)).toFixed(1));

    const rationaleParts = [];
    if (rating >= 4.7) rationaleParts.push(`Top-rated (${rating}★)`);
    if (cancellationRate <= 3) rationaleParts.push(`High reliability (${cancellationRate}% cancel rate)`);
    if (acceptanceRate >= 90) rationaleParts.push(`${acceptanceRate}% acceptance`);
    if (pickupEtaMinutes <= 4) rationaleParts.push(`Fast ETA (~${pickupEtaMinutes}m)`);
    if (captainVehicle === requestedVehicle) rationaleParts.push(`Exact ${requestedVehicle} match`);

    return {
        driverId: captain._id,
        captainId: captain._id,
        driverName: `${captain.fullname?.firstname || 'Captain'} ${captain.fullname?.lastname || ''}`.trim(),
        captainName: `${captain.fullname?.firstname || 'Captain'} ${captain.fullname?.lastname || ''}`.trim(),
        vehicle: captain.vehicle,
        distanceKm,
        pickupEtaMinutes,
        matchScore,
        suitabilityTier: matchScore >= 85 ? 'BEST_MATCH' : matchScore >= 70 ? 'STRONG_MATCH' : 'ACCEPTABLE',
        explanation: rationaleParts.join(' • ') || 'Standard matched driver',
        driver: {
            _id: captain._id,
            fullname: captain.fullname,
            vehicle: captain.vehicle,
            rating,
            acceptanceRate,
            cancellationRate
        },
        factors: {
            proximity: proximityScore,
            eta: etaScore,
            rating: ratingScore,
            acceptance: acceptanceScore,
            reliability: reliabilityScore,
            vehicleMatch: vehicleScore,
            idleTime: idleTimeScore
        },
        breakdown: {
            proximityScore,
            etaScore,
            ratingScore,
            acceptanceScore,
            reliabilityScore,
            vehicleScore,
            idleTimeScore
        }
    };
}

const scoreDriver = scoreCandidateDriver;

function rankDrivers(pickupCoords, candidateCaptains = [], rideRequirements = {}, customWeights = null) {
    if (!Array.isArray(candidateCaptains) || candidateCaptains.length === 0) {
        return [];
    }

    const weights = customWeights ? { ...DEFAULT_MATCHING_WEIGHTS, ...customWeights } : DEFAULT_MATCHING_WEIGHTS;

    const scored = candidateCaptains.map(captain =>
        scoreCandidateDriver(captain, pickupCoords, rideRequirements, weights)
    );

    // Sort descending by composite match score
    scored.sort((a, b) => b.matchScore - a.matchScore);

    return scored.map((item, index) => ({
        ...item,
        rank: index + 1
    }));
}

module.exports = {
    rankDrivers,
    scoreDriver,
    scoreCandidateDriver,
    calculateHaversineDistance,
    estimatePickupEta,
    DEFAULT_WEIGHTS,
    DEFAULT_MATCHING_WEIGHTS
};
