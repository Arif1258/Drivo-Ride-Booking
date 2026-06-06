const socketIo = require('socket.io');
const userModel = require('./models/user.model');
const captainModel = require('./models/captain.model');
const rideModel = require('./models/ride.model');

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
                await captainModel.findByIdAndUpdate(userId, { socketId: socket.id });
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
                });

                if (activeRide) {
                    const userIdStr = activeRide.user.toString();
                    io.to(userIdStr).emit('captain-location-updated', {
                        latitude: location.ltd,
                        longitude: location.lng
                    });
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

module.exports = { initializeSocket, sendMessageToSocketId, sendMessageToUser };