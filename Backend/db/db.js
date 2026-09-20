require('dotenv').config();
const mongoose = require('mongoose');

async function connectToDb() {
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    const primaryUri = process.env.DB_CONNECT;
    const fallbackUri = process.env.LOCAL_DB_CONNECT || 'mongodb://127.0.0.1:27017/drivo';

    try {
        if (primaryUri) {
            await mongoose.connect(primaryUri, {
                serverSelectionTimeoutMS: 5000,
                connectTimeoutMS: 5000,
            });
            console.log('✅ Connected to Primary MongoDB Atlas');
            return mongoose.connection;
        }
    } catch (err) {
        console.warn(`Primary DB connection failed (${err.message}). Attempting fallback to local MongoDB...`);
    }

    try {
        await mongoose.connect(fallbackUri, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000,
        });
        console.log(`✅ Connected to Fallback DB: ${fallbackUri}`);
        return mongoose.connection;
    } catch (fallbackErr) {
        console.error('❌ All DB connection attempts failed:', fallbackErr.message);
    }
}

module.exports = connectToDb;