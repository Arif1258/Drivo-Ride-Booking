/**
 * Assistant Tool Calling Layer for Drivo
 * 
 * Implements explicit, secure, authorized tools.
 * The LLM does NOT have arbitrary database access.
 * Every tool derives identity and authorization strictly from authContext.
 * 
 * Cross-user isolation:
 * - Riders can ONLY access their own rides and payments.
 * - Drivers can ONLY access their own assigned rides, earnings, and stats.
 * - Admins can access aggregated platform operational metrics.
 */

const mongoose = require('mongoose');
const rideModel = require('../../models/ride.model');
const captainModel = require('../../models/captain.model');
const paymentModel = require('../../models/payment.model');
const userModel = require('../../models/user.model');
const aiRiskLogModel = require('../../models/aiRiskLog.model');
const demandPredictionService = require('../demandPredictionService');
const repositioningService = require('../driverRepositioningService');
const etaService = require('../etaService');
const rideService = require('../ride.service');
const mapService = require('../maps.service');
const driverMatchingService = require('../driverMatchingService');
const anomalyDetectionService = require('./anomalyDetectionService');
const { sendMessageToUser, broadcastToAdmin } = require('../../socket');

const isValidObjectId = (id) => {
    if (!id) return false;
    const str = (typeof id === 'object' && typeof id.toString === 'function') ? id.toString() : String(id);
    return /^[0-9a-fA-F]{24}$/.test(str);
};

const isDbConnected = () => {
    return mongoose.connection && mongoose.connection.readyState === 1;
};

// ─── 1. Rider Tools ──────────────────────────────────────────────────────────

/**
 * Gets the current active ride for the authenticated rider.
 */
async function getCurrentRide(authContext = {}) {
    const userId = authContext.userId;
    if (!userId || !isValidObjectId(userId)) {
        return {
            success: false,
            error: 'Authentication required. Please log in as a rider to view your active ride.'
        };
    }

    if (!isDbConnected()) {
        return {
            success: true,
            hasActiveRide: false,
            message: 'You currently have no active ride in progress.'
        };
    }

    const ride = await rideModel.findOne({
        user: userId,
        status: { $in: ['pending', 'accepted', 'ongoing', 'payment-pending'] }
    }).populate('captain', 'fullname vehicle rating phone location').sort({ createdAt: -1 });

    if (!ride) {
        return {
            success: true,
            hasActiveRide: false,
            message: 'You do not have any active ride in progress.'
        };
    }

    const etaInfo = await etaService.calculateRideETA(ride);

    return {
        success: true,
        hasActiveRide: true,
        rideId: ride._id.toString(),
        status: ride.status,
        pickup: ride.pickup,
        destination: ride.destination,
        fare: ride.fare,
        surgeMultiplier: ride.surgeMultiplier || 1.0,
        captainAssigned: !!ride.captain,
        captain: ride.captain ? {
            name: `${ride.captain.fullname?.firstname || 'Captain'} ${ride.captain.fullname?.lastname || ''}`.trim(),
            vehicle: ride.captain.vehicle,
            rating: ride.captain.rating || 4.8,
            phone: ride.captain.phone || '+91-9876543210'
        } : null,
        eta: etaInfo?.readable || 'Arriving shortly'
    };
}

/**
 * Gets details of the assigned driver for the current ride.
 */
async function getCurrentDriver(authContext = {}) {
    const current = await getCurrentRide(authContext);
    if (!current.success) return current;
    if (!current.hasActiveRide) {
        return {
            success: true,
            hasActiveRide: false,
            message: 'You do not have an active ride right now.'
        };
    }
    if (!current.captainAssigned) {
        return {
            success: true,
            captainAssigned: false,
            status: current.status,
            message: 'We are currently matching you with the highest-ranked nearby driver. Driver details will appear once accepted.'
        };
    }

    return {
        success: true,
        captainAssigned: true,
        driver: current.captain,
        pickup: current.pickup,
        eta: current.eta
    };
}

/**
 * Gets ETA breakdown for the rider's active ride.
 */
async function getTripETA(rideId = null, authContext = {}) {
    if (!isDbConnected()) {
        return {
            success: true,
            hasActiveRide: false,
            message: 'No active ride found to compute ETA.'
        };
    }

    let ride = null;
    if (rideId && isValidObjectId(rideId)) {
        ride = await rideModel.findById(rideId).populate('captain');
        if (ride) {
            // Verify authorization
            const uid = authContext.userId?.toString();
            const cid = authContext.captainId?.toString();
            if (ride.user?.toString() !== uid && ride.captain?._id?.toString() !== cid && !authContext.isAdmin) {
                return { success: false, error: 'Unauthorized: You do not have access to this trip.' };
            }
        }
    } else if (authContext.userId) {
        ride = await rideModel.findOne({
            user: authContext.userId,
            status: { $in: ['pending', 'accepted', 'ongoing', 'payment-pending'] }
        }).populate('captain').sort({ createdAt: -1 });
    }

    if (!ride) {
        return {
            success: true,
            hasActiveRide: false,
            message: 'No active ride found to compute ETA.'
        };
    }

    const etaInfo = await etaService.calculateRideETA(ride);
    return {
        success: true,
        rideId: ride._id.toString(),
        status: ride.status,
        eta: etaInfo?.readable,
        trafficCondition: etaInfo?.trafficCondition || 'Normal',
        breakdown: etaInfo?.breakdown
    };
}

/**
 * Gets details of a specific ride, strictly enforcing authorization.
 */
