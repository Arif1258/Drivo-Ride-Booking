const mongoose = require('mongoose');


const rideSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    captain: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'captain',
    },
    pickup: {
        type: String,
        required: true,
    },
    destination: {
        type: String,
        required: true,
    },
    fare: {
        type: Number,
        required: true,
    },

    status: {
        type: String,
        enum: [ 'pending', 'accepted', 'ongoing', 'payment-pending', 'completed', 'cancelled' ],
        default: 'pending',
    },

    duration: {
        type: Number,
    }, // in seconds

    distance: {
        type: Number,
    }, // in meters

    paymentID: {
        type: String,
    },
    orderId: {
        type: String,
    },
    signature: {
        type: String,
    },

    otp: {
        type: String,
        select: false,
        required: true,
    },

    // AI/ML Enhanced Fields
    riskScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    riskLevel: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH'],
        default: 'LOW'
    },
    riskReasons: {
        type: [String],
        default: []
    },
    aiEstimatedDuration: {
        type: Number // in seconds
    },
    aiMatchScore: {
        type: Number
    },
    originCoordinates: {
        ltd: Number,
        lng: Number
    },
    destinationCoordinates: {
        ltd: Number,
        lng: Number
    },
    startedAt: {
        type: Date
    },
    completedAt: {
        type: Date
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    feedback: {
        type: String
    },
    surgeMultiplier: {
        type: Number,
        default: 1.0
    },
    surgeReason: {
        type: String
    },
    cancellationReason: {
        type: String
    },
    cancelledBy: {
        type: String,
        enum: ['user', 'captain', 'system']
    },
    matchFactors: {
        proximityScore: Number,
        etaScore: Number,
        ratingScore: Number,
        acceptanceScore: Number,
        reliabilityScore: Number,
        vehicleScore: Number,
        reason: String
    },
    baseFare: {
        type: Number,
        default: 50
    },
    distanceFare: {
        type: Number,
        default: 0
    },
    timeFare: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

rideSchema.index({ user: 1, status: 1 });
rideSchema.index({ captain: 1, status: 1 });
rideSchema.index({ status: 1, createdAt: -1 });
rideSchema.index({ "originCoordinates.ltd": 1, "originCoordinates.lng": 1 });

module.exports = mongoose.model('ride', rideSchema);