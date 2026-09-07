/**
 * AI Ride Anomaly & Fraud Detection Engine
 * 
 * Evaluates ride events and trajectories against statistical thresholds
 * to flag potential fraud, driver-rider collusion, GPS spoofing, or abnormal behaviors.
 * 
 * Note: Does not automatically block users; flags suspicious cases for administrative review.
 */

const aiRiskLogModel = require('../../models/aiRiskLog.model');
const rideModel = require('../../models/ride.model');

// Threshold constants
const THRESHOLDS = {
    MAX_REASONABLE_SPEED_KMH: 150,    // Speeds above 150 km/h in urban areas trigger GPS spoofing flag
    MIN_DURATION_PER_KM_SEC: 15,     // Under 15 seconds per km indicates instant fake completion
    MAX_DURATION_MULTIPLIER: 4.0,    // Taking > 4x expected time
    HIGH_CANCELLATION_RATE_PCT: 35,  // Above 35% cancellations
    RAPID_REQUEST_WINDOW_SEC: 25,    // Booking attempts within 25 seconds
    ROUTE_DEVIATION_MULTIPLIER: 2.5  // Distance > 2.5x straight line
};

/**
 * Evaluates a ride for anomalies and assigns a transparent risk score.
 * 
 * @param {Object} rideData
 * @param {Object} context - Optional user/captain historical metrics
 * @returns {Object} Risk evaluation with score, level, and explainable reasons
 */
