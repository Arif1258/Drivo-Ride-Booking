/**
 * Assistant Routes
 * Exposes /api/assistant/chat
 */

const express = require('express');
const router = express.Router();
const assistantController = require('../controllers/assistant.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Chat endpoint supporting authenticated Rider, Captain, Admin, or Guest
router.post('/chat', (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    if (token) {
        return authMiddleware.authUserOrCaptain(req, res, next);
    }
    // Guest context (policies and general FAQ accessible without token)
    next();
}, assistantController.chat);

module.exports = router;
