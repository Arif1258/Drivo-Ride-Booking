const rideService = require('../services/ride.service');
const { validationResult } = require('express-validator');
const mapService = require('../services/maps.service');
const { sendMessageToUser, broadcastToAdmin } = require('../socket');
const rideModel = require('../models/ride.model');
const captainModel = require('../models/captain.model');
const driverMatchingService = require('../services/driverMatchingService');
const etaService = require('../services/etaService');
const demandPredictionService = require('../services/demandPredictionService');
const anomalyDetectionService = require('../services/ai/anomalyDetectionService');

module.exports.createRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { pickup, destination, vehicleType } = req.body;

    try {
        console.log("Ride creating with AI processing...");
        const ride = await rideService.createRide({ user: req.user._id, pickup, destination, vehicleType });

        // 1. AI ETA Prediction
        let aiEta = null;
        try {
            aiEta = await etaService.predictPreBookingETA({ pickup, destination, vehicleType });
            ride.aiEstimatedDuration = (aiEta.estimatedMinutes || 15) * 60;
        } catch (etaErr) {
            console.warn('AI ETA calculation warning:', etaErr.message);
        }

        // 2. Geocode Pickup Location
        let pickupCoordinates = { ltd: 22.3375, lng: 87.3242 };
        try {
            pickupCoordinates = await mapService.getAddressCoordinate(pickup);
            ride.originCoordinates = pickupCoordinates;
        } catch (geoErr) {
            console.warn('Pickup geocoding warning:', geoErr.message);
        }

        // 2b. AI Surge Pricing Integration
        try {
            const nearestZone = demandPredictionService.findNearestZone(pickupCoordinates);
            const zonePrediction = await demandPredictionService.predictZoneDemand(nearestZone);
            const surgeMultiplier = zonePrediction.surgeMultiplier || 1.0;
            if (surgeMultiplier > 1.0) {
                ride.fare = Math.round(ride.fare * surgeMultiplier);
                ride.surgeMultiplier = surgeMultiplier;
                ride.surgeReason = `Surge multiplier ${surgeMultiplier}x applied due to elevated demand (${zonePrediction.demandLevel}) near ${zonePrediction.area}.`;
            }
        } catch (surgeErr) {
            console.warn('Surge calculation notice:', surgeErr.message);
        }

        // 3. Find Candidate Captains (Filtering out busy captains on active rides)
        const busyCaptainIds = await rideModel.find({
            status: { $in: ['accepted', 'ongoing', 'payment-pending'] }
        }).distinct('captain');
        const busySet = new Set(busyCaptainIds.map(id => id ? id.toString() : ''));

        let captainsInRadius = await mapService.getCaptainsInTheRadius(pickupCoordinates.ltd, pickupCoordinates.lng, 100);
        let availableCaptains = captainsInRadius.filter(c => !busySet.has(c._id.toString()) && c.status === 'active');

        if (availableCaptains.length === 0) {
            const allActive = await captainModel.find({ status: 'active' });
            availableCaptains = allActive.filter(c => !busySet.has(c._id.toString()));
        }

        if (availableCaptains.length === 0) {
            // Fallback for demo/testing environments if no active captains
            const allCaptains = await captainModel.find({});
            availableCaptains = allCaptains.filter(c => !busySet.has(c._id.toString()));
        }

        // Fare breakdown components
        const baseRates = {
            car: { base: 50, perKm: 15, perMin: 3 },
            auto: { base: 30, perKm: 10, perMin: 2 },
            moto: { base: 20, perKm: 8, perMin: 1.5 }
        };
        const rate = baseRates[(vehicleType || 'car').toLowerCase()] || baseRates.car;
        ride.baseFare = rate.base;
        const distKm = parseFloat((ride.distance ? ride.distance / 1000 : 4.5).toFixed(1));
        const durMin = Math.round(ride.duration ? ride.duration / 60 : 15);
        ride.distanceFare = Math.round(distKm * rate.perKm);
        ride.timeFare = Math.round(durMin * rate.perMin);

        // 4. AI Driver Matching & Ranking
        const rankedCaptains = driverMatchingService.rankDrivers(
            pickupCoordinates,
            availableCaptains,
            { vehicleType, pickup, destination }
        );

        const topRank = rankedCaptains[0];
        if (topRank) {
            ride.aiMatchScore = topRank.matchScore;
            ride.matchFactors = {
                proximityScore: topRank.breakdown?.proximityScore || 85,
                etaScore: topRank.breakdown?.etaScore || 80,
                ratingScore: topRank.breakdown?.ratingScore || 90,
                acceptanceScore: topRank.breakdown?.acceptanceScore || 92,
                reliabilityScore: topRank.breakdown?.reliabilityScore || 95,
                vehicleScore: topRank.breakdown?.vehicleScore || 100,
                reason: topRank.explanation || `Selected captain with score ${topRank.matchScore}/100 based on high proximity and rating.`
            };
        }

        // 5. Initial Anomaly & Risk Evaluation
        try {
            const riskEval = await anomalyDetectionService.evaluateRideRisk(ride, {
                recentRequestsInWindow: 1
            });
            ride.riskScore = riskEval.riskScore;
            ride.riskLevel = riskEval.riskLevel;
            ride.riskReasons = riskEval.reasons.map(r => r.code);

            if (riskEval.riskScore >= 70) {
                broadcastToAdmin('high-risk-ride', {
                    rideId: ride._id,
                    riskScore: riskEval.riskScore,
                    reasons: riskEval.reasons,
                    pickup,
                    destination
                });
            }
        } catch (riskErr) {
            console.warn('AI Risk evaluation warning:', riskErr.message);
        }

        await ride.save();

        // Response to rider with AI metadata
        res.status(201).json({
            ...ride.toObject(),
            aiEta,
            topMatchScore: topRank?.matchScore || null
        });

        // 6. Broadcast new-ride to ranked captains (in order of priority)
        ride.otp = "";
        const rideWithUser = await rideModel.findOne({ _id: ride._id }).populate('user');

        rankedCaptains.forEach(rankedItem => {
            const captainId = rankedItem.driverId || rankedItem.driver?._id;
            console.log(`🤖 Ride broadcasted to Ranked Captain ID: ${captainId} (Match Score: ${rankedItem.matchScore})`);

            sendMessageToUser(captainId, {
                event: 'new-ride',
                data: {
                    ...rideWithUser.toObject(),
                    aiMatch: {
                        score: rankedItem.matchScore,
                        pickupEtaMinutes: rankedItem.pickupEtaMinutes,
                        distanceKm: rankedItem.distanceKm,
                        rank: rankedItem.rank,
                        explanation: rankedItem.explanation
                    }
                }
            });
        });

    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: err.message });
    }
};

