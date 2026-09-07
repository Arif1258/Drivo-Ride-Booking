const {
    predictZoneDemand,
    predictAllZones,
    findNearestZone,
    ZONES,
    HOURLY_MULTIPLIERS,
    DAY_MULTIPLIERS
} = require('../services/ai/demandPredictionService');

describe('AI Demand Prediction Service', () => {
    test('ZONES contains defined geographic operational sectors', () => {
        expect(Array.isArray(ZONES)).toBe(true);
        expect(ZONES.length).toBeGreaterThanOrEqual(4);
        expect(ZONES[0]).toHaveProperty('id');
        expect(ZONES[0]).toHaveProperty('name');
        expect(ZONES[0]).toHaveProperty('center');
    });

    test('findNearestZone resolves by name or coordinates', () => {
        const stationZone = findNearestZone('Kharagpur Station');
        expect(stationZone.id).toBe('kharagpur_station');

        const iitZone = findNearestZone({ ltd: 22.3149, lng: 87.3105 });
        expect(iitZone.id).toBe('iit_campus');
    });

    test('predictZoneDemand computes realistic demand, supply, and ratio', async () => {
        const testDate = new Date();
        testDate.setHours(18); // 6 PM evening rush
        const result = await predictZoneDemand(ZONES[0], testDate);

        expect(result).toHaveProperty('area');
        expect(result).toHaveProperty('predictedDemand');
        expect(['LOW', 'MEDIUM', 'HIGH', 'SURGE']).toContain(result.predictedDemand);
        expect(result.expectedRides).toBeGreaterThan(0);
        expect(result.availableDrivers).toBeGreaterThan(0);
        expect(result.demandSupplyRatio).toBeGreaterThan(0);
        expect(result.confidenceScore).toBeGreaterThanOrEqual(75);
        expect(result.explanation).toContain(result.area);
    });

    test('evening rush hour yields higher demand than 3 AM night hour', async () => {
        const nightDate = new Date();
        nightDate.setHours(3);

        const eveningDate = new Date();
        eveningDate.setHours(18);

        const nightDemand = await predictZoneDemand(ZONES[0], nightDate);
        const eveningDemand = await predictZoneDemand(ZONES[0], eveningDate);

        expect(eveningDemand.expectedRides).toBeGreaterThan(nightDemand.expectedRides);
    });

    test('predictAllZones returns sorted list of all operational zones', async () => {
        const allZones = await predictAllZones();
        expect(allZones).toHaveLength(ZONES.length);
        expect(allZones[0].demandSupplyRatio).toBeGreaterThanOrEqual(allZones[allZones.length - 1].demandSupplyRatio);
    });
});
