const captainModel = require('../models/captain.model');
const captainService = require('../services/captain.service');
const blackListTokenModel = require('../models/blacklistToken.model');
const aiRiskLogModel = require('../models/aiRiskLog.model');
const rideModel = require('../models/ride.model');
const { haversineKm } = require('../services/etaService');
const { broadcastToAdmin } = require('../socket');
const { validationResult } = require('express-validator');


module.exports.registerCaptain = async (req, res, next) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { fullname, email, password, vehicle } = req.body;

    const isCaptainAlreadyExist = await captainModel.findOne({ email });

    if (isCaptainAlreadyExist) {
        return res.status(400).json({ message: 'Captain already exist' });
    }

    const hashedPassword = await captainModel.hashPassword(password);

    const captain = await captainService.createCaptain({
        firstname: fullname.firstname,
        lastname: fullname.lastname,
        email,
        password: hashedPassword,
        color: vehicle.color,
        plate: vehicle.plate,
        capacity: vehicle.capacity,
        vehicleType: vehicle.vehicleType
    });

    const token = captain.generateAuthToken();

    res.status(201).json({ token, captain });

}

module.exports.loginCaptain = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const captain = await captainModel.findOne({ email }).select('+password');

    if (!captain) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await captain.comparePassword(password);

    if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = captain.generateAuthToken();

    res.cookie('token', token);

    res.status(200).json({ token, captain });
}

module.exports.getCaptainProfile = async (req, res, next) => {
    res.status(200).json({ captain: req.captain });
}

module.exports.logoutCaptain = async (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[ 1 ];

    await blackListTokenModel.create({ token });

    res.clearCookie('token');

    res.status(200).json({ message: 'Logout successfully' });
}

module.exports.getCaptainLocation = async (req, res, next) => {
    try {
        const captain = await captainModel.findById(req.params.id);
        if (!captain) {
            return res.status(404).json({ message: 'Captain not found' });
        }
        return res.status(200).json({ location: captain.location });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

module.exports.toggleStatus = async (req, res, next) => {
    try {
        const captain = await captainModel.findById(req.captain._id);
        if (!captain) {
            return res.status(404).json({ message: 'Captain not found' });
        }
        captain.status = captain.status === 'active' ? 'inactive' : 'active';
        await captain.save();
        return res.status(200).json({ status: captain.status, captain });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

module.exports.updateLocation = async (req, res, next) => {
    try {
        const { location } = req.body;
        if (!location || !location.ltd || !location.lng) {
            return res.status(400).json({ message: 'Invalid location data' });
        }

        const captain = await captainModel.findById(req.captain._id);
        if (!captain) {
            return res.status(404).json({ message: 'Captain not found' });
        }

        // GPS Teleportation & Impossible Speed Anomaly Check
        let isAnomalyDetected = false;
        let speedKmH = 0;
        let distanceKm = 0;
        const now = new Date();

        if (captain.location?.coordinates?.length === 2 && captain.lastLocationUpdate) {
            const prevLng = captain.location.coordinates[0];
            const prevLat = captain.location.coordinates[1];
            distanceKm = haversineKm(prevLat, prevLng, location.ltd, location.lng);
            const timeDeltaSec = (now.getTime() - new Date(captain.lastLocationUpdate).getTime()) / 1000;

            if (timeDeltaSec > 0 && timeDeltaSec <= 120) {
                speedKmH = parseFloat(((distanceKm / (timeDeltaSec / 3600))).toFixed(1));
                // Impossible speed threshold (> 150 km/h) or teleportation (> 500m in under 3s)
                if (speedKmH > 150 || (distanceKm > 0.5 && timeDeltaSec <= 3)) {
                    isAnomalyDetected = true;
                    console.warn(`🚨 GPS Anomaly Detected for Captain ${captain._id}: ${speedKmH} km/h over ${timeDeltaSec}s (${distanceKm.toFixed(2)} km)`);

                    try {
                        const activeRide = await rideModel.findOne({
                            captain: captain._id,
                            status: { $in: ['accepted', 'ongoing'] }
                        });

                        await aiRiskLogModel.create({
                            rideId: activeRide?._id || captain._id,
                            userId: activeRide?.user || captain._id,
                            captainId: captain._id,
                            riskScore: Math.min(100, Math.round(50 + (speedKmH > 150 ? (speedKmH - 150) * 0.4 : 40))),
                            riskLevel: 'HIGH',
                            reasons: [{
                                code: 'GPS_SPOOF_TELEPORTATION',
                                description: `Implied speed of ${speedKmH} km/h (${distanceKm.toFixed(2)} km in ${timeDeltaSec.toFixed(1)}s) exceeds physical driving constraints. Possible location mock/spoof.`,
                                severity: 'HIGH'
                            }],
                            featuresSnapshot: {
                                distanceMeters: Math.round(distanceKm * 1000),
                                durationSeconds: Math.round(timeDeltaSec),
                                averageSpeedKmH: speedKmH
                            }
                        });

                        broadcastToAdmin('high-risk-ride', {
                            type: 'GPS_SPOOF_TELEPORTATION',
                            captainId: captain._id,
                            speedKmH,
                            distanceKm: distanceKm.toFixed(2),
                            timeDeltaSec: timeDeltaSec.toFixed(1),
                            riskScore: 85
                        });
                    } catch (logErr) {
                        console.warn('Failed to log GPS anomaly:', logErr.message);
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

        return res.status(200).json({
            message: 'Location updated successfully',
            location: captain.location,
            anomalyDetected: isAnomalyDetected,
            speedKmH
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}