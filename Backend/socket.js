const socketIo = require('socket.io');
const userModel = require('./models/user.model');
const captainModel = require('./models/captain.model');
const rideModel = require('./models/ride.model');
const aiRiskLogModel = require('./models/aiRiskLog.model');
const etaService = require('./services/etaService');
const { haversineKm } = etaService;

let io;

function initializeSocket(server) {
    if (io) {
        return io;
    }
    io = socketIo(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        console.log(`Client connected: ${socket.id}`);

        socket.on('join', async (data) => {
            const { userId, userType } = data;
            console.log(`📝 JOIN: ${userType} ${userId} => socketId: ${socket.id}`);

            // Join a room named after the userId
            socket.join(userId);

            if (userType === 'user') {
                await userModel.findByIdAndUpdate(userId, { socketId: socket.id });
            } else if (userType === 'captain') {
                console.log(`Captain connected: socket.id = ${socket.id}, userId = ${userId}`);
                socket.join('captains');
                await captainModel.findByIdAndUpdate(userId, { socketId: socket.id });
            } else if (userType === 'admin') {
                console.log(`Admin joined socket room: socket.id = ${socket.id}`);
                socket.join('admin');
            }
        });

        socket.on('update-location-captain', async (data) => {
            const { userId, location } = data;

            if (!location || !location.ltd || !location.lng) {
                return socket.emit('error', { message: 'Invalid location data' });
            }

            try {
                const captain = await captainModel.findById(userId);
                if (captain) {
                    const now = new Date();
                    // Live GPS Jump & Speed Anomaly Detection
                    if (captain.location?.coordinates?.length === 2 && captain.lastLocationUpdate) {
                        const prevLng = captain.location.coordinates[0];
                        const prevLat = captain.location.coordinates[1];
                        const distanceKm = haversineKm(prevLat, prevLng, location.ltd, location.lng);
                        const timeDeltaSec = (now.getTime() - new Date(captain.lastLocationUpdate).getTime()) / 1000;

                        if (timeDeltaSec > 0 && timeDeltaSec <= 120) {
                            const speedKmH = parseFloat(((distanceKm / (timeDeltaSec / 3600))).toFixed(1));
                            if (speedKmH > 150 || (distanceKm > 0.5 && timeDeltaSec <= 3)) {
                                console.warn(`🚨 Real-time GPS Anomaly (Socket): Captain ${userId} Speed: ${speedKmH} km/h (${distanceKm.toFixed(2)} km in ${timeDeltaSec.toFixed(1)}s)`);

                                const activeRide = await rideModel.findOne({
                                    captain: userId,
                                    status: { $in: ['accepted', 'ongoing'] }
                                });

                                await aiRiskLogModel.create({
                                    rideId: activeRide?._id || userId,
                                    userId: activeRide?.user || userId,
                                    captainId: userId,
                                    riskScore: Math.min(100, Math.round(50 + (speedKmH > 150 ? (speedKmH - 150) * 0.4 : 40))),
                                    riskLevel: 'HIGH',
                                    reasons: [{
                                        code: 'GPS_SPOOF_TELEPORTATION',
                                        description: `Instant location jump detected: ${distanceKm.toFixed(2)} km in ${timeDeltaSec.toFixed(1)}s (${speedKmH} km/h). Potential spoofing.`,
                                        severity: 'HIGH'
                                    }],
                                    featuresSnapshot: {
                                        distanceMeters: Math.round(distanceKm * 1000),
                                        durationSeconds: Math.round(timeDeltaSec),
                                        averageSpeedKmH: speedKmH
                                    }
                                });

                                if (io) {
                                    io.to('admin').emit('high-risk-ride', {
                                        type: 'GPS_SPOOF_TELEPORTATION',
                                        captainId: userId,
                                        speedKmH,
                                        distanceKm: distanceKm.toFixed(2),
                                        timeDeltaSec: timeDeltaSec.toFixed(1),
                                        riskScore: 85
                                    });
                                }
                            }
                        }
                    }

                    captain.location = {
                        type: 'Point',
                        coordinates: [location.lng, location.ltd]
                    };
                    captain.lastLocationUpdate = now;
                    await captain.save();
                }
            } catch (captainErr) {
                console.warn('Socket captain location update notice:', captainErr.message);
            }

            // Find active ride for the captain and broadcast location to user
            try {
                const activeRide = await rideModel.findOne({
                    captain: userId,
                    status: { $in: ['accepted', 'ongoing', 'payment-pending'] }
                }).populate('captain');

                if (activeRide) {
                    const userIdStr = activeRide.user.toString();
                    io.to(userIdStr).emit('captain-location-updated', {
                        latitude: location.ltd,
                        longitude: location.lng
                    });

                    // Broadcast real-time ETA update
                    try {
                        const liveEta = await etaService.calculateRideETA(activeRide, location);
                        io.to(userIdStr).emit('eta-updated', liveEta);
                    } catch (etaErr) {
                        console.warn("Error calculating live socket ETA:", etaErr.message);
                    }
                }
            } catch (err) {
                console.error("Error broadcasting captain location:", err);
            }
        });

        socket.on('cancel-ride', async (data) => {
            const { rideId, reason, cancelledBy } = data;
            try {
                const ride = await rideModel.findById(rideId);
                if (ride && (ride.status === 'pending' || ride.status === 'accepted')) {
                    ride.status = 'cancelled';
                    ride.cancellationReason = reason || 'Cancelled via real-time event';
                    ride.cancelledBy = cancelledBy || 'user';
                    await ride.save();

                    if (ride.captain) {
                        io.to(ride.captain.toString()).emit('ride-cancelled', { rideId, reason, cancelledBy });
                    }
                    if (ride.user) {
                        io.to(ride.user.toString()).emit('ride-cancelled', { rideId, reason, cancelledBy });
                    }
                    io.to('admin').emit('ride-cancelled', { rideId, reason, cancelledBy });
                }
            } catch (cancelErr) {
                console.error("Error handling socket cancel-ride:", cancelErr);
            }
        });

        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    });
}

