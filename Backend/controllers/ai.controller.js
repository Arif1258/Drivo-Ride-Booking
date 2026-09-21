/**
 * AI Controller
 * Exposes endpoints for all Drivo AI/ML features.
 */

const driverMatchingService = require('../services/driverMatchingService');
const demandPredictionService = require('../services/demandPredictionService');
const repositioningService = require('../services/driverRepositioningService');
const etaService = require('../services/etaService');
const anomalyDetectionService = require('../services/ai/anomalyDetectionService');
const aiSupportService = require('../services/aiSupportService');
const driverInsightService = require('../services/ai/driverInsightService');
const captainModel = require('../models/captain.model');
const rideModel = require('../models/ride.model');
const mapService = require('../services/maps.service');

// 1. Driver-Rider Match Engine
module.exports.matchDrivers = async (req, res) => {
    try {
        const { pickup, vehicleType, maxDistanceKm } = req.body;

        if (!pickup) {
            return res.status(400).json({ message: 'Pickup location or coordinates required' });
        }

        let pickupCoords = pickup;
        if (typeof pickup === 'string') {
            pickupCoords = await mapService.getAddressCoordinate(pickup);
        }

        // Find candidate captains
        let candidates = await captainModel.find({ status: 'active' });
        if (!candidates || candidates.length === 0) {
            candidates = await captainModel.find({}).limit(10);
        }

        const ranked = driverMatchingService.rankDrivers(
            pickupCoords,
            candidates,
            { vehicleType: vehicleType || 'car' },
            { maxDistanceKm: maxDistanceKm || 10 }
        );

        return res.status(200).json({
            count: ranked.length,
            pickupCoordinates: pickupCoords,
            rankedDrivers: ranked
        });
    } catch (err) {
        console.error('AI Driver Match error:', err);
        return res.status(500).json({ message: err.message });
    }
};

// 2. Demand Prediction for Area or Zone
module.exports.getDemandPrediction = async (req, res) => {
    try {
        const { area, lat, lng } = req.query;

        let zone = null;
        if (lat && lng) {
            zone = demandPredictionService.findNearestZone({ ltd: parseFloat(lat), lng: parseFloat(lng) });
        } else if (area) {
            zone = demandPredictionService.findNearestZone(area);
        } else {
            zone = demandPredictionService.ZONES[0];
        }

        const prediction = await demandPredictionService.predictZoneDemand(zone);
        return res.status(200).json(prediction);
    } catch (err) {
        console.error('Demand prediction error:', err);
        return res.status(500).json({ message: err.message });
    }
};

// All Demand Zones (for Heatmaps & Admin Analytics)
module.exports.getAllDemandZones = async (req, res) => {
    try {
        const predictions = await demandPredictionService.predictAllZones();
        return res.status(200).json(predictions);
    } catch (err) {
        console.error('Get all demand zones error:', err);
        return res.status(500).json({ message: err.message });
    }
};

// 3. Driver Repositioning Advice
module.exports.getDriverRepositioning = async (req, res) => {
    try {
        const captain = req.captain;

        // Check if captain is currently engaged on an active ride
        const activeRide = await rideModel.findOne({
            captain: captain._id,
            status: { $in: ['accepted', 'ongoing', 'payment-pending'] }
        });

        if (activeRide) {
            return res.status(200).json({
                hasRecommendation: false,
                isIdle: false,
                message: `You are currently engaged in an active trip to ${activeRide.destination}. Repositioning advice applies when idle.`,
                recommendedZone: null
            });
        }

        let driverLoc = null;

        if (captain.location?.coordinates && captain.location.coordinates.length === 2) {
            driverLoc = {
                lng: captain.location.coordinates[0],
                ltd: captain.location.coordinates[1]
            };
        }

        const advice = await repositioningService.getDriverRepositioningAdvice(driverLoc);
        return res.status(200).json({ ...advice, isIdle: true });
    } catch (err) {
        console.error('Driver repositioning error:', err);
        return res.status(500).json({ message: err.message });
    }
};

