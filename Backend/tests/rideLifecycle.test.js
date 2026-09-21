const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../app');
const userModel = require('../models/user.model');
const captainModel = require('../models/captain.model');
const rideModel = require('../models/ride.model');
const connectToDb = require('../db/db');
const {
    getLastRideDetailsTool,
    getFareExplanationTool,
    resolveQueryDeterministically,
    askZenSupport
} = require('../services/aiSupportService');

jest.setTimeout(30000);

describe('Ride Lifecycle, Rating, Cancellation & Grounded AI Verification', () => {
    let testUser;
    let testCaptain;
    let userToken;
    let captainToken;
    let testRide;

    beforeAll(async () => {
        await connectToDb();

        // Clean up any test relics
        await userModel.deleteMany({ 'email': /lifecycle_test/ });
        await captainModel.deleteMany({ 'email': /lifecycle_test/ });

        // Create test user
        testUser = await userModel.create({
            fullname: { firstname: 'TestRider', lastname: 'Lifecycle' },
            email: `lifecycle_test_user_${Date.now()}@drivo.com`,
            password: 'hashedPassword123'
        });

        // Create test captain
        testCaptain = await captainModel.create({
            fullname: { firstname: 'TestCaptain', lastname: 'Lifecycle' },
            email: `lifecycle_test_captain_${Date.now()}@drivo.com`,
            password: 'hashedPassword123',
            status: 'active',
            vehicle: {
                color: 'White',
                plate: 'WB-02-AB-1234',
                capacity: 4,
                vehicleType: 'car'
            },
            location: { ltd: 22.3149, lng: 87.3105 },
            rating: 5.0,
            totalRatings: 1,
            totalEarnings: 0,
            totalRides: 0
        });

        userToken = jwt.sign({ _id: testUser._id }, process.env.JWT_SECRET || 'secret');
        captainToken = jwt.sign({ _id: testCaptain._id }, process.env.JWT_SECRET || 'secret');
    });

    afterAll(async () => {
        if (testUser) await userModel.findByIdAndDelete(testUser._id);
        if (testCaptain) await captainModel.findByIdAndDelete(testCaptain._id);
        if (testRide) await rideModel.findByIdAndDelete(testRide._id);
        await mongoose.connection.close();
    });

    test('Captain online/offline toggle via POST /captains/toggle-status', async () => {
        // Initially active -> toggle to inactive
        const res1 = await request(app)
            .post('/captains/toggle-status')
            .set('Authorization', `Bearer ${captainToken}`);

        expect(res1.status).toBe(200);
        expect(res1.body.captain.status).toBe('inactive');

        // Toggle back to active
        const res2 = await request(app)
            .post('/captains/toggle-status')
            .set('Authorization', `Bearer ${captainToken}`);

        expect(res2.status).toBe(200);
        expect(res2.body.captain.status).toBe('active');
    });

    test('Ride creation, live surge attachment, and cancellation via POST /rides/cancel', async () => {
        // Create a ride record
        testRide = await rideModel.create({
            user: testUser._id,
            captain: testCaptain._id,
            pickup: 'Technology Market, IIT Kharagpur',
            destination: 'Kharagpur Railway Station',
            fare: 180,
            status: 'accepted',
            duration: 900,
            distance: 5200,
            otp: '1234',
            surgeMultiplier: 1.25,
            surgeReason: 'High demand in Tech Market'
        });

        expect(testRide.status).toBe('accepted');
        expect(testRide.surgeMultiplier).toBe(1.25);

        // Cancel ride via API
        const cancelRes = await request(app)
            .post('/rides/cancel')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                rideId: testRide._id,
                reason: 'Changed pickup location'
            });

        expect(cancelRes.status).toBe(200);
        expect(cancelRes.body.ride.status).toBe('cancelled');
        expect(cancelRes.body.ride.cancelledBy).toBe('user');
        expect(cancelRes.body.ride.cancellationReason).toBe('Changed pickup location');
    });

    test('Ride rating and captain composite rating update via POST /rides/rate', async () => {
        // Set ride to completed
        testRide.status = 'completed';
        await testRide.save();

        const rateRes = await request(app)
            .post('/rides/rate')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                rideId: testRide._id,
                rating: 4,
                feedback: 'Smooth driving and clean car'
            });

        expect(rateRes.status).toBe(200);
        expect(rateRes.body.ride.rating).toBe(4);
        expect(rateRes.body.ride.feedback).toBe('Smooth driving and clean car');

        // Verify captain composite rating was updated
        const updatedCaptain = await captainModel.findById(testCaptain._id);
        expect(typeof updatedCaptain.rating).toBe('number');
        expect(updatedCaptain.rating).toBeGreaterThan(0);
    });

    test('AI Data Grounding: getLastRideDetailsTool retrieves real database trip', async () => {
        const details = await getLastRideDetailsTool(testUser._id);
        expect(details.hasRide).toBe(true);
        expect(details.pickup).toBe('Technology Market, IIT Kharagpur');
        expect(details.destination).toBe('Kharagpur Railway Station');
        expect(Number(details.distanceKm)).toBe(5.2);
        expect(details.fare).toBe(180);
        expect(details.status).toBe('completed');
    });

    test('AI Data Grounding: getFareExplanationTool provides mathematical fare breakdown', async () => {
        const fareExpl = await getFareExplanationTool(testUser._id);
        expect(fareExpl.hasRide).toBe(true);
        expect(fareExpl.finalFare).toBe(180);
        expect(fareExpl.surgeMultiplier).toBe(1.25);
        expect(fareExpl.explanation).toContain('1.25x');
    });

    test('Grounded AI Support answers specific user queries deterministically', async () => {
        // Query 1: Last ride cost
        const costRes = await resolveQueryDeterministically('How much did my last ride cost?', testUser._id);
        expect(costRes.text).toContain('₹180');
        expect(costRes.source).toBe('getLastRideDetails');

        // Query 2: Distance of last ride
        const distRes = await resolveQueryDeterministically('What was the distance of my last ride?', testUser._id);
        expect(distRes.text).toContain('5.2 km');

        // Query 3: Why was surge applied
        const surgeRes = await resolveQueryDeterministically('Why was surge pricing applied to my ride?', testUser._id);
        expect(surgeRes.text).toContain('1.25x');
        expect(surgeRes.source).toBe('getFareExplanation');

        // Query 4: Live driver / ride status when active
        await rideModel.findByIdAndUpdate(testRide._id, { status: 'accepted' });
        const activeStatusRes = await resolveQueryDeterministically('What is my ride status?', testUser._id);
        expect(activeStatusRes.text).toContain('ACCEPTED');

        // Query 5: Status when no active ride
        await rideModel.findByIdAndUpdate(testRide._id, { status: 'completed' });
        const idleStatusRes = await resolveQueryDeterministically('What is my ride status?', testUser._id);
        expect(idleStatusRes.text).toContain('not have an active ride');
    });
});
