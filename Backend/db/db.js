require('dotenv').config();
const mongoose = require('mongoose');

let connectionPromise = null;

async function connectToDb() {
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    if (mongoose.connection.readyState === 2 && connectionPromise) {
        try {
            return await connectionPromise;
        } catch (e) {
            connectionPromise = null;
        }
    }

    connectionPromise = null;

    const primaryUri = process.env.DB_CONNECT;
    const fallbackUri = process.env.LOCAL_DB_CONNECT || 'mongodb://127.0.0.1:27017/drivo';

    connectionPromise = (async () => {
        try {
            if (primaryUri) {
                const conn = await mongoose.connect(primaryUri, {
                    serverSelectionTimeoutMS: 8000,
                    connectTimeoutMS: 8000,
                    bufferCommands: true
                });
                console.log('✅ Connected to Primary MongoDB Atlas');
                return conn;
            }
        } catch (err) {
            console.warn(`Primary DB connection failed (${err.message}).`);
        }

        if (!process.env.VERCEL) {
            try {
                const fallbackConn = await mongoose.connect(fallbackUri, {
                    serverSelectionTimeoutMS: 8000,
                    connectTimeoutMS: 8000,
                    bufferCommands: true
                });
                console.log(`✅ Connected to Fallback DB: ${fallbackUri}`);
                return fallbackConn;
            } catch (fallbackErr) {
                console.error('❌ All DB connection attempts failed:', fallbackErr.message);
            }
        }
    })();

    try {
        const result = await connectionPromise;
        return result;
    } finally {
        if (mongoose.connection.readyState !== 1) {
            connectionPromise = null;
        }
    }
}

module.exports = connectToDb;