// Send a message to a specific socketId (legacy, can be unreliable)
const sendMessageToSocketId = (socketId, messageObject) => {
    console.log(`📤 Sending event '${messageObject.event}' to socketId: ${socketId}`);

    if (io) {
        io.to(socketId).emit(messageObject.event, messageObject.data);
    } else {
        console.log('Socket.io not initialized.');
    }
}

// Send a message to a user/captain by their MongoDB _id (reliable, uses rooms)
const sendMessageToUser = (userId, messageObject) => {
    const userIdStr = userId.toString();
    console.log(`📤 Sending event '${messageObject.event}' to userId room: ${userIdStr}`);

    if (io) {
        io.to(userIdStr).emit(messageObject.event, messageObject.data);
    } else {
        console.log('Socket.io not initialized.');
    }
}

// Broadcast event to all administrators
const broadcastToAdmin = (event, data) => {
    console.log(`🚨 Broadcasting '${event}' to admin room`);
    if (io) {
        io.to('admin').emit(event, data);
    }
}

// Broadcast event to all active captains (e.g. demand surges)
const broadcastToCaptains = (event, data) => {
    console.log(`📢 Broadcasting '${event}' to captains room`);
    if (io) {
        io.to('captains').emit(event, data);
    }
}

// Send live ETA update to rider
const sendETAUpdate = (userId, etaData) => {
    sendMessageToUser(userId, {
        event: 'eta-updated',
        data: etaData
    });
};

// Send repositioning recommendation to a captain
const sendRepositioningRecommendation = (captainId, recommendation) => {
    sendMessageToUser(captainId, {
        event: 'driver-reposition-recommendation',
        data: recommendation
    });
};

const getIO = () => io;

module.exports = {
    initializeSocket,
    getIO,
    sendMessageToSocketId,
    sendMessageToUser,
    broadcastToAdmin,
    broadcastToCaptains,
    sendETAUpdate,
    sendRepositioningRecommendation
};