// 4. AI ETA Prediction
module.exports.predictETA = async (req, res) => {
    try {
        const { pickup, destination, vehicleType } = req.body;

        if (!pickup || !destination) {
            return res.status(400).json({ message: 'Both pickup and destination are required' });
        }

        const etaResult = await etaService.predictPreBookingETA({
            pickup,
            destination,
            vehicleType
        });

        return res.status(200).json({
            aiEtaMinutes: etaResult.estimatedMinutes,
            tripDurationMinutes: etaResult.tripDurationMinutes,
            pickupEtaMinutes: etaResult.pickupEtaMinutes,
            trafficDelayMinutes: Math.max(0, etaResult.estimatedMinutes - etaResult.tripDurationMinutes - etaResult.pickupEtaMinutes),
            trafficCondition: etaResult.trafficCondition,
            compositeTrafficFactor: etaResult.trafficMultiplier,
            targetArrivalTime: new Date(Date.now() + etaResult.estimatedMinutes * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            explanation: `Traffic level: ${etaResult.trafficCondition}. Estimated arrival: ${etaResult.readable}.`,
            ...etaResult
        });
    } catch (err) {
        console.error('ETA prediction error:', err);
        return res.status(500).json({ message: err.message });
    }
};

// 5. Anomaly & Fraud Risk Evaluation
module.exports.evaluateRisk = async (req, res) => {
    try {
        const { rideId, distance, duration, context } = req.body;

        let rideData = { distance, duration };
        if (rideId) {
            const ride = await rideModel.findById(rideId).populate('user').populate('captain');
            if (ride) rideData = ride;
        }

        const riskEvaluation = await anomalyDetectionService.evaluateRideRisk(rideData, context || {});
        return res.status(200).json(riskEvaluation);
    } catch (err) {
        console.error('Risk evaluation error:', err);
        return res.status(500).json({ message: err.message });
    }
};

// 6. Zen — AI-Powered Customer Support Assistant with Tool Calling
module.exports.supportChat = async (req, res) => {
    try {
        const { query } = req.body;
        // Strict tenant isolation: only use verified identity from verified token
        const userId = req.user?._id ? req.user._id.toString() : null;
        const captainId = req.captain?._id ? req.captain._id.toString() : null;
        const userType = req.captain ? 'captain' : 'user';

        if (!query) {
            return res.status(400).json({ message: 'Query message is required' });
        }

        const response = await aiSupportService.askZenSupport(query, { userId, captainId, userType });
        const defaultActions = userType === 'captain'
            ? ['Where is my rider?', 'What is the pickup location?', 'How much have I earned today?', 'What is my acceptance rate?']
            : ['Where is my driver?', "What's my ETA?", 'Show me my latest ride', 'Why was surge pricing applied?'];

        return res.status(200).json({
            text: response.text,
            confidence: 0.98,
            source: response.source || 'zen_ai',
            cardType: response.cardType,
            cardData: response.cardData,
            suggestedActions: response.suggestedActions || defaultActions
        });
    } catch (err) {
        console.error('Zen support assistant error:', err);
        return res.status(500).json({ message: err.message });
    }
};

// Dynamic Demand Hotspots (Clusters from real ride data)
module.exports.getDemandHotspots = async (req, res) => {
    try {
        const hotspots = await demandPredictionService.getDynamicHotspots();
        return res.status(200).json(hotspots);
    } catch (err) {
        console.error('Demand hotspots error:', err);
        return res.status(500).json({ message: err.message });
    }
};

// 7. Driver Insights & Coaching
module.exports.getDriverInsights = async (req, res) => {
    try {
        const captainId = req.captain?._id || req.query.captainId;

        if (!captainId) {
            return res.status(400).json({ message: 'Captain identification required' });
        }

        const insights = await driverInsightService.generateCaptainInsights(captainId);
        return res.status(200).json(insights);
    } catch (err) {
        console.error('Driver insights error:', err);
        return res.status(500).json({ message: err.message });
    }
};

// Admin AI Dashboard Aggregation
module.exports.getAdminAIDashboard = async (req, res) => {
    try {
        const [
            zones,
            flaggedRides,
            activeRidesCount,
            totalCaptains,
            activeCaptainsCount,
            recentRides,
            totalRidesCount
        ] = await Promise.all([
            demandPredictionService.predictAllZones(),
            anomalyDetectionService.getFlaggedRidesForAdmin({ limit: 10 }),
            rideModel.countDocuments({ status: { $in: ['accepted', 'ongoing', 'payment-pending'] } }),
            captainModel.countDocuments(),
            captainModel.countDocuments({ status: 'active' }),
            rideModel.find().sort({ createdAt: -1 }).limit(10).populate('user').populate('captain'),
            rideModel.countDocuments()
        ]);

        // Demand-Supply Overview
        const totalExpectedRides = zones.reduce((sum, z) => sum + z.expectedRides, 0);
        const overallSupplyDemandRatio = parseFloat((totalExpectedRides / Math.max(1, activeCaptainsCount || 5)).toFixed(2));

        // High Risk Count
        const highRiskCount = flaggedRides.filter(r => r.riskLevel === 'HIGH').length;

        // Top Captain Performance Leaderboard
        const topCaptains = await captainModel.find()
            .sort({ rating: -1, totalRides: -1 })
            .limit(5)
            .select('fullname vehicle rating acceptanceRate cancellationRate onTimeRate totalRides');

        // AI Operational Insights Summary
        const operationalInsights = [];
        if (overallSupplyDemandRatio > 1.4) {
            operationalInsights.push({
                severity: 'WARNING',
                title: 'High Citywide Demand Deficit',
                description: `Demand/Supply ratio is ${overallSupplyDemandRatio}x. Recommended action: broadcast surge incentives to off-duty captains.`
            });
        }
        if (highRiskCount > 0) {
            operationalInsights.push({
                severity: 'ALERT',
                title: `${highRiskCount} High-Risk Rides Require Review`,
                description: 'Potential GPS spoofing or abnormal duration detected in recent trips.'
            });
        }
        operationalInsights.push({
            severity: 'INFO',
            title: 'Peak Zone: ' + (zones[0]?.area || 'Railway Station'),
            description: `${zones[0]?.expectedRides || 35} expected rides with ${zones[0]?.demandSupplyRatio || 1.8}x demand ratio.`
        });

        return res.status(200).json({
            summary: {
                totalRides: totalRidesCount,
                activeRides: activeRidesCount,
                totalCaptains,
                activeCaptains: activeCaptainsCount,
                overallSupplyDemandRatio,
                highRiskFlaggedCount: highRiskCount,
                totalExpectedRides
            },
            demandZones: zones,
            flaggedRides,
            topCaptains,
            recentRides,
            operationalInsights
        });
    } catch (err) {
        console.error('Admin AI dashboard error:', err);
        return res.status(500).json({ message: err.message });
    }
};

module.exports.reviewAnomaly = async (req, res) => {
    try {
        const { logId, status, reviewNotes } = req.body;
        if (!logId || !status) {
            return res.status(400).json({ message: 'logId and status are required' });
        }

        const log = await aiRiskLogModel.findByIdAndUpdate(logId, {
            status,
            reviewNotes: reviewNotes || 'Reviewed and verified by administrator',
            reviewedBy: req.user?.fullname?.firstname || 'Admin'
        }, { new: true });

        if (!log) {
            return res.status(404).json({ message: 'Anomaly record not found' });
        }

        return res.status(200).json({ message: 'Anomaly review status updated', log });
    } catch (err) {
        console.error('Review anomaly error:', err);
        return res.status(500).json({ message: err.message });
    }
};
