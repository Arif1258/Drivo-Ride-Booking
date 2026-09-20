const socketIo = require('socket.io');
const userModel = require('./models/user.model');
const captainModel = require('./models/captain.model');
const rideModel = require('./models/ride.model');
const etaService = require('./services/etaService');

let io;

function initializeSocket(server) {
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

            // Join a room named after the userId — this is the KEY fix.
            // Even if the socket reconnects and gets a new socketId,
            // re-joining the room ensures messages always reach the user.
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

            await captainModel.findByIdAndUpdate(userId, {
                location: {
                    type: 'Point',
                    coordinates: [location.lng, location.ltd] // [longitude, latitude]
                }
            });

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

module.exports = {
    initializeSocket,
    sendMessageToSocketId,
    sendMessageToUser,
    broadcastToAdmin,
    broadcastToCaptains,
    sendETAUpdate,
    sendRepositioningRecommendation
};