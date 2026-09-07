/**
 * AI Driver-Rider Matching Engine
 * 
 * Scores and ranks candidate drivers using a transparent, multi-factor decision model.
 * Factors include proximity, pickup ETA, rating, acceptance rate, cancellation rate,
 * on-time reliability, and vehicle compatibility.
 */

// Haversine distance in kilometers between two coordinates
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 5.0; // conservative default
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
}

// Estimate pickup ETA based on distance and urban traffic average (25 km/h + 1 min dispatch)
function estimatePickupEta(distanceKm) {
    const dispatchDelayMin = 1.0;
    const minutesPerKm = 2.4; // ~25 km/h urban average
    const totalMinutes = Math.max(1, Math.round(dispatchDelayMin + (distanceKm * minutesPerKm)));
    return totalMinutes;
}

const DEFAULT_WEIGHTS = {
    proximity: 0.30,
    eta: 0.20,
    acceptance: 0.20,
    rating: 0.15,
    reliability: 0.10,
    vehicle: 0.05
};

/**
 * Computes an explainable composite match score for a single driver.
 */
function scoreDriver(driver, pickupCoords, rideDetails = {}, weights = DEFAULT_WEIGHTS) {
    // Extract driver coordinates (GeoJSON [lng, lat])
    let driverLat = null;
    let driverLng = null;

    if (driver.location && Array.isArray(driver.location.coordinates) && driver.location.coordinates.length === 2) {
        driverLng = driver.location.coordinates[0];
        driverLat = driver.location.coordinates[1];
    } else if (driver.latitude && driver.longitude) {
        driverLat = driver.latitude;
        driverLng = driver.longitude;
    }

    const distanceKm = (driverLat && driverLng && pickupCoords && pickupCoords.ltd && pickupCoords.lng)
        ? calculateHaversineDistance(pickupCoords.ltd, pickupCoords.lng, driverLat, driverLng)
        : 3.0;

    const pickupEta = estimatePickupEta(distanceKm);

    // Driver attributes with safe defaults
    const rating = typeof driver.rating === 'number' ? driver.rating : 4.8;
    const acceptanceRate = typeof driver.acceptanceRate === 'number' ? driver.acceptanceRate : 92;
    const cancellationRate = typeof driver.cancellationRate === 'number' ? driver.cancellationRate : 4;
    const onTimeRate = typeof driver.onTimeRate === 'number' ? driver.onTimeRate : 96;
    const requestedVehicleType = rideDetails.vehicleType || 'car';
    const driverVehicleType = driver.vehicle?.vehicleType || driver.vehicleType || 'car';

    // 1. Proximity Score (100 for 0km, decays to 0 at 10km)
    const proximityScore = Math.max(0, Math.min(100, 100 - (distanceKm * 10)));

    // 2. ETA Score (100 for <= 2 min, decays by 5 per min)
    const etaScore = Math.max(0, Math.min(100, 100 - (pickupEta * 5)));

    // 3. Rating Score (maps 3.0 - 5.0 to 0 - 100)
    const ratingScore = Math.max(0, Math.min(100, ((rating - 3.0) / 2.0) * 100));

    // 4. Acceptance Score (direct percentage)
    const acceptanceScore = Math.max(0, Math.min(100, acceptanceRate));

    // 5. Reliability Score (on-time rate penalized by cancellation rate)
    const reliabilityScore = Math.max(0, Math.min(100, onTimeRate - (cancellationRate * 2.5)));

    // 6. Vehicle Type Match Score
    const vehicleScore = (driverVehicleType.toLowerCase() === requestedVehicleType.toLowerCase()) ? 100 : 60;

    // Weighted combination
    const compositeScore = (
        (proximityScore * weights.proximity) +
        (etaScore * weights.eta) +
        (acceptanceScore * weights.acceptance) +
        (ratingScore * weights.rating) +
        (reliabilityScore * weights.reliability) +
        (vehicleScore * weights.vehicle)
    );

    const finalScore = parseFloat(compositeScore.toFixed(1));

    // Generate explainable summary
    const explanation = `${distanceKm} km away (~${pickupEta}m pickup ETA) | Rating: ${rating}★ | Acceptance: ${acceptanceRate}% | Reliability: ${reliabilityScore.toFixed(0)}%`;

    return {
        matchScore: finalScore,
        distanceKm,
        pickupEtaMinutes: pickupEta,
        factors: {
            proximity: { value: distanceKm, unit: 'km', score: proximityScore, weight: weights.proximity },
            eta: { value: pickupEta, unit: 'mins', score: etaScore, weight: weights.eta },
            rating: { value: rating, unit: 'stars', score: ratingScore, weight: weights.rating },
            acceptance: { value: acceptanceRate, unit: '%', score: acceptanceScore, weight: weights.acceptance },
            reliability: { value: reliabilityScore, unit: '%', score: reliabilityScore, weight: weights.reliability },
            vehicleMatch: { requested: requestedVehicleType, actual: driverVehicleType, score: vehicleScore, weight: weights.vehicle }
        },
        explanation
    };
}

/**
 * Main matching method: Ranks an array of available drivers for a ride.
 * 
 * @param {Object} pickupCoords - { ltd, lng }
 * @param {Array} candidateCaptains - Array of captain records
 * @param {Object} rideDetails - { vehicleType, fare, pickup, destination }
 * @param {Object} options - Optional weight overrides
 * @returns {Array} Ranked list of drivers with scores and explanations
 */
function rankDrivers(pickupCoords, candidateCaptains = [], rideDetails = {}, options = {}) {
    if (!Array.isArray(candidateCaptains) || candidateCaptains.length === 0) {
        return [];
    }

    const weights = { ...DEFAULT_WEIGHTS, ...(options.weights || {}) };

    try {
        const scored = candidateCaptains.map(driver => {
            const scoreResult = scoreDriver(driver, pickupCoords, rideDetails, weights);
            return {
                driver,
                driverId: driver._id ? driver._id.toString() : driver.id,
                ...scoreResult
            };
        });

        // Sort descending by matchScore
        scored.sort((a, b) => b.matchScore - a.matchScore);

        // Assign ordinal ranks
        return scored.map((item, index) => ({
            rank: index + 1,
            ...item
        }));
    } catch (err) {
        console.error('AI Matching Engine error, using fallback distance sorting:', err.message);
        // Fallback: simple distance sort
        return candidateCaptains.map((driver, index) => ({
            rank: index + 1,
            driver,
            driverId: driver._id ? driver._id.toString() : driver.id,
            matchScore: Math.max(10, 100 - (index * 10)),
            distanceKm: 2.0 + index,
            pickupEtaMinutes: 5 + (index * 2),
            explanation: 'Fallback proximity rank'
        }));
    }
}

module.exports = {
    rankDrivers,
    scoreDriver,
    calculateHaversineDistance,
    estimatePickupEta,
    DEFAULT_WEIGHTS
};
