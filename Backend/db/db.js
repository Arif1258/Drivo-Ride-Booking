require('dotenv').config();
const mongoose = require('mongoose');

let cachedConnection = null;

async function connectToDb() {
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    if (cachedConnection && mongoose.connection.readyState === 1) {
        return cachedConnection;
    }

    const primaryUri = process.env.DB_CONNECT;
    const fallbackUri = process.env.LOCAL_DB_CONNECT || 'mongodb://127.0.0.1:27017/drivo';

    try {
        if (primaryUri) {
            const conn = await mongoose.connect(primaryUri, {
                serverSelectionTimeoutMS: 5000,
                connectTimeoutMS: 5000,
                bufferCommands: true
            });
            console.log('✅ Connected to Primary MongoDB Atlas');
            cachedConnection = conn;
            return conn;
        }
    } catch (err) {
        console.warn(`Primary DB connection failed (${err.message}).`);
    }

    if (!process.env.VERCEL) {
        try {
            const fallbackConn = await mongoose.connect(fallbackUri, {
                serverSelectionTimeoutMS: 5000,
                connectTimeoutMS: 5000,
                bufferCommands: true
            });
            console.log(`✅ Connected to Fallback DB: ${fallbackUri}`);
            cachedConnection = fallbackConn;
            return fallbackConn;
        } catch (fallbackErr) {
            console.error('❌ All DB connection attempts failed:', fallbackErr.message);
        }
    }
}

module.exports = connectToDb;