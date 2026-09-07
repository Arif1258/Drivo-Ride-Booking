const {
    predictRideETA,
    detectZoneCongestionMultiplier
} = require('../services/ai/etaPredictionService');

describe('AI ETA Prediction Service', () => {
    test('predicts ETA and returns explainable factors', async () => {
        const result = await predictRideETA({
            pickup: 'Golbazar, Kharagpur',
            destination: 'IIT Kharagpur Main Gate',
            baseDistanceMeters: 5000,
            baseDurationSeconds: 600 // 10 minutes
        });

        expect(result.aiEtaMinutes).toBeGreaterThanOrEqual(10);
        expect(result.baseEtaMinutes).toBe(10);
        expect(result.trafficDelayMinutes).toBeGreaterThanOrEqual(0);
        expect(result.confidencePercent).toBeGreaterThanOrEqual(80);
        expect(result.badgeText).toContain('AI Estimated Arrival');
        expect(result.factors).toHaveProperty('compositeTrafficFactor');
        expect(result.factors).toHaveProperty('timeOfDayMultiplier');
    });

    test('detectZoneCongestionMultiplier identifies known traffic bottlenecks', () => {
        const stationFactor = detectZoneCongestionMultiplier('Railway Station', 'Market');
        const normalFactor = detectZoneCongestionMultiplier('Sector 5', 'Sector 9');

        expect(stationFactor).toBeGreaterThan(1.0);
        expect(stationFactor).toBeGreaterThan(normalFactor);
    });

    test('rush hour prediction results in higher delay than off-peak hour', async () => {
        const rushDate = new Date();
        rushDate.setHours(18); // 6 PM

        const lateNightDate = new Date();
        lateNightDate.setHours(2); // 2 AM

        const rushETA = await predictRideETA({
            pickup: 'Central Market',
            destination: 'Hospital',
            baseDistanceMeters: 6000,
            baseDurationSeconds: 720,
            targetTime: rushDate
        });

        const nightETA = await predictRideETA({
            pickup: 'Central Market',
            destination: 'Hospital',
            baseDistanceMeters: 6000,
            baseDurationSeconds: 720,
            targetTime: lateNightDate
        });

        expect(rushETA.aiEtaMinutes).toBeGreaterThanOrEqual(nightETA.aiEtaMinutes);
    });

    test('handles fallback gracefully when inputs are minimal', async () => {
        const fallback = await predictRideETA({
            pickup: 'Point A',
            destination: 'Point B'
        });

        expect(fallback.aiEtaMinutes).toBeGreaterThan(0);
        expect(fallback.badgeText).toBeDefined();
    });
});
