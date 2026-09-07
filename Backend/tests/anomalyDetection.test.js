const {
    evaluateRideRisk,
    THRESHOLDS
} = require('../services/ai/anomalyDetectionService');

describe('AI Ride Anomaly & Fraud Detection Engine', () => {
    test('normal ride returns LOW risk score and no flags', async () => {
        const normalRide = {
            distance: 4500, // 4.5 km
            duration: 900   // 15 mins (18 km/h)
        };

        const result = await evaluateRideRisk(normalRide, {
            userCancellationRate: 5,
            captainCancellationRate: 3
        });

        expect(result.riskScore).toBeLessThan(40);
        expect(result.riskLevel).toBe('LOW');
        expect(result.isFlagged).toBe(false);
        expect(result.requiresAdminReview).toBe(false);
    });

    test('impossible speed (> 150 km/h) triggers GPS spoofing high risk flag', async () => {
        const impossibleSpeedRide = {
            distance: 25000, // 25 km
            duration: 300    // 5 minutes -> 300 km/h
        };

        const result = await evaluateRideRisk(impossibleSpeedRide);

        expect(result.riskScore).toBeGreaterThanOrEqual(40);
        expect(result.isFlagged).toBe(true);
        expect(result.reasons.some(r => r.code === 'GPS_SPOOF_HIGH_SPEED')).toBe(true);
    });

    test('instant completion (< 60s for multi-km) triggers fraud flag', async () => {
        const instantRide = {
            distance: 6000, // 6 km
            duration: 35    // 35 seconds
        };

        const result = await evaluateRideRisk(instantRide);

        expect(result.riskScore).toBeGreaterThanOrEqual(40);
        expect(result.reasons.some(r => r.code === 'INSTANT_COMPLETION')).toBe(true);
    });

    test('abnormal cancellation rate and payment failures elevate risk', async () => {
        const highRiskContext = {
            userCancellationRate: 65, // > 35% threshold
            paymentFailures: 3        // 3 failed payment attempts
        };

        const result = await evaluateRideRisk({ distance: 3000, duration: 600 }, highRiskContext);

        expect(result.riskScore).toBeGreaterThanOrEqual(50);
        expect(result.reasons.some(r => r.code === 'HIGH_USER_CANCELLATION')).toBe(true);
        expect(result.reasons.some(r => r.code === 'PAYMENT_FAILURE_SPIKE')).toBe(true);
    });
});
