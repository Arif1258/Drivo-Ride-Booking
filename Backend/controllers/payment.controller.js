const paymentModel = require('../models/payment.model');
const rideModel = require('../models/ride.model');
const captainModel = require('../models/captain.model');
const crypto = require('crypto');
const { sendMessageToUser } = require('../socket');

module.exports.processPayment = async (req, res) => {
    const { rideId, paymentMethod } = req.body;

    try {
        const ride = await rideModel.findOne({ _id: rideId }).populate('user').populate('captain');
        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        // Only allow payments for rides in payment-pending status
        if (ride.status !== 'payment-pending') {
            return res.status(400).json({ message: 'Ride is not pending payment' });
        }

        const paymentId = 'PAY-' + crypto.randomBytes(8).toString('hex').toUpperCase();
        const transactionId = 'TXN-' + crypto.randomBytes(12).toString('hex').toUpperCase();

        // Check if a payment record already exists
        const existingPayment = await paymentModel.findOne({ rideId });
        if (existingPayment && existingPayment.paymentStatus === 'successful') {
            return res.status(400).json({ message: 'Payment already completed for this ride' });
        }

        const payment = await paymentModel.create({
            paymentId,
            rideId,
            userId: ride.user._id,
            captainId: ride.captain._id,
            amount: ride.fare,
            paymentMethod,
            transactionId,
            paymentStatus: 'successful' // Mocking successful payment processing
        });

        // Update ride status to completed
        ride.status = 'completed';
        await ride.save();

        // Notify captain in real-time
        sendMessageToUser(ride.captain._id, {
            event: 'payment-completed',
            data: {
                rideId,
                paymentId,
                amount: ride.fare,
                paymentMethod,
                paymentStatus: 'successful'
            }
        });

        return res.status(200).json(payment);
    } catch (err) {
        console.error('Payment processing error:', err);
        return res.status(500).json({ message: err.message });
    }
};

module.exports.getPaymentHistory = async (req, res) => {
    try {
        let query = {};
        if (req.user) {
            query.userId = req.user._id;
        } else if (req.captain) {
            query.captainId = req.captain._id;
        } else {
            return res.status(401).json({ message: 'Unauthorized access' });
        }

        const history = await paymentModel.find(query)
            .populate('rideId')
            .populate('userId')
            .populate('captainId')
            .sort({ createdAt: -1 });

        return res.status(200).json(history);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

module.exports.getStats = async (req, res) => {
    try {
        const totalPayments = await paymentModel.find({ paymentStatus: 'successful' });
        const totalRevenue = totalPayments.reduce((acc, curr) => acc + curr.amount, 0);

        const successfulCount = await paymentModel.countDocuments({ paymentStatus: 'successful' });
        const failedCount = await paymentModel.countDocuments({ paymentStatus: 'failed' });
        const activeRides = await rideModel.countDocuments({ status: { $in: ['accepted', 'ongoing', 'payment-pending'] } });

        // Generate daily trend metrics (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const dailyStats = await paymentModel.aggregate([
            {
                $match: {
                    paymentStatus: 'successful',
                    createdAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    revenue: { $sum: "$amount" },
                    trips: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        return res.status(200).json({
            totalRevenue,
            successfulCount,
            failedCount,
            activeRides,
            dailyStats
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};