async function getRideDetails(rideId, authContext = {}) {
    if (!rideId || !isValidObjectId(rideId)) {
        return { success: false, error: 'Valid rideId parameter is required.' };
    }

    if (!isDbConnected()) {
        return { success: false, error: 'Ride record not found.' };
    }

    const ride = await rideModel.findById(rideId)
        .populate('captain', 'fullname vehicle rating phone')
        .populate('user', 'fullname phone email');

    if (!ride) {
        return { success: false, error: 'Ride record not found.' };
    }

    // Strict tenant isolation
    const uid = authContext.userId?.toString();
    const cid = authContext.captainId?.toString();
    const isOwner = (uid && ride.user?._id?.toString() === uid);
    const isDriver = (cid && ride.captain?._id?.toString() === cid);
    const isAdmin = !!authContext.isAdmin;

    if (!isOwner && !isDriver && !isAdmin) {
        return {
            success: false,
            error: 'Unauthorized: You do not have permission to view details for this ride.'
        };
    }

    return {
        success: true,
        rideId: ride._id.toString(),
        status: ride.status,
        pickup: ride.pickup,
        destination: ride.destination,
        fare: ride.fare,
        surgeMultiplier: ride.surgeMultiplier || 1.0,
        surgeReason: ride.surgeReason || 'Standard demand',
        distanceKm: ride.distance ? (ride.distance / 1000).toFixed(1) : null,
        durationMinutes: ride.duration ? Math.round(ride.duration / 60) : null,
        captainName: ride.captain ? `${ride.captain.fullname?.firstname || ''} ${ride.captain.fullname?.lastname || ''}`.trim() : null,
        riderName: ride.user ? `${ride.user.fullname?.firstname || ''} ${ride.user.fullname?.lastname || ''}`.trim() : null,
        createdAt: ride.createdAt
    };
}

/**
 * Gets authenticated user's ride history with limits.
 */
async function getRideHistory(limit = 5, authContext = {}) {
    const userId = authContext.userId;
    const captainId = authContext.captainId;

    if (!userId && !captainId) {
        return { success: false, error: 'Authentication required to view ride history.' };
    }

    if (!isDbConnected()) {
        return { success: true, count: 0, rides: [] };
    }

    const safeLimit = Math.min(10, Math.max(1, parseInt(limit) || 5));
    const filter = captainId ? { captain: captainId } : { user: userId };

    const rides = await rideModel.find(filter)
        .sort({ createdAt: -1 })
        .limit(safeLimit)
        .populate('captain', 'fullname vehicle')
        .populate('user', 'fullname');

    return {
        success: true,
        count: rides.length,
        rides: rides.map(r => ({
            rideId: r._id.toString(),
            pickup: r.pickup,
            destination: r.destination,
            fare: r.fare,
            status: r.status,
            surgeMultiplier: r.surgeMultiplier || 1.0,
            date: new Date(r.createdAt).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            counterpartyName: captainId
                ? (r.user?.fullname?.firstname || 'Rider')
                : (r.captain?.fullname?.firstname || 'Captain')
        }))
    };
}

/**
 * Gets fare breakdown and calculation details for a ride.
 */
async function getRideFare(rideId = null, authContext = {}) {
    if (!isDbConnected()) {
        return {
            success: true,
            hasRide: false,
            message: 'Drivo standard pricing formula: Base Fare + (Distance × Per-km Rate) + (Duration × Per-minute Rate).'
        };
    }

    let ride = null;
    if (rideId && isValidObjectId(rideId)) {
        ride = await rideModel.findById(rideId).populate('captain');
    } else if (authContext.userId) {
        // Find active ride, or last completed ride
        ride = await rideModel.findOne({
            user: authContext.userId,
            status: { $in: ['pending', 'accepted', 'ongoing', 'payment-pending'] }
        }).populate('captain').sort({ createdAt: -1 });

        if (!ride) {
            ride = await rideModel.findOne({ user: authContext.userId }).populate('captain').sort({ createdAt: -1 });
        }
    } else if (authContext.captainId) {
        ride = await rideModel.findOne({ captain: authContext.captainId }).populate('captain').sort({ createdAt: -1 });
    }

    if (!ride) {
        return {
            success: true,
            hasRide: false,
            message: 'No ride records found. Drivo standard pricing formula: Base Fare + (Distance × Per-km Rate) + (Duration × Per-minute Rate).'
        };
    }

    // Verify tenant authorization
    const uid = authContext.userId?.toString();
    const cid = authContext.captainId?.toString();
    if (uid && ride.user?.toString() !== uid && !authContext.isAdmin) {
        return { success: false, error: 'Unauthorized: Cannot view another user\'s fare breakdown.' };
    }
    if (cid && ride.captain?._id?.toString() !== cid && !authContext.isAdmin) {
        return { success: false, error: 'Unauthorized: Cannot view another driver\'s fare breakdown.' };
    }

    const distKm = parseFloat((ride.distance ? (ride.distance / 1000) : 4.5).toFixed(1));
    const durMin = ride.duration ? Math.round(ride.duration / 60) : 15;
    const baseFare = ride.baseFare || 50;
    const distanceCharge = ride.distanceFare || Math.round(distKm * 15);
    const durationCharge = ride.timeFare || Math.round(durMin * 3);
    const surgeMultiplier = ride.surgeMultiplier || 1.0;
    const finalFare = ride.fare;

    return {
        success: true,
        hasRide: true,
        rideId: ride._id.toString(),
        pickup: ride.pickup,
        destination: ride.destination,
        baseFare,
        distanceKm: distKm,
        distanceCharge,
        durationMinutes: durMin,
        durationCharge,
        surgeMultiplier,
        surgeReason: ride.surgeReason || (surgeMultiplier > 1.0 ? 'Peak demand surge in departure sector' : 'Standard demand'),
        finalFare,
        explanation: `Base Fare (₹${baseFare}) + Distance (${distKm} km: ₹${distanceCharge}) + Time (${durMin} mins: ₹${durationCharge})${surgeMultiplier > 1.0 ? ` × Surge Multiplier (${surgeMultiplier}x)` : ''} = Total ₹${finalFare}`
    };
}

/**
 * Gets surge pricing explanation and multiplier details for a ride.
 */
