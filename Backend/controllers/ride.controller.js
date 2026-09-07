const rideService = require('../services/ride.service');
const { validationResult } = require('express-validator');
const mapService = require('../services/maps.service');
const { sendMessageToUser, broadcastToAdmin } = require('../socket');
const rideModel = require('../models/ride.model');
const captainModel = require('../models/captain.model');
const driverMatchingService = require('../services/ai/driverMatchingService');
const etaPredictionService = require('../services/ai/etaPredictionService');
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
            aiEta = await etaPredictionService.predictRideETA({ pickup, destination });
            ride.aiEstimatedDuration = aiEta.aiEtaMinutes * 60;
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

        // 3. Find Candidate Captains
        let captainsInRadius = await mapService.getCaptainsInTheRadius(pickupCoordinates.ltd, pickupCoordinates.lng, 100);
        if (captainsInRadius.length === 0) {
            console.log('⚠️ No captains found in radius. Falling back to all captains for testing/demo.');
            captainsInRadius = await captainModel.find({});
        }

        // 4. AI Driver Matching & Ranking
        const rankedCaptains = driverMatchingService.rankDrivers(
            pickupCoordinates,
            captainsInRadius,
            { vehicleType, pickup, destination }
        );

        const topRank = rankedCaptains[0];
        if (topRank) {
            ride.aiMatchScore = topRank.matchScore;
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
        }).populate('user').populate('captain').select('+otp');

        if (!ride) {
            return res.status(404).json({ message: 'No active ride found' });
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
        }).populate('user').populate('captain').select('+otp');

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
        const rides = await rideModel.find({
            status: 'pending'
        }).populate('user');
        return res.status(200).json(rides);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}