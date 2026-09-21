const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const app = express();
const cookieParser = require('cookie-parser');
const connectToDb = require('./db/db');
const userRoutes = require('./routes/user.routes');
const captainRoutes = require('./routes/captain.routes');
const mapsRoutes = require('./routes/maps.routes');
const rideRoutes = require('./routes/ride.routes');
const paymentRoutes = require('./routes/payment.routes');
const aiRoutes = require('./routes/ai.routes');
const demandRoutes = require('./routes/demand.routes');
const { seedHistoricalRidesIfEmpty } = require('./services/demandPredictionService');

const mongoose = require('mongoose');

connectToDb().then(() => {
    seedHistoricalRidesIfEmpty();
}).catch(() => {});

app.use(compression());
app.use(cors({
    origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : '*',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Fail-fast DB connection middleware (prevents infinite buffering/loading in production)
app.use(async (req, res, next) => {
    if (req.path === '/' || req.method === 'OPTIONS' || process.env.NODE_ENV === 'test') return next();
    if (mongoose.connection.readyState !== 1) {
        try {
            await connectToDb();
        } catch (e) {
            console.error('Middleware connect error:', e.message);
        }
    }
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
            message: 'Database connection offline. In MongoDB Atlas, please add 0.0.0.0/0 to Network Access.'
        });
    }
    next();
});

const http = require('http');
const { initializeSocket, getIO } = require('./socket');
const server = http.createServer(app);
initializeSocket(server);

// Delegate socket.io HTTP polling/handshake requests to socket.io engine
app.use((req, res, next) => {
    if (req.url.startsWith('/socket.io')) {
        const io = getIO();
        if (io && io.engine) {
            return io.engine.handleRequest(req, res);
        }
    }
    next();
});

app.get('/', (req, res) => {
    res.send('Hello World');
});

// Primary & API Prefixed Routes
app.use('/users', userRoutes);
app.use('/api/users', userRoutes);
app.use('/captains', captainRoutes);
app.use('/api/captains', captainRoutes);
app.use('/maps', mapsRoutes);
app.use('/api/maps', mapsRoutes);
app.use('/rides', rideRoutes);
app.use('/api/rides', rideRoutes);
app.use('/payments', paymentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api', paymentRoutes);
app.use('/', paymentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/ai', aiRoutes);
app.use('/api/demand', demandRoutes);
app.use('/demand', demandRoutes);

module.exports = app;