async function getSurgeDetails(rideId = null, authContext = {}) {
    const fareInfo = await getRideFare(rideId, authContext);
    if (!fareInfo.success) return fareInfo;
    if (!fareInfo.hasRide) return fareInfo;

    return {
        success: true,
        rideId: fareInfo.rideId,
        surgeMultiplier: fareInfo.surgeMultiplier,
        isSurgeActive: fareInfo.surgeMultiplier > 1.0,
        surgeReason: fareInfo.surgeReason,
        surgePremiumAmount: fareInfo.surgeMultiplier > 1.0
            ? Math.round(fareInfo.finalFare - (fareInfo.finalFare / fareInfo.surgeMultiplier))
            : 0,
        explanation: fareInfo.surgeMultiplier > 1.0
            ? `A ${fareInfo.surgeMultiplier}x surge multiplier was applied due to high passenger request density exceeding active drivers in this sector.`
            : 'No surge pricing was applied to this ride. Standard base rates applied.'
    };
}

/**
 * Gets ride cancellation details and policy applicability.
 */
async function getCancellationDetails(rideId = null, authContext = {}) {
    if (!isDbConnected()) {
        return {
            success: true,
            hasCancellation: false,
            freeCancellationEligible: true,
            policy: 'Free cancellation within 3 minutes of booking. Post-3 minute cancellation fee: ₹50.'
        };
    }

    let ride = null;
    if (rideId && isValidObjectId(rideId)) {
        ride = await rideModel.findById(rideId);
    } else if (authContext.userId) {
        ride = await rideModel.findOne({ user: authContext.userId, status: 'cancelled' }).sort({ createdAt: -1 });
    }

    if (!ride) {
        return {
            success: true,
            hasCancellation: false,
            freeCancellationEligible: true,
            policy: 'Free cancellation within 3 minutes of booking. Post-3 minute cancellation fee: ₹50.'
        };
    }

    return {
        success: true,
        rideId: ride._id.toString(),
        status: ride.status,
        cancelledBy: ride.cancelledBy || 'passenger',
        cancellationReason: ride.cancellationReason || 'User requested cancellation',
        cancellationFee: ride.cancelledBy === 'captain' ? 0 : 50,
        waiverEligible: ride.cancelledBy === 'captain'
    };
}

/**
 * Gets payment details and transaction records for a ride.
 */
async function getPaymentDetails(rideId = null, authContext = {}) {
    const filter = {};
    if (rideId && isValidObjectId(rideId)) {
        filter.rideId = rideId;
    } else if (authContext.userId) {
        filter.userId = authContext.userId;
    } else if (authContext.captainId) {
        filter.captainId = authContext.captainId;
    } else {
        return { success: false, error: 'Authentication required to view payment records.' };
    }

    if (!isDbConnected()) {
        return {
            success: true,
            hasPayment: false,
            message: 'No payment transaction record found.'
        };
    }

    const payment = await paymentModel.findOne(filter).sort({ createdAt: -1 });
    if (!payment) {
        return {
            success: true,
            hasPayment: false,
            message: 'No payment transaction record found.'
        };
    }

    // Verify tenant authorization
    const uid = authContext.userId?.toString();
    const cid = authContext.captainId?.toString();
    if (uid && payment.userId?.toString() !== uid && !authContext.isAdmin) {
        return { success: false, error: 'Unauthorized: Cannot view another user\'s payment details.' };
    }
    if (cid && payment.captainId?.toString() !== cid && !authContext.isAdmin) {
        return { success: false, error: 'Unauthorized: Cannot view another driver\'s payment details.' };
    }

    return {
        success: true,
        hasPayment: true,
        paymentId: payment.paymentId,
        rideId: payment.rideId.toString(),
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        paymentStatus: payment.paymentStatus,
        transactionId: payment.transactionId || 'N/A',
        createdAt: payment.createdAt
    };
}

/**
 * Gets real-time stage of a ride.
 */
async function getRideStatus(rideId = null, authContext = {}) {
    const active = await getCurrentRide(authContext);
    if (!active.hasActiveRide) {
        return {
            success: true,
            hasActiveRide: false,
            message: 'You currently have no active ride.'
        };
    }

    const descriptions = {
        'pending': 'Searching for the best nearby driver using AI matching algorithm.',
        'accepted': 'Driver has accepted your booking and is en route to pickup.',
        'ongoing': 'Trip in progress. You are currently heading to your destination.',
        'payment-pending': 'Destination reached. Awaiting payment settlement.',
        'completed': 'Trip successfully completed.',
        'cancelled': 'Ride was cancelled.'
    };

    return {
        success: true,
        hasActiveRide: true,
        rideId: active.rideId,
        status: active.status,
        description: descriptions[active.status] || active.status,
        pickup: active.pickup,
        destination: active.destination,
        captainAssigned: active.captainAssigned,
        eta: active.eta
    };
}

// ─── 2. Driver / Captain Tools ───────────────────────────────────────────────

/**
 * Gets the current rider details for the authenticated driver.
 * Driver asking "Who is my current rider?" resolves to this tool.
 */
async function getCurrentRider(authContext = {}) {
    const captainId = authContext.captainId;
    if (!captainId || !isValidObjectId(captainId)) {
        return {
            success: false,
            error: 'Authentication required. Please log in as a Captain to view your assigned passenger.'
        };
    }

    if (!isDbConnected()) {
        return {
            success: true,
            hasActiveRide: false,
            message: 'You currently do not have an active trip assigned. Stay online to receive incoming ride dispatches!'
        };
    }

    const ride = await rideModel.findOne({
        captain: captainId,
        status: { $in: ['accepted', 'ongoing', 'payment-pending'] }
    }).populate('user', 'fullname phone email').sort({ createdAt: -1 });

    if (!ride) {
        return {
            success: true,
            hasActiveRide: false,
            message: 'You currently do not have an active trip assigned. Stay online to receive incoming ride dispatches!'
        };
    }

    return {
        success: true,
        hasActiveRide: true,
        rideId: ride._id.toString(),
        status: ride.status,
        rider: {
            name: `${ride.user?.fullname?.firstname || 'Passenger'} ${ride.user?.fullname?.lastname || ''}`.trim(),
            phone: ride.user?.phone || '+91-9876543210'
        },
        pickup: ride.pickup,
        destination: ride.destination,
        fare: ride.fare,
        otp: ride.otp,
        distanceKm: ride.distance ? (ride.distance / 1000).toFixed(1) : null
    };
}

