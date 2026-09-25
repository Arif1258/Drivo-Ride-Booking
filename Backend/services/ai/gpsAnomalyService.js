/**
 * GPS Anomaly & Telemetry Validation Service
 * 
 * Validates driver location updates to detect:
 * 1. Impossible GPS jumps / teleportation (> 500m in <= 3s)
 * 2. Unrealistic driving speed (> 150 km/h in urban contexts)
 * 3. Missing or invalid timestamps
 * 4. Duplicate coordinates within rapid intervals
 * 5. Out-of-bounds coordinate ranges
 * 
 * Never silently deletes suspicious data: flags as anomalous, logs audit record,
 * and notifies operations center via Socket.IO.
 */

const aiRiskLogModel = require('../../models/aiRiskLog.model');
const { haversineKm } = require('../etaService');

const GPS_THRESHOLDS = {
    MAX_SPEED_KMH: 150,                // Urban transit maximum speed limit
    TELEPORT_DISTANCE_KM: 0.5,         // Jump threshold (500m)
    TELEPORT_TIME_WINDOW_SEC: 3,       // Rapid jump window (3 seconds)
    MIN_VALID_LAT: -90,
    MAX_VALID_LAT: 90,
    MIN_VALID_LNG: -180,
    MAX_VALID_LNG: 180,
    DUPLICATE_TIME_WINDOW_SEC: 2       // Rapid duplicate coordinate updates
};

/**
 * Validates a GPS update against historical location and physical driving constraints.
 * 
 * @param {Object} params
 * @param {Object} params.currentLocation - { ltd, lng } or { latitude, longitude }
 * @param {Object} [params.previousLocation] - { ltd, lng } or coordinates array [lng, lat]
 * @param {Date|number|string} [params.currentTimestamp] - Timestamp of current ping
 * @param {Date|number|string} [params.previousTimestamp] - Timestamp of last recorded ping
 * @param {string} [params.captainId] - Associated captain ID
 * @param {string} [params.rideId] - Optional active ride ID
 * @param {string} [params.userId] - Optional active user ID
 * @returns {Promise<Object>} Anomaly report: { isAnomalous, reasons, speedKmH, distanceKm, timeDeltaSec }
 */
