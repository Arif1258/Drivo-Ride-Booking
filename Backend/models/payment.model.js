const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    paymentId: {
        type: String,
        required: true,
        unique: true
    },
    rideId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ride',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    captainId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'captain',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'upi', 'card', 'netbanking', 'wallet'],
        required: true
    },
    transactionId: {
        type: String
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'processing', 'successful', 'failed', 'refunded'],
        default: 'pending'
    }
}, { timestamps: true });

module.exports = mongoose.model('payment', paymentSchema);