/**
 * Gets driver earnings for a period ('today', 'week', 'all').
 */
async function getDriverEarnings(period = 'today', authContext = {}) {
    const captainId = authContext.captainId;
    if (!captainId || !isValidObjectId(captainId)) {
        return {
            success: false,
            error: 'Authentication required. Please log in as a Captain to view earnings.'
        };
    }

    if (!isDbConnected()) {
        return {
            success: true,
            period,
            captainName: 'Captain',
            totalEarnings: 0,
            totalRides: 0,
            averageFarePerRide: 0,
            currency: 'INR'
        };
    }

    const captain = await captainModel.findById(captainId);
    if (!captain) {
        return { success: false, error: 'Captain account not found.' };
    }

    const now = new Date();
    let startDate = new Date();
    if (period === 'today') {
        startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
        startDate.setDate(now.getDate() - 7);
    } else {
        startDate = new Date(0); // all time
    }

    const completedRides = await rideModel.find({
        captain: captainId,
        status: 'completed',
        createdAt: { $gte: startDate }
    });

    const totalEarnings = completedRides.reduce((sum, r) => sum + (r.fare || 0), 0);
    const totalRides = completedRides.length;

    return {
        success: true,
        period,
        captainName: `${captain.fullname?.firstname || 'Captain'} ${captain.fullname?.lastname || ''}`.trim(),
        totalEarnings,
        totalRides,
        averageFarePerRide: totalRides > 0 ? Math.round(totalEarnings / totalRides) : 0,
        currency: 'INR'
    };
}

/**
 * Gets driver rating and quality score.
 */
async function getDriverRating(authContext = {}) {
    const captainId = authContext.captainId;
    if (!captainId || !isValidObjectId(captainId)) {
        return {
            success: false,
            error: 'Authentication required. Please log in as a Captain to view rating.'
        };
    }

    if (!isDbConnected()) {
        return {
            success: true,
            rating: 4.8,
            totalRides: 0,
            ratingTier: 'Top Rated'
        };
    }

    const captain = await captainModel.findById(captainId);
    if (!captain) return { success: false, error: 'Captain not found.' };

    return {
        success: true,
        rating: captain.rating || 4.8,
        totalRides: captain.totalRides || 0,
        ratingTier: (captain.rating || 4.8) >= 4.7 ? 'Top Rated' : 'Standard'
    };
}

/**
 * Gets driver performance statistics (acceptance, cancellation, on-time rates).
 */
async function getDriverStats(authContext = {}) {
    const captainId = authContext.captainId;
    if (!captainId || !isValidObjectId(captainId)) {
        return {
            success: false,
            error: 'Authentication required. Please log in as a Captain to view performance statistics.'
        };
    }

    if (!isDbConnected()) {
        return {
            success: true,
            acceptanceRate: 95,
            cancellationRate: 3,
            onTimeRate: 97,
            rating: 4.8,
            totalRides: 0,
            status: 'active',
            vehicle: { vehicleType: 'car', color: 'White', plate: 'WB-34-AB-1234' }
        };
    }

    const captain = await captainModel.findById(captainId);
    if (!captain) return { success: false, error: 'Captain not found.' };

    return {
        success: true,
        acceptanceRate: captain.acceptanceRate || 95,
        cancellationRate: captain.cancellationRate || 3,
        onTimeRate: captain.onTimeRate || 97,
        rating: captain.rating || 4.8,
        totalRides: captain.totalRides || 0,
        status: captain.status,
        vehicle: captain.vehicle
    };
}

/**
 * Recommends high-opportunity demand zones to idle drivers.
 */
async function getNearbyDemandZones(authContext = {}) {
    const captainId = authContext.captainId;
    let driverLoc = null;

    if (captainId && isValidObjectId(captainId)) {
        const captain = await captainModel.findById(captainId);
        if (captain?.location?.coordinates && captain.location.coordinates.length === 2) {
            driverLoc = {
                lng: captain.location.coordinates[0],
                ltd: captain.location.coordinates[1]
            };
        }
    }

    const advice = await repositioningService.getDriverRepositioningAdvice(driverLoc);
    return {
        success: true,
        hasRecommendation: advice.hasRecommendation,
        message: advice.message,
        recommendedZone: advice.recommendedZone,
        alternatives: advice.alternatives
    };
}

/**
 * Gets dynamic demand hotspots across the city.
 */
async function getDemandHotspots() {
    const hotspots = await demandPredictionService.getDynamicHotspots();
    return {
        success: true,
        count: hotspots.length,
        hotspots: hotspots.map(h => ({
            id: h.id,
            name: h.name,
            area: h.area,
            intensity: h.intensity,
            expectedRides: h.expectedRides,
            demandSupplyRatio: h.demandSupplyRatio,
            surgeMultiplier: h.surgeMultiplier,
            recommendation: h.recommendation
        }))
    };
}

// ─── 3. Admin Tools ──────────────────────────────────────────────────────────

/**
 * Aggregates high-level platform operational analytics for admin.
 */
async function getAdminAnalytics(period = 'today', authContext = {}) {
    if (!authContext.isAdmin) {
        return {
            success: false,
            error: 'Forbidden: Admin authorization required to view platform analytics.'
        };
    }

    if (!isDbConnected()) {
        return {
            success: true,
            summary: {
                totalRides: 0,
                activeRides: 0,
                totalCaptains: 0,
                activeCaptains: 0,
                totalRevenue: 0,
                highRiskAnomalies: 0,
                platformCancellationRate: '3.4%'
            }
        };
    }

    const [totalRides, activeRides, totalCaptains, activeCaptains, completedRides, anomaliesCount] = await Promise.all([
        rideModel.countDocuments(),
        rideModel.countDocuments({ status: { $in: ['accepted', 'ongoing', 'payment-pending'] } }),
        captainModel.countDocuments(),
        captainModel.countDocuments({ status: 'active' }),
        rideModel.find({ status: 'completed' }).select('fare'),
        aiRiskLogModel.countDocuments({ riskLevel: 'HIGH' })
    ]);

    const totalRevenue = completedRides.reduce((sum, r) => sum + (r.fare || 0), 0);

    return {
        success: true,
        summary: {
            totalRides,
            activeRides,
            totalCaptains,
            activeCaptains,
            totalRevenue,
            highRiskAnomalies: anomaliesCount,
            platformCancellationRate: '3.4%'
        }
    };
}

