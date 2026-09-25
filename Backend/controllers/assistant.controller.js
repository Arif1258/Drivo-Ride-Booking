/**
 * Assistant Controller
 * 
 * Exposes POST /api/assistant/chat
 * Strictly derives authenticated user/driver identity from verified JWT.
 */

const { processAssistantChat } = require('../services/ai/assistantOrchestrator');

module.exports.chat = async (req, res) => {
    try {
        const { message, query, history } = req.body;
        const textToProcess = message || query;

        if (!textToProcess || typeof textToProcess !== 'string' || !textToProcess.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Field "message" is required and cannot be empty.'
            });
        }

        // Derive authenticated user context strictly from verified token (never client-supplied parameters)
        const userId = req.user?._id ? req.user._id.toString() : null;
        const captainId = req.captain?._id ? req.captain._id.toString() : null;
        const isAdmin = req.user?.role === 'admin';
        const role = isAdmin ? 'admin' : (captainId ? 'captain' : (userId ? 'user' : 'guest'));

        const authContext = {
            userId,
            captainId,
            role,
            isAdmin
        };

        const result = await processAssistantChat(textToProcess, authContext, history || []);

        return res.status(200).json(result);
    } catch (err) {
        console.error('Assistant chat error:', err);
        return res.status(500).json({
            success: false,
            answer: "I couldn't process your request right now due to a temporary service disruption. Please try again shortly.",
            sources: [],
            toolCalls: [],
            metadata: {
                error: err.message
            }
        });
    }
};
