const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');

describe('AI API Endpoints Integration', () => {
    afterAll(async () => {
        await mongoose.connection.close();
    });

    test('POST /api/ai/predict-eta returns AI ETA breakdown', async () => {
        const res = await request(app)
            .post('/api/ai/predict-eta')
            .send({
                pickup: 'Kharagpur Railway Station',
                destination: 'IIT Kharagpur Main Gate',
                baseDistanceMeters: 5500,
                baseDurationSeconds: 700
            });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('aiEtaMinutes');
        expect(res.body).toHaveProperty('badgeText');
        expect(res.body).toHaveProperty('factors');
    });

    test('POST /api/ai/predict-eta validates missing parameters', async () => {
        const res = await request(app)
            .post('/api/ai/predict-eta')
            .send({});

        expect(res.status).toBe(400);
    });

    test('GET /api/ai/demand-zones returns all zone forecasts', async () => {
        const res = await request(app).get('/api/ai/demand-zones');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThanOrEqual(4);
        expect(res.body[0]).toHaveProperty('predictedDemand');
    });

    test('GET /api/ai/demand-prediction returns prediction for requested area', async () => {
        const res = await request(app)
            .get('/api/ai/demand-prediction')
            .query({ area: 'Station' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('expectedRides');
        expect(res.body).toHaveProperty('demandSupplyRatio');
    });

    test('POST /api/ai/evaluate-risk evaluates mock ride trajectory', async () => {
        const res = await request(app)
            .post('/api/ai/evaluate-risk')
            .send({
                distance: 5000,
                duration: 900
            });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('riskScore');
        expect(res.body).toHaveProperty('riskLevel');
    });

    test('POST /api/ai/support-chat answers policy questions', async () => {
        const res = await request(app)
            .post('/api/ai/support-chat')
            .send({
                query: 'What is the ride cancellation policy?'
            });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('text');
        expect(res.body.text).toContain('cancellation');
    });

    test('GET /api/ai/admin-dashboard aggregates live metrics', async () => {
        const res = await request(app).get('/api/ai/admin-dashboard');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('summary');
        expect(res.body).toHaveProperty('demandZones');
        expect(res.body).toHaveProperty('operationalInsights');
    });
});