module.exports.getFare = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { pickup, destination } = req.query;

    try {
        const fare = await rideService.getFare(pickup, destination);
        return res.status(200).json(fare);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

module.exports.confirmRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId } = req.body;

    try {
        const ride = await rideService.confirmRide({ rideId, captain: req.captain });

        console.log('🚗 Ride confirmed! Sending ride-confirmed to user:', ride.user._id);

        sendMessageToUser(ride.user._id, {
            event: 'ride-confirmed',
            data: ride
        })

        return res.status(200).json(ride);
    } catch (err) {

        console.log(err);
        return res.status(500).json({ message: err.message });
    }
}

module.exports.startRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId, otp } = req.body;

    try {
        const ride = await rideService.startRide({ rideId, otp, captain: req.captain });

        // Record start time
        ride.startedAt = new Date();
        await ride.save();

        console.log(`Ride ${rideId} started at ${ride.startedAt}`);

        sendMessageToUser(ride.user._id, {
            event: 'ride-started',
            data: ride
        });

        return res.status(200).json(ride);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

module.exports.endRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId } = req.body;

    try {
        const ride = await rideService.endRide({ rideId, captain: req.captain });

        // Record completion time and calculate duration
        ride.completedAt = new Date();
        if (ride.startedAt) {
            ride.duration = Math.round((ride.completedAt - ride.startedAt) / 1000);
        }

        // Run AI Anomaly Evaluation on completed ride
        try {
            const riskEval = await anomalyDetectionService.evaluateRideRisk(ride, {
                captainCancellationRate: req.captain.cancellationRate || 3
            });

            ride.riskScore = riskEval.riskScore;
            ride.riskLevel = riskEval.riskLevel;
            ride.riskReasons = riskEval.reasons.map(r => r.code);

            if (riskEval.riskScore >= 70) {
                broadcastToAdmin('high-risk-ride', {
                    rideId: ride._id,
                    riskScore: riskEval.riskScore,
                    reasons: riskEval.reasons,
                    pickup: ride.pickup,
                    destination: ride.destination,
                    duration: ride.duration
                });
            }
        } catch (anomalyErr) {
            console.warn('AI Anomaly evaluation warning on endRide:', anomalyErr.message);
        }

        await ride.save();

        sendMessageToUser(ride.user._id, {
            event: 'ride-ended',
            data: ride
        });

        return res.status(200).json(ride);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

module.exports.getActiveRideByUser = async (req, res) => {
    try {
        const ride = await rideModel.findOne({
            user: req.user._id,
            status: { $in: [ 'pending', 'accepted', 'ongoing', 'payment-pending' ] }
        }).sort({ createdAt: -1 }).populate('user').populate('captain').select('+otp');

        if (!ride) {
            return res.status(404).json({ message: 'No active ride found' });
        }

        // Auto-expire pending rides older than 10 minutes
        if (ride.status === 'pending') {
            const ageMinutes = (Date.now() - new Date(ride.createdAt).getTime()) / (1000 * 60);
            if (ageMinutes > 10) {
                ride.status = 'cancelled';
                ride.cancellationReason = 'Ride request timed out - no captain accepted in time';
                await ride.save();
                return res.status(404).json({ message: 'No active ride found' });
            }
        }

        return res.status(200).json(ride);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

module.exports.getActiveRideByCaptain = async (req, res) => {
    try {
        const ride = await rideModel.findOne({
            captain: req.captain._id,
            status: { $in: [ 'accepted', 'ongoing', 'payment-pending' ] }
        }).sort({ createdAt: -1 }).populate('user').populate('captain').select('+otp');

        if (!ride) {
            return res.status(404).json({ message: 'No active ride found' });
        }
        return res.status(200).json(ride);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

module.exports.getPendingRides = async (req, res) => {
    try {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const rides = await rideModel.find({
            status: 'pending',
            createdAt: { $gte: tenMinutesAgo }
        }).populate('user').sort({ createdAt: -1 });
        return res.status(200).json(rides);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

module.exports.cancelRide = async (req, res) => {
    try {
        const { rideId, reason } = req.body;
        if (!rideId) {
            return res.status(400).json({ message: 'Ride ID is required' });
        }

        const ride = await rideModel.findById(rideId).populate('user').populate('captain');
        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        const isUser = req.user && ride.user && ride.user._id.toString() === req.user._id.toString();
        const isCaptain = req.captain && ride.captain && ride.captain._id.toString() === req.captain._id.toString();

        if (!isUser && !isCaptain) {
            return res.status(403).json({ message: 'Unauthorized to cancel this ride' });
        }

        if (ride.status === 'completed' || ride.status === 'cancelled') {
            return res.status(400).json({ message: `Ride is already ${ride.status}` });
        }

        const cancelledBy = isUser ? 'user' : 'captain';
        ride.status = 'cancelled';
        ride.cancellationReason = reason || `${cancelledBy === 'user' ? 'Passenger' : 'Driver'} cancelled the trip`;
        ride.cancelledBy = cancelledBy;
        await ride.save();

        if (isCaptain && ride.captain) {
            const captain = await captainModel.findById(ride.captain._id);
            if (captain) {
                captain.cancellationRate = Math.min(100, Math.round(((captain.cancellationRate || 3) * 0.9) + 10));
                await captain.save();
            }
        }

        if (isUser && ride.captain) {
            sendMessageToUser(ride.captain._id, {
                event: 'ride-cancelled',
                data: { rideId: ride._id, reason: ride.cancellationReason, cancelledBy }
            });
        } else if (isCaptain && ride.user) {
            sendMessageToUser(ride.user._id, {
                event: 'ride-cancelled',
                data: { rideId: ride._id, reason: ride.cancellationReason, cancelledBy }
            });
        }

        broadcastToAdmin('ride-cancelled', {
            rideId: ride._id,
            reason: ride.cancellationReason,
            cancelledBy,
            fare: ride.fare
        });

        return res.status(200).json({ message: 'Ride cancelled successfully', ride });
    } catch (err) {
        console.error('Cancel ride error:', err);
        return res.status(500).json({ message: err.message });
    }
}

module.exports.rateRide = async (req, res) => {
    try {
        const { rideId, rating, feedback } = req.body;
        if (!rideId || !rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Valid ride ID and rating (1-5) are required' });
        }

        const ride = await rideModel.findOne({
            _id: rideId,
            user: req.user._id
        }).populate('captain');

        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        ride.rating = rating;
        if (feedback) ride.feedback = feedback;
        await ride.save();

        let updatedCaptainRating = 4.8;
        if (ride.captain) {
            const captain = await captainModel.findById(ride.captain._id);
            if (captain) {
                const total = Math.max(1, captain.totalRides || 1);
                const prevRating = captain.rating || 4.8;
                captain.rating = parseFloat((((prevRating * (total - 1)) + rating) / total).toFixed(1));
                await captain.save();
                updatedCaptainRating = captain.rating;
            }
        }

        return res.status(200).json({
            message: 'Rating submitted successfully',
            ride,
            rating: ride.rating,
            feedback: ride.feedback,
            captainRating: updatedCaptainRating
        });
    } catch (err) {
        console.error('Rate ride error:', err);
        return res.status(500).json({ message: err.message });
    }
}

module.exports.getUserRides = async (req, res) => {
    try {
        const rides = await rideModel.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .populate('captain')
            .limit(50);
        return res.status(200).json(rides);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

module.exports.getCaptainRides = async (req, res) => {
    try {
        const rides = await rideModel.find({ captain: req.captain._id })
            .sort({ createdAt: -1 })
            .populate('user')
            .limit(50);
        return res.status(200).json(rides);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}