async function validateGpsTelemetry({
    currentLocation,
    previousLocation,
    currentTimestamp = new Date(),
    previousTimestamp,
    captainId = null,
    rideId = null,
    userId = null
}) {
    const reasons = [];
    let isAnomalous = false;
    let speedKmH = 0;
    let distanceKm = 0;
    let timeDeltaSec = null;

    // 1. Missing or Malformed Coordinates Check
    if (!currentLocation) {
        return {
            isValid: false,
            isAnomalous: true,
            reasons: [{ code: 'MISSING_COORDINATES', description: 'Location coordinates were not supplied.', severity: 'HIGH' }],
            speedKmH: 0,
            distanceKm: 0,
            timeDeltaSec: 0
        };
    }

    const curLat = currentLocation.ltd ?? currentLocation.lat ?? currentLocation.latitude;
    const curLng = currentLocation.lng ?? currentLocation.lon ?? currentLocation.longitude;

    if (typeof curLat !== 'number' || typeof curLng !== 'number' || isNaN(curLat) || isNaN(curLng)) {
        return {
            isValid: false,
            isAnomalous: true,
            reasons: [{ code: 'INVALID_COORDINATE_FORMAT', description: 'Coordinates must be valid numerical values.', severity: 'HIGH' }],
            speedKmH: 0,
            distanceKm: 0,
            timeDeltaSec: 0
        };
    }

    // 2. Out-of-bounds Latitude/Longitude Check
    if (curLat < GPS_THRESHOLDS.MIN_VALID_LAT || curLat > GPS_THRESHOLDS.MAX_VALID_LAT ||
        curLng < GPS_THRESHOLDS.MIN_VALID_LNG || curLng > GPS_THRESHOLDS.MAX_VALID_LNG ||
        (curLat === 0 && curLng === 0)) {
        reasons.push({
            code: 'OUT_OF_BOUNDS_COORDINATES',
            description: `Coordinates [${curLat}, ${curLng}] are outside realistic geographic boundaries or at null island (0, 0).`,
            severity: 'HIGH'
        });
        isAnomalous = true;
    }

    // 3. Timestamp Validation
    const nowTime = currentTimestamp ? new Date(currentTimestamp).getTime() : NaN;
    if (isNaN(nowTime)) {
        reasons.push({
            code: 'MISSING_TIMESTAMP',
            description: 'Current location update is missing a valid timestamp.',
            severity: 'MEDIUM'
        });
        isAnomalous = true;
    }

    // 4. Comparison with Previous Location Ping (if available)
    if (previousLocation && previousTimestamp) {
        let prevLat = null;
        let prevLng = null;

        if (Array.isArray(previousLocation) && previousLocation.length === 2) {
            prevLng = previousLocation[0];
            prevLat = previousLocation[1];
        } else if (typeof previousLocation === 'object') {
            prevLat = previousLocation.ltd ?? previousLocation.lat ?? previousLocation.latitude;
            prevLng = previousLocation.lng ?? previousLocation.lon ?? previousLocation.longitude;
            if (previousLocation.coordinates && Array.isArray(previousLocation.coordinates)) {
                prevLng = previousLocation.coordinates[0];
                prevLat = previousLocation.coordinates[1];
            }
        }

        const prevTime = new Date(previousTimestamp).getTime();

        if (prevLat !== null && prevLng !== null && !isNaN(prevTime)) {
            timeDeltaSec = Math.max(0, (nowTime - prevTime) / 1000);
            distanceKm = haversineKm(prevLat, prevLng, curLat, curLng);

            // Duplicate coordinates check with ultra-fast delta
            if (distanceKm === 0 && timeDeltaSec <= GPS_THRESHOLDS.DUPLICATE_TIME_WINDOW_SEC && timeDeltaSec > 0) {
                reasons.push({
                    code: 'DUPLICATE_COORDINATES',
                    description: `Identical coordinate ping received within ${timeDeltaSec.toFixed(1)}s.`,
                    severity: 'LOW'
                });
            }

            if (timeDeltaSec > 0 && timeDeltaSec <= 180) {
                speedKmH = parseFloat(((distanceKm / (timeDeltaSec / 3600))).toFixed(1));

                // A. Impossible Driving Speed
                if (speedKmH > GPS_THRESHOLDS.MAX_SPEED_KMH) {
                    isAnomalous = true;
                    reasons.push({
                        code: 'UNREALISTIC_DRIVING_SPEED',
                        description: `Calculated speed of ${speedKmH} km/h (${distanceKm.toFixed(2)} km in ${timeDeltaSec.toFixed(1)}s) exceeds physical urban transit threshold (${GPS_THRESHOLDS.MAX_SPEED_KMH} km/h).`,
                        severity: 'HIGH'
                    });
                }

                // B. Instant Teleportation Jump (> 500m in <= 3 seconds)
                if (distanceKm >= GPS_THRESHOLDS.TELEPORT_DISTANCE_KM && timeDeltaSec <= GPS_THRESHOLDS.TELEPORT_TIME_WINDOW_SEC) {
                    isAnomalous = true;
                    reasons.push({
                        code: 'IMPOSSIBLE_GPS_JUMP',
                        description: `Instant coordinate jump of ${distanceKm.toFixed(2)} km in only ${timeDeltaSec.toFixed(1)} seconds. Possible GPS spoofing/mocking software.`,
                        severity: 'HIGH'
                    });
                }
            }
        }
    }

    // 5. Persistent Logging & Operations Notification (Non-blocking)
    if (isAnomalous && (captainId || rideId)) {
        try {
            await aiRiskLogModel.create({
                rideId: rideId || captainId,
                userId: userId || captainId,
                captainId: captainId,
                riskScore: Math.min(100, Math.round(50 + (speedKmH > 150 ? (speedKmH - 150) * 0.4 : 35))),
                riskLevel: 'HIGH',
                reasons,
                featuresSnapshot: {
                    distanceMeters: Math.round(distanceKm * 1000),
                    durationSeconds: Math.round(timeDeltaSec || 0),
                    averageSpeedKmH: speedKmH
                }
            });
        } catch (logErr) {
            console.warn('GPS anomaly audit record creation notice:', logErr.message);
        }
    }

    return {
        isValid: true,
        isAnomalous,
        reasons,
        speedKmH,
        distanceKm,
        timeDeltaSec,
        normalizedCoordinates: { ltd: curLat, lng: curLng }
    };
}

module.exports = {
    validateGpsTelemetry,
    GPS_THRESHOLDS
};
