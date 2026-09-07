const mongoose = require('mongoose');

const aiRiskLogSchema = new mongoose.Schema({
    rideId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ride',
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
        index: true
    },
    captainId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'captain'
    },
    riskScore: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    riskLevel: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH'],
        required: true,
        index: true
    },
    reasons: [{
        code: String,
        description: String,
        severity: String
    }],
    featuresSnapshot: {
        distanceMeters: Number,
        durationSeconds: Number,
        averageSpeedKmH: Number,
        userCancellationRate: Number,
        captainCancellationRate: Number,
        requestVelocitySec: Number,
        paymentFailures: Number
    },
    status: {
        type: String,
        enum: ['pending_review', 'reviewed', 'cleared', 'escalated'],
        default: 'pending_review',
        index: true
    },
    reviewedBy: {
        type: String
    },
    reviewNotes: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model('aiRiskLog', aiRiskLogSchema);
