/**
 * AI Routes
 * Exposes endpoints for matching, demand forecasting, repositioning, ETA, fraud detection, support, and insights.
 */

const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Public or rider/captain accessible
router.post('/driver-match', aiController.matchDrivers);
router.get('/demand-prediction', aiController.getDemandPrediction);
router.get('/demand-zones', aiController.getAllDemandZones);
router.post('/predict-eta', aiController.predictETA);
router.post('/evaluate-risk', aiController.evaluateRisk);
router.post('/support-chat', (req, res, next) => {
    // Optional auth: if token is present, decode user, otherwise proceed
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    if (token) {
        return authMiddleware.authUser(req, res, next);
    }
    next();
}, aiController.supportChat);

// Captain-specific AI routes
router.get('/driver-reposition', authMiddleware.authCaptain, aiController.getDriverRepositioning);
router.get('/driver-insights', (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    if (token) {
        return authMiddleware.authCaptain(req, res, next);
    }
    next();
}, aiController.getDriverInsights);

// Admin dashboard routes
router.get('/admin-dashboard', (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    if (token) {
        return authMiddleware.authUser(req, res, next);
    }
    next();
}, aiController.getAdminAIDashboard);

module.exports = router;
