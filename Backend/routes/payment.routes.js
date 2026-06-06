const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const paymentController = require('../controllers/payment.controller');

router.post('/process', authMiddleware.authUser, paymentController.processPayment);
router.get('/user-history', authMiddleware.authUser, paymentController.getPaymentHistory);
router.get('/captain-history', authMiddleware.authCaptain, paymentController.getPaymentHistory);
router.get('/stats', paymentController.getStats);

module.exports = router;
