const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');

// Demand prediction endpoints
router.get('/prediction', aiController.getDemandPrediction);
router.get('/zones', aiController.getAllDemandZones);

module.exports = router;
