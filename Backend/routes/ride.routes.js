const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const rideController = require('../controllers/ride.controller');
const authMiddleware = require('../middlewares/auth.middleware');


router.post('/create',
    authMiddleware.authUser,
    body('pickup').isString().isLength({ min: 3 }).withMessage('Invalid pickup address'),
    body('destination').isString().isLength({ min: 3 }).withMessage('Invalid destination address'),
    body('vehicleType').isString().isIn([ 'auto', 'car', 'moto' ]).withMessage('Invalid vehicle type'),
    rideController.createRide
)

router.get('/get-fare',
    authMiddleware.authUser,
    query('pickup').isString().isLength({ min: 3 }).withMessage('Invalid pickup address'),
    query('destination').isString().isLength({ min: 3 }).withMessage('Invalid destination address'),
    rideController.getFare
)

router.post('/confirm',
    authMiddleware.authCaptain,
    body('rideId').isMongoId().withMessage('Invalid ride id'),
    rideController.confirmRide
)

router.post('/start-ride',
    authMiddleware.authCaptain,
    body('rideId').isMongoId().withMessage('Invalid ride id'),
    body('otp').isString().isLength({ min: 6, max: 6 }).withMessage('Invalid OTP'),
    rideController.startRide
)

router.post('/end-ride',
    authMiddleware.authCaptain,
    body('rideId').isMongoId().withMessage('Invalid ride id'),
    rideController.endRide
)

router.get('/active-ride',
    authMiddleware.authUser,
    rideController.getActiveRideByUser
)

router.get('/active-ride-captain',
    authMiddleware.authCaptain,
    rideController.getActiveRideByCaptain
)

router.get('/pending-rides',
    authMiddleware.authCaptain,
    rideController.getPendingRides
)

router.post('/cancel',
    authMiddleware.authUserOrCaptain,
    body('rideId').isMongoId().withMessage('Invalid ride id'),
    rideController.cancelRide
)

router.post('/rate',
    authMiddleware.authUser,
    body('rideId').isMongoId().withMessage('Invalid ride id'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    rideController.rateRide
)

router.get('/my-rides',
    authMiddleware.authUser,
    rideController.getUserRides
)

router.get('/captain-rides',
    authMiddleware.authCaptain,
    rideController.getCaptainRides
)

module.exports = router;