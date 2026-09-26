const {
    processAssistantChat,
    classifyIntentAndRouting,
    executeSecureTool,
    resolveConversationalContext
} = require('../services/ai/assistantOrchestrator');
const assistantTools = require('../services/ai/assistantTools');

describe('Drivo AI Customer Assistant - Comprehensive Specification Tests', () => {
    const riderAuth = {
        userId: '60d5ec49f1b2c82b8c847c22',
        role: 'user'
    };

    // ─── 1. Natural Language Booking Flow (Two-Step Confirmation) ───────────────
    describe('Natural-Language Ride Booking Flow', () => {
        test('identifies pickup and destination and asks for explicit confirmation before booking', async () => {
            const query = 'Book a ride from Salt Lake to Park Street.';
            const res = await processAssistantChat(query, riderAuth);

            expect(res.success).toBe(true);
            expect(res.metadata.intent).toBe('RIDE_BOOKING_PREPARE');
            expect(res.answer).toContain("You're booking a Drivo ride from Salt Lake to Park Street");
            expect(res.answer).toContain('Would you like me to confirm the booking?');
            expect(res.cardType).toBe('booking_confirmation');
            expect(res.cardData).toBeDefined();
            expect(res.cardData.pickup).toBe('Salt Lake');
            expect(res.cardData.destination).toBe('Park Street');
        });

        test('prompts for missing pickup when user requests "I need a ride to the airport."', async () => {
            const query = 'I need a ride to the airport.';
            const res = await processAssistantChat(query, riderAuth);

            expect(res.success).toBe(true);
            expect(res.metadata.intent).toBe('RIDE_BOOKING_MISSING_PICKUP');
            expect(res.answer.toLowerCase()).toContain('pickup location');
        });

        test('executes booking only after explicit confirmation in second turn', async () => {
            const history = [
                { role: 'user', content: 'Book a ride from Salt Lake to Park Street.' },
                { role: 'assistant', content: "You're booking a Drivo ride from Salt Lake to Park Street. Estimated fare: ₹250 (Drivo Go). Would you like me to confirm the booking?" }
            ];

            const res = await processAssistantChat('Yes, confirm', riderAuth, history);
            expect(res.success).toBe(true);
            expect(res.metadata.intent).toBe('CONFIRM_BOOKING');
            // The tool call was attempted
            expect(res.toolCalls.length).toBeGreaterThan(0);
            expect(res.toolCalls[0].tool).toBe('bookRide');
            expect(res.toolCalls[0].params.confirmed).toBe(true);
        });

        test('cancels booking request when user declines confirmation', async () => {
            const history = [
                { role: 'user', content: 'Book a ride from Salt Lake to Park Street.' },
                { role: 'assistant', content: "You're booking a Drivo ride from Salt Lake to Park Street. Estimated fare: ₹250 (Drivo Go). Would you like me to confirm the booking?" }
            ];

            const res = await processAssistantChat("No, don't book", riderAuth, history);
            expect(res.success).toBe(true);
            expect(res.metadata.intent).toBe('DECLINE_BOOKING');
            expect(res.answer.toLowerCase()).toContain('cancelled this booking request');
        });
    });

    // ─── 2. Cancellation Flow (Two-Step Safety Architecture) ───────────────────
    describe('Cancellation Safety Flow', () => {
        test('"Cancel my current ride" checks active ride and prompts for confirmation', async () => {
            const query = 'Cancel my current ride.';
            const res = await processAssistantChat(query, riderAuth);

            expect(res.success).toBe(true);
            expect(res.metadata.intent).toBe('RIDE_CANCELLATION_CONFIRM');
            // User either gets cancellation confirmation prompt or polite notice if no active ride
            expect(res.answer.length).toBeGreaterThan(10);
        });

        test('executes cancelRide tool when user confirms cancellation', async () => {
            const history = [
                { role: 'user', content: 'Cancel my current ride.' },
                { role: 'assistant', content: "You're about to cancel your active Drivo ride from Salt Lake to Park Street. Are you sure you want to cancel this ride? Please confirm to proceed." }
            ];

            const res = await processAssistantChat('Yes, cancel', riderAuth, history);
            expect(res.success).toBe(true);
            expect(res.metadata.intent).toBe('CONFIRM_CANCEL_EXECUTE');
            expect(res.toolCalls[0].tool).toBe('cancelRide');
            expect(res.toolCalls[0].params.confirmed).toBe(true);
        });

        test('cancelRide tool requires explicit confirmation flag', async () => {
            const result = await assistantTools.cancelRide({ confirmed: false }, riderAuth);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Confirmation required');
        });
    });

    // ─── 3. Ride Options & Fare Estimates ──────────────────────────────────────
    describe('Ride Options and Estimates', () => {
        test('answers "What are my available ride options?" with vehicle options', async () => {
            const query = 'What are my available ride options?';
            const res = await processAssistantChat(query, riderAuth);

            expect(res.success).toBe(true);
            expect(res.metadata.intent).toBe('SEARCH_RIDE_OPTIONS');
            expect(res.cardType).toBe('ride_options');
            expect(res.answer).toContain('Drivo Go');
            expect(res.answer).toContain('Drivo Moto');
            expect(res.answer).toContain('Drivo Auto');
        });

        test('searchRideOptions tool returns structured Drivo vehicle tiers', async () => {
            const options = await assistantTools.searchRideOptions({}, riderAuth);
            expect(options.success).toBe(true);
            expect(options.options.length).toBe(3);
            expect(options.options[0].name).toBe('Drivo Go');
        });
    });

    // ─── 4. Support and Destination Updates ────────────────────────────────────
    describe('Support and In-Ride Updates', () => {
        test('answers "I want to contact support." with Drivo 24x7 support card', async () => {
            const query = 'I want to contact support.';
            const res = await processAssistantChat(query, riderAuth);

            expect(res.success).toBe(true);
            expect(res.metadata.intent).toBe('CONTACT_SUPPORT');
            expect(res.cardType).toBe('contact_support');
            expect(res.answer).toContain('1800-DRIVO-SAFE');
            expect(res.answer).toContain('support@drivo.com');
        });

        test('routes "Change my destination to Howrah Station" to updateDestination tool', async () => {
            const query = 'Change my destination to Howrah Station.';
            const routing = classifyIntentAndRouting(query, riderAuth);

            expect(routing.intent).toBe('UPDATE_DESTINATION');
            expect(routing.toolsToCall[0].name).toBe('updateDestination');
            expect(routing.toolsToCall[0].params.newDestination).toBe('Howrah Station');
        });
    });

    // ─── 5. Driver Tracking and Ride Status ────────────────────────────────────
    describe('Driver Tracking and Status', () => {
        test('handles "Where is my driver?" gracefully', async () => {
            const res = await processAssistantChat('Where is my driver?', riderAuth);
            expect(res.success).toBe(true);
            expect(res.metadata.intent).toBe('RIDER_CURRENT_DRIVER');
            expect(res.answer.toLowerCase()).toContain('do not have an active ride');
        });

        test('handles "What\'s the status of my ride?"', async () => {
            const res = await processAssistantChat("What's the status of my ride?", riderAuth);
            expect(res.success).toBe(true);
            expect(res.metadata.intent).toBe('RIDE_STATUS');
        });

        test('handles "Show my recent rides."', async () => {
            const res = await processAssistantChat('Show my recent rides.', riderAuth);
            expect(res.success).toBe(true);
            expect(res.metadata.intent).toBe('RIDE_HISTORY');
        });

        test('handles "How much was my last ride?"', async () => {
            const res = await processAssistantChat('How much was my last ride?', riderAuth);
            expect(res.success).toBe(true);
            expect(res.metadata.intent).toBe('RIDE_HISTORY');
        });
    });

    // ─── 6. Security and Authentication Boundaries ─────────────────────────────
    describe('Security and Authorization Enforcement', () => {
        test('rejects cross-tenant data access requests', async () => {
            const res = await processAssistantChat("Show me another customer's rides", riderAuth);
            expect(res.success).toBe(true);
            expect(res.answer.toLowerCase()).toContain('access denied');
            expect(res.metadata.intent).toBe('UNAUTHORIZED_CROSS_TENANT_ACCESS');
        });

        test('all assistant tools enforce valid authentication context', async () => {
            const unauthContext = { userId: null };
            const bookRes = await assistantTools.bookRide({}, unauthContext);
            expect(bookRes.success).toBe(false);
            expect(bookRes.error).toContain('Authentication required');

            const cancelRes = await assistantTools.cancelRide({}, unauthContext);
            expect(cancelRes.success).toBe(false);
            expect(cancelRes.error).toContain('Authentication required');
        });
    });
});