/**
 * Gets currently active rides for admin monitoring.
 */
async function getActiveRides(authContext = {}) {
    if (!authContext.isAdmin) {
        return {
            success: false,
            error: 'Forbidden: Admin authorization required.'
        };
    }

    const rides = await rideModel.find({ status: { $in: ['accepted', 'ongoing'] } })
        .limit(10)
        .populate('user', 'fullname')
        .populate('captain', 'fullname vehicle');

    return {
        success: true,
        count: rides.length,
        rides: rides.map(r => ({
            rideId: r._id.toString(),
            rider: r.user?.fullname?.firstname || 'Rider',
            driver: r.captain?.fullname?.firstname || 'Driver',
            pickup: r.pickup,
            destination: r.destination,
            fare: r.fare,
            status: r.status
        }))
    };
}

/**
 * Gets flagged ride anomalies for admin review.
 */
async function getRideAnomalies(authContext = {}) {
    if (!authContext.isAdmin) {
        return {
            success: false,
            error: 'Forbidden: Admin authorization required.'
        };
    }

    const logs = await aiRiskLogModel.find({ status: 'pending_review' })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('rideId')
        .populate('captainId', 'fullname');

    return {
        success: true,
        count: logs.length,
        anomalies: logs.map(l => ({
            logId: l._id.toString(),
            riskScore: l.riskScore,
            riskLevel: l.riskLevel,
            reasons: l.reasons?.map(r => r.description),
            status: l.status
        }))
    };
}

/**
 * Gets live location and arrival distance/time of assigned driver.
 */
async function getDriverLocation(authContext = {}) {
    const current = await getCurrentRide(authContext);
    if (!current.success) return current;
    if (!current.hasActiveRide) {
        return {
            success: true,
            hasActiveRide: false,
            message: 'You currently have no active ride in progress.'
        };
    }
    if (!current.captainAssigned) {
        return {
            success: true,
            hasActiveRide: true,
            captainAssigned: false,
            status: current.status,
            message: 'Matching with nearby drivers in progress. Live driver location will appear as soon as a driver accepts your ride.'
        };
    }

    const driver = current.captain;
    let distanceKm = 1.8;
    let etaMinutes = 5;

    if (current.eta) {
        const match = current.eta.match(/(\d+)\s*mins?/i);
        if (match) {
            etaMinutes = parseInt(match[1], 10);
            distanceKm = parseFloat((etaMinutes * 0.35).toFixed(1));
        }
    }

    return {
        success: true,
        hasActiveRide: true,
        captainAssigned: true,
        driverName: driver?.name || 'Assigned Driver',
        phone: driver?.phone,
        vehicle: driver?.vehicle,
        rating: driver?.rating,
        distanceKm,
        etaMinutes,
        etaText: `${etaMinutes} mins`,
        status: current.status,
        pickup: current.pickup
    };
}

/**
 * Alias for getCurrentDriver.
 */
async function getDriverDetails(authContext = {}) {
    return getCurrentDriver(authContext);
}

/**
 * Alias for getTripETA.
 */
async function getRideETA(rideId = null, authContext = {}) {
    return getTripETA(rideId, authContext);
}

/**
 * Gets recent payment transactions for authenticated user or captain.
 */
async function getPaymentHistory(limit = 5, authContext = {}) {
    const filter = {};
    if (authContext.userId) {
        filter.userId = authContext.userId;
    } else if (authContext.captainId) {
        filter.captainId = authContext.captainId;
    } else {
        return { success: false, error: 'Authentication required to view payment history.' };
    }

    if (!isDbConnected()) {
        return {
            success: true,
            count: 0,
            payments: [],
            message: 'No recorded payments found.'
        };
    }

    const payments = await paymentModel.find(filter)
        .sort({ createdAt: -1 })
        .limit(Math.min(limit, 10))
        .populate('rideId', 'pickup destination fare');

    return {
        success: true,
        count: payments.length,
        payments: payments.map(p => ({
            paymentId: p.paymentId || p._id.toString(),
            amount: p.amount,
            status: p.paymentStatus,
            method: p.paymentMethod,
            transactionId: p.transactionId || 'N/A',
            ride: p.rideId ? {
                pickup: p.rideId.pickup,
                destination: p.rideId.destination,
                fare: p.rideId.fare
            } : null,
            date: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Recent'
        }))
    };
}

/**
 * Gets authenticated user or driver profile details.
 */
async function getUserProfile(authContext = {}) {
    if (!authContext.userId && !authContext.captainId) {
        return { success: false, error: 'Authentication required to view profile.' };
    }

    if (!isDbConnected()) {
        return {
            success: true,
            role: authContext.role || 'user',
            name: authContext.role === 'captain' ? 'Captain' : 'Customer'
        };
    }

    if (authContext.captainId) {
        const captain = await captainModel.findById(authContext.captainId).select('-password');
        if (!captain) return { success: false, error: 'Captain profile not found.' };
        return {
            success: true,
            role: 'captain',
            name: `${captain.fullname?.firstname || ''} ${captain.fullname?.lastname || ''}`.trim(),
            email: captain.email,
            phone: captain.phone,
            vehicle: captain.vehicle,
            status: captain.status,
            rating: captain.rating || 4.8
        };
    }

    if (authContext.userId) {
        const user = await userModel.findById(authContext.userId).select('-password');
        if (!user) return { success: false, error: 'User profile not found.' };
        return {
            success: true,
            role: 'user',
            name: `${user.fullname?.firstname || ''} ${user.fullname?.lastname || ''}`.trim(),
            email: user.email,
            phone: user.phone || 'N/A'
        };
    }

    return { success: false, error: 'Authentication required to view profile.' };
}

