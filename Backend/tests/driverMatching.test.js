const {
    scoreDriver,
    rankDrivers,
    calculateHaversineDistance,
    estimatePickupEta
} = require('../services/ai/driverMatchingService');

describe('AI Driver Matching Service', () => {
    const mockPickup = { ltd: 22.3375, lng: 87.3242 };

    const mockCaptains = [
        {
            _id: 'cap_close_avg',
            fullname: { firstname: 'Rahul', lastname: 'Verma' },
            location: { type: 'Point', coordinates: [87.3250, 22.3380] }, // ~0.1 km away
            rating: 4.2,
            acceptanceRate: 85,
            cancellationRate: 5,
            onTimeRate: 90,
            vehicle: { vehicleType: 'car' }
        },
        {
            _id: 'cap_far_top',
            fullname: { firstname: 'Priya', lastname: 'Sharma' },
            location: { type: 'Point', coordinates: [87.3800, 22.3800] }, // ~7 km away
            rating: 4.95,
            acceptanceRate: 98,
            cancellationRate: 1,
            onTimeRate: 99,
            vehicle: { vehicleType: 'car' }
        },
        {
            _id: 'cap_balanced',
            fullname: { firstname: 'Amit', lastname: 'Roy' },
            location: { type: 'Point', coordinates: [87.3350, 22.3420] }, // ~1.2 km away
            rating: 4.85,
            acceptanceRate: 96,
            cancellationRate: 2,
            onTimeRate: 97,
            vehicle: { vehicleType: 'car' }
        }
    ];

    test('calculateHaversineDistance returns accurate distance in km', () => {
        const dist = calculateHaversineDistance(22.3375, 87.3242, 22.3380, 87.3250);
        expect(dist).toBeGreaterThan(0);
        expect(dist).toBeLessThan(1.0);
    });

    test('estimatePickupEta scales with distance', () => {
        const shortEta = estimatePickupEta(1.0);
        const longEta = estimatePickupEta(8.0);
        expect(shortEta).toBeGreaterThanOrEqual(1);
        expect(longEta).toBeGreaterThan(shortEta);
    });

    test('scoreDriver calculates transparent factors and score between 0 and 100', () => {
        const result = scoreDriver(mockCaptains[0], mockPickup, { vehicleType: 'car' });
        expect(result.matchScore).toBeGreaterThanOrEqual(0);
        expect(result.matchScore).toBeLessThanOrEqual(100);
        expect(result.factors).toHaveProperty('proximity');
        expect(result.factors).toHaveProperty('eta');
        expect(result.factors).toHaveProperty('rating');
        expect(result.factors).toHaveProperty('acceptance');
        expect(result.factors).toHaveProperty('reliability');
        expect(result.factors).toHaveProperty('vehicleMatch');
        expect(typeof result.explanation).toBe('string');
    });

    test('rankDrivers correctly ranks candidate drivers with ordinal ranks', () => {
        const ranked = rankDrivers(mockPickup, mockCaptains, { vehicleType: 'car' });
        expect(ranked).toHaveLength(3);
        expect(ranked[0].rank).toBe(1);
        expect(ranked[1].rank).toBe(2);
        expect(ranked[2].rank).toBe(3);
        expect(ranked[0].matchScore).toBeGreaterThanOrEqual(ranked[1].matchScore);
        expect(ranked[1].matchScore).toBeGreaterThanOrEqual(ranked[2].matchScore);
    });

    test('rankDrivers handles empty driver list gracefully', () => {
        const ranked = rankDrivers(mockPickup, []);
        expect(ranked).toEqual([]);
    });

    test('rankDrivers handles malformed or missing coordinates gracefully', () => {
        const incompleteCaptains = [{ _id: 'cap_bad', fullname: { firstname: 'X' } }];
        const ranked = rankDrivers(null, incompleteCaptains);
        expect(ranked).toHaveLength(1);
        expect(ranked[0].matchScore).toBeDefined();
    });
});