async function evaluateRideRisk(rideData, context = {}) {
    const reasons = [];
    let riskScore = 0;

    const distanceMeters = rideData.distance || 0;
    const durationSeconds = rideData.duration || 0;
    const distanceKm = distanceMeters / 1000;
    const durationHours = durationSeconds / 3600;

    // 1. Teleportation / Impossible Speed Check
    if (distanceKm > 1 && durationHours > 0) {
        const speedKmH = distanceKm / durationHours;
        if (speedKmH > THRESHOLDS.MAX_REASONABLE_SPEED_KMH) {
            const addedRisk = Math.min(45, Math.round((speedKmH - 120) * 0.5));
            riskScore += addedRisk;
            reasons.push({
                code: 'GPS_SPOOF_HIGH_SPEED',
                description: `Implied speed of ${speedKmH.toFixed(0)} km/h exceeds maximum physical threshold (${THRESHOLDS.MAX_REASONABLE_SPEED_KMH} km/h). Possible GPS spoofing.`,
                severity: 'HIGH'
            });
        }
    }

    // 2. Instant Completion Check (multi-km ride ended in under a minute)
    if (distanceKm > 2 && durationSeconds < 60 && durationSeconds > 0) {
        riskScore += 40;
        reasons.push({
            code: 'INSTANT_COMPLETION',
            description: `Trip of ${distanceKm.toFixed(1)} km completed in only ${durationSeconds} seconds.`,
            severity: 'HIGH'
        });
    }

    // 3. Extreme Trip Duration Anomaly (stalled ride / meter running)
    if (distanceKm > 0 && durationSeconds > 0) {
        const expectedSeconds = (distanceKm / 25) * 3600; // 25 km/h standard
        if (durationSeconds > expectedSeconds * THRESHOLDS.MAX_DURATION_MULTIPLIER) {
            riskScore += 25;
            reasons.push({
                code: 'ABNORMAL_DURATION',
                description: `Ride duration (${Math.round(durationSeconds / 60)} min) is ${THRESHOLDS.MAX_DURATION_MULTIPLIER}x greater than predicted for ${distanceKm.toFixed(1)} km.`,
                severity: 'MEDIUM'
            });
        }
    }

    // 4. Abnormal Cancellation History (Contextual)
    const userCancelRate = context.userCancellationRate || 0;
    const captainCancelRate = context.captainCancellationRate || 0;

    if (userCancelRate > THRESHOLDS.HIGH_CANCELLATION_RATE_PCT) {
        riskScore += 20;
        reasons.push({
            code: 'HIGH_USER_CANCELLATION',
            description: `Passenger cancellation rate of ${userCancelRate}% exceeds alert threshold (${THRESHOLDS.HIGH_CANCELLATION_RATE_PCT}%).`,
            severity: 'MEDIUM'
        });
    }

    if (captainCancelRate > THRESHOLDS.HIGH_CANCELLATION_RATE_PCT) {
        riskScore += 20;
        reasons.push({
            code: 'HIGH_DRIVER_CANCELLATION',
            description: `Driver cancellation rate of ${captainCancelRate}% exceeds alert threshold.`,
            severity: 'MEDIUM'
        });
    }

    // 5. Rapid Repeated Booking Velocity
    if (context.recentRequestsInWindow && context.recentRequestsInWindow >= 3) {
        riskScore += 20;
        reasons.push({
            code: 'RAPID_REQUEST_BURST',
            description: `${context.recentRequestsInWindow} ride requests initiated within rapid succession (< 60s).`,
            severity: 'LOW'
        });
    }

    // 6. Payment Failures
    if (context.paymentFailures && context.paymentFailures >= 2) {
        riskScore += 15 * context.paymentFailures;
        reasons.push({
            code: 'PAYMENT_FAILURE_SPIKE',
            description: `${context.paymentFailures} failed payment attempts recorded for this ride or user session.`,
            severity: 'HIGH'
        });
    }

    // Clamp score between 0 and 100
    riskScore = Math.min(100, Math.max(0, riskScore));

    // Assign risk level
    let riskLevel = 'LOW';
    if (riskScore >= 70) {
        riskLevel = 'HIGH';
    } else if (riskScore >= 40) {
        riskLevel = 'MEDIUM';
    }

    const requiresAdminReview = riskScore >= 60;
    const isFlagged = riskScore >= 40;

    let explanation = 'Normal ride activity verified.';
    if (reasons.length > 0) {
        explanation = `Risk Score: ${riskScore}/100 (${riskLevel}) — ${reasons.map(r => r.description).join(' ')}`;
    }

    const evaluationResult = {
        riskScore,
        riskLevel,
        isFlagged,
        requiresAdminReview,
        reasons,
        explanation,
        evaluatedAt: new Date()
    };

    // Save audit log to database if flagged or if rideId is present
    if (rideData._id && (isFlagged || reasons.length > 0)) {
        try {
            await aiRiskLogModel.create({
                rideId: rideData._id,
                userId: rideData.user?._id || rideData.user,
                captainId: rideData.captain?._id || rideData.captain || null,
                riskScore,
                riskLevel,
                reasons,
                featuresSnapshot: {
                    distanceMeters,
                    durationSeconds,
                    averageSpeedKmH: durationHours > 0 ? parseFloat((distanceKm / durationHours).toFixed(1)) : 0,
                    userCancellationRate: userCancelRate,
                    captainCancellationRate: captainCancelRate,
                    paymentFailures: context.paymentFailures || 0
                }
            });

            // Update ride model directly
            await rideModel.findByIdAndUpdate(rideData._id, {
                riskScore,
                riskLevel,
                riskReasons: reasons.map(r => r.code)
            });
        } catch (dbErr) {
            console.warn('Failed to persist AI risk log:', dbErr.message);
        }
    }

    return evaluationResult;
}

/**
 * Retrieves recent flagged rides for the Admin Dashboard.
 */
async function getFlaggedRidesForAdmin(options = {}) {
    const limit = options.limit || 20;
    try {
        const logs = await aiRiskLogModel.find({
            status: { $in: ['pending_review', 'reviewed'] }
        })
            .populate('rideId')
            .populate('userId', 'fullname email')
            .populate('captainId', 'fullname vehicle')
            .sort({ createdAt: -1 })
            .limit(limit);

        return logs;
    } catch (err) {
        console.error('Error fetching flagged rides:', err);
        return [];
    }
}

module.exports = {
    evaluateRideRisk,
    getFlaggedRidesForAdmin,
    THRESHOLDS
};
