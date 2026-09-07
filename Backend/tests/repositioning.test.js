const { getRepositioningAdvice } = require('../services/ai/repositioningService');

describe('Intelligent Driver Repositioning Service', () => {
    test('provides recommendation with destination, distance, and probability boost', async () => {
        const driverLocation = { ltd: 22.3300, lng: 87.3200 };
        const advice = await getRepositioningAdvice(driverLocation);

        expect(advice).toHaveProperty('recommendedZone');
        expect(advice.recommendedZone).toHaveProperty('name');
        expect(advice.recommendedZone).toHaveProperty('distanceKm');
        expect(advice.recommendedZone.probabilityBoostPercent).toBeGreaterThanOrEqual(10);
        expect(advice).toHaveProperty('message');
        expect(typeof advice.message).toBe('string');
        expect(advice.message.length).toBeGreaterThan(20);
        expect(Array.isArray(advice.alternatives)).toBe(true);
    });

    test('detects when driver is already inside optimal zone', async () => {
        // Position directly at Kharagpur Station
        const stationLocation = { ltd: 22.3375, lng: 87.3242 };
        const advice = await getRepositioningAdvice(stationLocation);

        expect(advice.recommendedZone.distanceKm).toBeLessThanOrEqual(1.0);
        expect(advice.message).toBeDefined();
    });

    test('handles missing or undefined driver coordinates safely', async () => {
        const advice = await getRepositioningAdvice(null);
        expect(advice.recommendedZone).toBeDefined();
        expect(advice.message).toBeDefined();
    });
});