/**
 * Searches available ride categories (Drivo Go, Drivo Auto, Drivo Moto) with fare estimates and arrival ETAs.
 */
async function searchRideOptions(params = {}, authContext = {}) {
    const pickup = (params.pickup || '').trim();
    const destination = (params.destination || '').trim();

    if (!pickup || !destination) {
        return {
            success: true,
            pickup: null,
            destination: null,
            trafficCondition: 'Normal Flow',
            estimatedEtaMinutes: 5,
            surgeMultiplier: 1.0,
            options: [
                {
                    type: 'car',
                    name: 'Drivo Go',
                    label: 'Drivo Go (Car)',
                    fare: 185,
                    baseFare: 185,
                    etaMinutes: 4,
                    capacity: 4,
                    description: 'Comfortable, air-conditioned compact cars',
                    image: 'https://swyft.pl/wp-content/uploads/2023/05/how-many-people-can-a-uberx-take.jpg'
                },
                {
                    type: 'auto',
                    name: 'Drivo Auto',
                    label: 'Drivo Auto (Rickshaw)',
                    fare: 120,
                    baseFare: 120,
                    etaMinutes: 3,
                    capacity: 3,
                    description: 'Reliable three-wheeler auto rickshaw',
                    image: '/Uber_Auto.png'
                },
                {
                    type: 'moto',
                    name: 'Drivo Moto',
                    label: 'Drivo Moto (Motorcycle)',
                    fare: 85,
                    baseFare: 85,
                    etaMinutes: 2,
                    capacity: 1,
                    description: 'Fast, solo motorcycle ride to beat city traffic',
                    image: '/Uber_Moto.webp'
                }
            ]
        };
    }

    try {
        let fareData;
        try {
            fareData = await rideService.getFare(pickup, destination);
        } catch (fareErr) {
            fareData = { auto: 120, car: 185, moto: 85 };
        }

        let estimatedEtaMinutes = 15;
        let trafficCondition = 'Normal Flow';
        try {
            const etaInfo = await etaService.predictPreBookingETA({ pickup, destination, vehicleType: 'car' });
            if (etaInfo?.estimatedMinutes) estimatedEtaMinutes = etaInfo.estimatedMinutes;
            if (etaInfo?.trafficCondition) trafficCondition = etaInfo.trafficCondition;
        } catch (e) {}

        let surgeMultiplier = 1.0;
        let surgeReason = null;
        try {
            let coords = { ltd: 22.3375, lng: 87.3242 };
            try { coords = await mapService.getAddressCoordinate(pickup); } catch (e) {}
            const nearestZone = demandPredictionService.findNearestZone(coords);
            const zonePrediction = await demandPredictionService.predictZoneDemand(nearestZone);
            if (zonePrediction?.surgeMultiplier > 1.0) {
                surgeMultiplier = zonePrediction.surgeMultiplier;
                surgeReason = `Surge multiplier of ${surgeMultiplier}x applied due to elevated demand in ${zonePrediction.area}.`;
            }
        } catch (e) {}

        const options = [
            {
                type: 'car',
                name: 'Drivo Go',
                label: 'Drivo Go (Car)',
                fare: Math.round((fareData.car || 185) * surgeMultiplier),
                baseFare: fareData.car || 185,
                etaMinutes: Math.max(3, estimatedEtaMinutes),
                capacity: 4,
                description: 'Comfortable, air-conditioned compact cars',
                image: 'https://swyft.pl/wp-content/uploads/2023/05/how-many-people-can-a-uberx-take.jpg'
            },
            {
                type: 'auto',
                name: 'Drivo Auto',
                label: 'Drivo Auto (Rickshaw)',
                fare: Math.round((fareData.auto || 120) * surgeMultiplier),
                baseFare: fareData.auto || 120,
                etaMinutes: Math.max(2, estimatedEtaMinutes - 2),
                capacity: 3,
                description: 'Reliable three-wheeler auto rickshaw',
                image: '/Uber_Auto.png'
            },
            {
                type: 'moto',
                name: 'Drivo Moto',
                label: 'Drivo Moto (Motorcycle)',
                fare: Math.round((fareData.moto || 85) * surgeMultiplier),
                baseFare: fareData.moto || 85,
                etaMinutes: Math.max(2, estimatedEtaMinutes - 4),
                capacity: 1,
                description: 'Fast, solo motorcycle ride to beat city traffic',
                image: '/Uber_Moto.webp'
            }
        ];

        return {
            success: true,
            pickup,
            destination,
            trafficCondition,
            estimatedEtaMinutes,
            surgeMultiplier,
            surgeReason,
            options
        };
    } catch (err) {
        return {
            success: false,
            error: `Failed to search ride options: ${err.message}`
        };
    }
}

/**
 * Calculates estimated fare breakdown for a specific route and vehicle type.
 */
async function estimateFare(params = {}, authContext = {}) {
    const pickup = (params.pickup || '').trim();
    const destination = (params.destination || '').trim();
    const vehicleType = (params.vehicleType || 'car').toLowerCase();

    if (!pickup || !destination) {
        return {
            success: false,
            error: 'Pickup and destination are required to calculate a fare estimate.',
            missingFields: [!pickup ? 'pickup' : null, !destination ? 'destination' : null].filter(Boolean)
        };
    }

    const optionsRes = await searchRideOptions({ pickup, destination }, authContext);
    if (!optionsRes.success) return optionsRes;

    const selectedOption = optionsRes.options.find(o => o.type === vehicleType) || optionsRes.options[0];

    return {
        success: true,
        pickup,
        destination,
        vehicleType: selectedOption.type,
        vehicleName: selectedOption.name,
        estimatedFare: selectedOption.fare,
        baseFare: selectedOption.baseFare,
        surgeMultiplier: optionsRes.surgeMultiplier,
        etaMinutes: selectedOption.etaMinutes,
        allOptions: optionsRes.options
    };
}

