const mongoose = require('mongoose');

async function connectToDb() {
    const primaryUri = process.env.DB_CONNECT;
    const fallbackUri = process.env.LOCAL_DB_CONNECT || 'mongodb://127.0.0.1:27017/drivo';

    try {
        if (primaryUri) {
            await mongoose.connect(primaryUri, {
                serverSelectionTimeoutMS: 5000,
            });
            console.log('Connected to Primary DB');
            return;
        }
    } catch (err) {
        console.warn(`Primary DB connection failed (${err.message}). Attempting fallback to local MongoDB...`);
    }

    try {
        await mongoose.connect(fallbackUri, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log(`Connected to Fallback DB: ${fallbackUri}`);
    } catch (fallbackErr) {
        console.error('All DB connection attempts failed:', fallbackErr.message);
    }
}

module.exports = connectToDb;