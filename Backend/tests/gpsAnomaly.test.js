const { validateGpsTelemetry, GPS_THRESHOLDS } = require('../services/ai/gpsAnomalyService');

describe('GPS Anomaly & Telemetry Validation Engine', () => {
    test('passes valid realistic driving telemetry without anomaly flags', async () => {
        const previousTimestamp = new Date(Date.now() - 30 * 1000); // 30 seconds ago
        const currentTimestamp = new Date();

        const result = await validateGpsTelemetry({
            previousLocation: { ltd: 22.3300, lng: 87.3200 },
            currentLocation: { ltd: 22.3320, lng: 87.3210 }, // ~240 meters in 30s (~29 km/h)
            previousTimestamp,
            currentTimestamp
        });

        expect(result.isValid).toBe(true);
        expect(result.isAnomalous).toBe(false);
        expect(result.reasons).toHaveLength(0);
        expect(result.speedKmH).toBeLessThan(GPS_THRESHOLDS.MAX_SPEED_KMH);
    });

    test('flags impossible GPS jump / teleportation (> 500m in <= 3 seconds)', async () => {
        const previousTimestamp = new Date(Date.now() - 2 * 1000); // 2 seconds ago
        const currentTimestamp = new Date();

        const result = await validateGpsTelemetry({
            previousLocation: { ltd: 22.3300, lng: 87.3200 },
            currentLocation: { ltd: 22.3500, lng: 87.3400 }, // ~3 km jump in 2 seconds!
            previousTimestamp,
            currentTimestamp
        });

        expect(result.isAnomalous).toBe(true);
        const hasJumpOrSpeed = result.reasons.some(r => 
            r.code === 'IMPOSSIBLE_GPS_JUMP' || r.code === 'UNREALISTIC_DRIVING_SPEED'
        );
        expect(hasJumpOrSpeed).toBe(true);
    });

    test('flags unrealistic driving speed (> 150 km/h in urban contexts)', async () => {
        const previousTimestamp = new Date(Date.now() - 10 * 1000); // 10 seconds ago
        const currentTimestamp = new Date();

        const result = await validateGpsTelemetry({
            previousLocation: { ltd: 22.3300, lng: 87.3200 },
            currentLocation: { ltd: 22.3400, lng: 87.3300 }, // ~1.5 km in 10s (~540 km/h)
            previousTimestamp,
            currentTimestamp
        });

        expect(result.isAnomalous).toBe(true);
        const speedReason = result.reasons.find(r => r.code === 'UNREALISTIC_DRIVING_SPEED');
        expect(speedReason).toBeDefined();
        expect(result.speedKmH).toBeGreaterThan(150);
    });

    test('detects missing or malformed coordinates', async () => {
        const result = await validateGpsTelemetry({
            currentLocation: null
        });

        expect(result.isAnomalous).toBe(true);
        expect(result.reasons.some(r => r.code === 'MISSING_COORDINATES')).toBe(true);
    });

    test('detects invalid coordinate types', async () => {
        const result = await validateGpsTelemetry({
            currentLocation: { ltd: 'invalid_lat', lng: 87.32 }
        });

        expect(result.isAnomalous).toBe(true);
        expect(result.reasons.some(r => r.code === 'INVALID_COORDINATE_FORMAT')).toBe(true);
    });

    test('detects out-of-bounds latitude/longitude', async () => {
        const result = await validateGpsTelemetry({
            currentLocation: { ltd: 95.0, lng: 87.32 }
        });

        expect(result.isAnomalous).toBe(true);
        expect(result.reasons.some(r => r.code === 'OUT_OF_BOUNDS_COORDINATES')).toBe(true);
    });

    test('flags duplicate coordinates received rapidly', async () => {
        const previousTimestamp = new Date(Date.now() - 1000); // 1 second ago
        const currentTimestamp = new Date();

        const result = await validateGpsTelemetry({
            previousLocation: { ltd: 22.3300, lng: 87.3200 },
            currentLocation: { ltd: 22.3300, lng: 87.3200 },
            previousTimestamp,
            currentTimestamp
        });

        expect(result.reasons.some(r => r.code === 'DUPLICATE_COORDINATES')).toBe(true);
    });
});