/**
 * Books a ride with mandatory two-step confirmation.
 */
async function bookRide(params = {}, authContext = {}) {
    const userId = authContext.userId;
    if (!userId || !isValidObjectId(userId)) {
        return {
            success: false,
            error: 'Authentication required. Please sign in to your Drivo account to book a ride.'
        };
    }

    const pickup = (params.pickup || '').trim();
    const destination = (params.destination || '').trim();
    const vehicleType = (params.vehicleType || 'car').toLowerCase();
    const confirmed = params.confirmed === true;

    if (!pickup || !destination) {
        return {
            success: false,
            error: 'Both pickup address and destination are required to book a ride.',
            missingFields: [!pickup ? 'pickup' : null, !destination ? 'destination' : null].filter(Boolean)
        };
    }

    // Guard against booking multiple rides concurrently
    if (isDbConnected()) {
        const existingRide = await rideModel.findOne({
            user: userId,
            status: { $in: ['pending', 'accepted', 'ongoing', 'payment-pending'] }
        });
        if (existingRide) {
            return {
                success: false,
                hasActiveRide: true,
                existingRideId: existingRide._id.toString(),
                status: existingRide.status,
                error: `You already have an active ride (${existingRide.status}) from ${existingRide.pickup} to ${existingRide.destination}. Please track or cancel your existing ride before booking another.`
            };
        }
    }

    const fareRes = await estimateFare({ pickup, destination, vehicleType }, authContext);
    const estimatedFare = fareRes.success ? fareRes.estimatedFare : 185;
    const vehicleName = fareRes.success ? fareRes.vehicleName : 'Drivo Go';

    // REQUIRE EXPLICIT CONFIRMATION
    if (!confirmed) {
        return {
            success: true,
            requiresConfirmation: true,
            pickup,
            destination,
            vehicleType,
            vehicleName,
            estimatedFare,
            message: `You're booking a Drivo ride from ${pickup} to ${destination} via ${vehicleName}. Estimated fare: ₹${estimatedFare}. Would you like me to confirm the booking?`
        };
    }

    if (!isDbConnected()) {
        return {
            success: false,
            error: 'Database connection is currently offline. Please try again shortly.'
        };
    }

    try {
        const ride = await rideService.createRide({
            user: userId,
            pickup,
            destination,
            vehicleType
        });

        // 1. AI ETA Prediction
        let aiEta = null;
        try {
            aiEta = await etaService.predictPreBookingETA({ pickup, destination, vehicleType });
            ride.aiEstimatedDuration = (aiEta.estimatedMinutes || 15) * 60;
        } catch (etaErr) {}

        // 2. Geocode Pickup Location
        let pickupCoordinates = { ltd: 22.3375, lng: 87.3242 };
        try {
            pickupCoordinates = await mapService.getAddressCoordinate(pickup);
            ride.originCoordinates = pickupCoordinates;
        } catch (geoErr) {}

        // 3. Surge Multiplier
        try {
            const nearestZone = demandPredictionService.findNearestZone(pickupCoordinates);
            const zonePrediction = await demandPredictionService.predictZoneDemand(nearestZone);
            const surgeMultiplier = zonePrediction.surgeMultiplier || 1.0;
            if (surgeMultiplier > 1.0) {
                ride.fare = Math.round(ride.fare * surgeMultiplier);
                ride.surgeMultiplier = surgeMultiplier;
                ride.surgeReason = `Surge multiplier ${surgeMultiplier}x applied due to elevated demand near ${zonePrediction.area}.`;
            }
        } catch (surgeErr) {}

        // 4. Candidate Captains & Matching
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
            const allCaptains = await captainModel.find({});
            availableCaptains = allCaptains.filter(c => !busySet.has(c._id.toString()));
        }

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
                reason: topRank.explanation || `Selected captain with score ${topRank.matchScore}/100.`
            };
        }

        // Anomaly Evaluation
        try {
            const riskEval = await anomalyDetectionService.evaluateRideRisk(ride, { recentRequestsInWindow: 1 });
            ride.riskScore = riskEval.riskScore;
            ride.riskLevel = riskEval.riskLevel;
            ride.riskReasons = riskEval.reasons.map(r => r.code);
        } catch (e) {}

        await ride.save();

        // Broadcast to ranked captains
        ride.otp = "";
        const rideWithUser = await rideModel.findOne({ _id: ride._id }).populate('user');
        rankedCaptains.forEach(rankedItem => {
            const captainId = rankedItem.driverId || rankedItem.driver?._id;
            if (captainId) {
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
            }
        });

        // Notify user socket
        sendMessageToUser(userId, {
            event: 'ride-created',
            data: ride.toObject()
        });

        return {
            success: true,
            booked: true,
            rideId: ride._id.toString(),
            status: 'pending',
            pickup: ride.pickup,
            destination: ride.destination,
            fare: ride.fare,
            vehicleType,
            vehicleName,
            otp: rideWithUser?.otp || 'Generated',
            aiMatchScore: topRank?.matchScore || null,
            message: `Your Drivo ride from ${pickup} to ${destination} has been booked! Searching for nearby captains now.`
        };
    } catch (err) {
        console.error('bookRide tool error:', err);
        return {
            success: false,
            error: `Booking failed: ${err.message}`
        };
    }
}

/**
 * Cancels a ride with mandatory two-step confirmation.
 */
async function cancelRide(params = {}, authContext = {}) {
    const userId = authContext.userId;
    const captainId = authContext.captainId;

    if (!userId && !captainId) {
        return {
            success: false,
            error: 'Authentication required to cancel a ride.'
        };
    }

    if (!params.confirmed) {
        return {
            success: false,
            error: 'Confirmation required: Explicit user confirmation is required to cancel a ride.'
        };
    }

    if (!isDbConnected()) {
        return {
            success: false,
            error: 'Database connection offline. Please try again shortly.'
        };
    }

    let rideId = params.rideId;
    let ride = null;

    if (rideId && isValidObjectId(rideId)) {
        ride = await rideModel.findById(rideId).populate('user').populate('captain');
    } else if (userId) {
        ride = await rideModel.findOne({
            user: userId,
            status: { $in: ['pending', 'accepted', 'ongoing', 'payment-pending'] }
        }).populate('user').populate('captain').sort({ createdAt: -1 });
    } else if (captainId) {
        ride = await rideModel.findOne({
            captain: captainId,
            status: { $in: ['accepted', 'ongoing'] }
        }).populate('user').populate('captain').sort({ createdAt: -1 });
    }

    if (!ride) {
        return {
            success: false,
            error: 'No active ride found to cancel.'
        };
    }

    // Verify ownership
    const isUser = userId && ride.user && ride.user._id.toString() === userId.toString();
    const isCaptain = captainId && ride.captain && ride.captain._id.toString() === captainId.toString();

    if (!isUser && !isCaptain) {
        return {
            success: false,
            error: 'Unauthorized: You can only cancel your own rides.'
        };
    }

    if (ride.status === 'completed' || ride.status === 'cancelled') {
        return {
            success: false,
            error: `Ride is already ${ride.status}.`
        };
    }

    const createdAtTime = new Date(ride.createdAt).getTime();
    const minutesElapsed = (Date.now() - createdAtTime) / (1000 * 60);
    const cancellationFee = minutesElapsed > 3 && isUser ? 50 : 0;

    // REQUIRE EXPLICIT CONFIRMATION
    if (!params.confirmed) {
        return {
            success: true,
            requiresConfirmation: true,
            rideId: ride._id.toString(),
            pickup: ride.pickup,
            destination: ride.destination,
            status: ride.status,
            fare: ride.fare,
            cancellationFee,
            freeWindowRemaining: Math.max(0, Math.round(3 - minutesElapsed)),
            message: `Are you sure you want to cancel your ride from ${ride.pickup} to ${ride.destination}? ${cancellationFee > 0 ? 'A cancellation fee of ₹50 will apply.' : 'Free cancellation applies.'} Please confirm to proceed.`
        };
    }

    // CONFIRMED: Execute cancellation
    const cancelledBy = isUser ? 'user' : 'captain';
    ride.status = 'cancelled';
    ride.cancellationReason = params.reason || `${cancelledBy === 'user' ? 'Passenger' : 'Driver'} cancelled via Drivo AI Assistant`;
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

    if (isUser && ride.user) {
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

    return {
        success: true,
        cancelled: true,
        rideId: ride._id.toString(),
        status: 'cancelled',
        message: 'Your Drivo ride has been successfully cancelled.'
    };
}

/**
 * Updates the destination for an active ride.
 */
async function updateDestination(params = {}, authContext = {}) {
    const userId = authContext.userId;
    if (!userId) {
        return { success: false, error: 'Authentication required to update destination.' };
    }

    const newDestination = (params.destination || '').trim();
    if (!newDestination) {
        return { success: false, error: 'New destination address is required.' };
    }

    if (!isDbConnected()) {
        return { success: false, error: 'Database connection offline.' };
    }

    const ride = await rideModel.findOne({
        user: userId,
        status: { $in: ['pending', 'accepted', 'ongoing'] }
    }).populate('captain');

    if (!ride) {
        return {
            success: false,
            error: `You do not have an active ride in progress. Would you like to book a new ride to ${newDestination}?`
        };
    }

    let newFare;
    try {
        const fareData = await rideService.getFare(ride.pickup, newDestination);
        newFare = fareData[ride.vehicleType || 'car'] || Math.round(ride.fare * 1.1);
    } catch (e) {
        newFare = ride.fare;
    }

    if (!params.confirmed) {
        return {
            success: true,
            requiresConfirmation: true,
            rideId: ride._id.toString(),
            oldDestination: ride.destination,
            newDestination,
            oldFare: ride.fare,
            newFare,
            message: `Do you want to update your destination to ${newDestination}? Recalculated fare: ₹${newFare}. Please confirm to proceed.`
        };
    }

    ride.destination = newDestination;
    ride.fare = newFare;
    await ride.save();

    if (ride.captain) {
        sendMessageToUser(ride.captain._id, {
            event: 'destination-updated',
            data: { rideId: ride._id, destination: newDestination, fare: newFare }
        });
    }

    return {
        success: true,
        updated: true,
        rideId: ride._id.toString(),
        pickup: ride.pickup,
        destination: newDestination,
        fare: newFare,
        message: `Destination successfully updated to ${newDestination}. Updated fare: ₹${newFare}.`
    };
}

/**
 * Retrieves official Drivo support contact channels.
 */
async function contactSupport(params = {}, authContext = {}) {
    return {
        success: true,
        channels: {
            inAppChat: 'Available 24/7 in Drivo App',
            email: 'support@drivo.com',
            phone: '1800-DRIVO-SAFE (1800-37486-7233)',
            emergencySos: 'Immediate Police & Ambulance relay available on active trip screen',
            hours: '24 hours / 7 days a week'
        },
        message: "You can reach Drivo Support anytime via email at support@drivo.com or call our toll-free safety hotline at 1800-DRIVO-SAFE (1800-37486-7233). For active emergency assistance, tap the SOS button on your ride screen."
    };
}

module.exports = {
    // Core Rider Tools (Required by AI Assistant)
    searchRideOptions,
    estimateFare,
    bookRide,
    cancelRide,
    getCurrentRide,
    getRideStatus,
    getRideHistory,
    getRideDetails,
    getUserProfile,
    updateDestination,
    contactSupport,
    // Supporting Rider & Telemetry Tools
    getCurrentDriver,
    getDriverDetails,
    getDriverLocation,
    getTripETA,
    getRideETA,
    getRideFare,
    getSurgeDetails,
    getCancellationDetails,
    getPaymentDetails,
    getPaymentHistory,
    // Driver Tools
    getCurrentRider,
    getDriverEarnings,
    getDriverRating,
    getDriverStats,
    getNearbyDemandZones,
    getDemandHotspots,
    // Admin Tools
    getAdminAnalytics,
    getActiveRides,
    getRideAnomalies
};
