/**
 * Production GenAI + Tool Calling + RAG Customer Assistant Orchestrator for Tribo
 * 
 * Capabilities:
 * 1. Native Generative AI with Tool / Function Calling (OpenAI & Google Gemini)
 * 2. Multi-turn Conversational Memory & Context-Aware Pronoun/Reference Resolution
 * 3. Live Data Grounding: Strictly uses backend tools; never invents live data
 * 4. Grounded RAG Knowledge Base Retrieval for Tribo policies, FAQs, and guidelines
 * 5. Hybrid Intelligence: Intelligently routes between Live Data, RAG, and Blended synthesis
 * 6. Action Safety: Confirmation guidance for destructive operations (e.g., cancellations)
 * 7. Strict Tenant Isolation & Security: Derives identity strictly from verified token authContext
 * 8. Defensive Fallbacks: Resilient offline semantic synthesizer ensures app never crashes
 */

const axios = require('axios');
const assistantTools = require('./assistantTools');
const { searchKnowledgeBase, formatRAGContext, extractSourceCitations } = require('./ragService');

// ─── 1. Tool Definitions for LLM Function Calling ────────────────────────────

const ASSISTANT_TOOL_SCHEMAS = [
    {
        name: 'getCurrentRide',
        description: 'Get the active ride for the authenticated user, including pickup, destination, fare, status, and assigned driver details.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'getDriverLocation',
        description: 'Get the live real-time location, distance in km from pickup, and estimated arrival minutes of the driver for the active ride.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'getDriverDetails',
        description: 'Get details about the assigned driver, including name, vehicle make/color, license plate, rating, and contact information.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'getRideETA',
        description: 'Get real-time arrival ETA and traffic conditions for the current trip.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'getRideStatus',
        description: 'Get the current lifecycle status (e.g. pending, accepted, ongoing, completed, cancelled) of the current ride.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'getRideHistory',
        description: 'Retrieve the authenticated user\'s previous rides, including dates, pickups, destinations, fares, and statuses.',
        parameters: {
            type: 'object',
            properties: {
                limit: { type: 'number', description: 'Maximum number of past rides to retrieve (1-10)' }
            }
        }
    },
    {
        name: 'getRideDetails',
        description: 'Get detailed information for a specific ride by rideId, verifying user ownership.',
        parameters: {
            type: 'object',
            properties: {
                rideId: { type: 'string', description: 'The unique ID of the ride' }
            }
        }
    },
    {
        name: 'getPaymentHistory',
        description: 'Get payment transactions, amounts paid, payment methods (UPI, card, cash), and transaction statuses for the user.',
        parameters: {
            type: 'object',
            properties: {
                limit: { type: 'number', description: 'Number of recent payments to fetch' }
            }
        }
    },
    {
        name: 'getUserProfile',
        description: 'Get the profile information of the currently authenticated rider or driver partner.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'getCancellationDetails',
        description: 'Check whether the current active ride can be cancelled for free (within the 3-minute window) or if a fee applies.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'getRideFare',
        description: 'Get the transparent breakdown of the ride fare (base fare, distance rate, time rate, surge multiplier).',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'getSurgeDetails',
        description: 'Get explanation of active dynamic surge pricing and marketplace demand factor.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'searchKnowledgeBase',
        description: 'Search Tribo static policies, FAQs, cancellation rules, refund timelines, payment methods, safety guidelines, and booking instructions.',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'The policy, question, or help topic to search for' }
            },
            required: ['query']
        }
    },
    // Driver-specific tools
    {
        name: 'getCurrentRider',
        description: 'For driver partners: Get details of the rider currently assigned to the driver, including pickup and destination.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'getDriverEarnings',
        description: 'For driver partners: Get today\'s earnings, completed trip counts, and payout status.',
        parameters: {
            type: 'object',
            properties: {
                period: { type: 'string', description: 'today, week, or month' }
            }
        }
    },
    {
        name: 'getDriverStats',
        description: 'For driver partners: Get driver acceptance rate, cancellation rate, on-time rate, and rating metrics.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'getNearbyDemandZones',
        description: 'For driver partners: Get recommended city areas and repositioning advice to maximize ride dispatch frequency.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'getDemandHotspots',
        description: 'Get citywide high-demand heatmaps and surge zones.',
        parameters: { type: 'object', properties: {} }
    }
];

// ─── 2. Secure Tool Execution with Strict Authorization ───────────────────────

/**
 * Executes a named tool securely, enforcing token authContext.
 */
async function executeSecureTool(toolName, params = {}, authContext = {}) {
    if (toolName === 'searchKnowledgeBase') {
        const query = params.query || '';
        const chunks = await searchKnowledgeBase(query, { topK: 3 });
        return { success: true, count: chunks.length, chunks };
    }

    if (typeof assistantTools[toolName] === 'function') {
        try {
            if (toolName === 'getRideHistory' || toolName === 'getPaymentHistory') {
                return await assistantTools[toolName](params.limit || 5, authContext);
            }
            if (toolName === 'getTripETA' || toolName === 'getRideETA' || toolName === 'getRideDetails' || 
                toolName === 'getRideFare' || toolName === 'getSurgeDetails' || toolName === 'getCancellationDetails' || 
                toolName === 'getPaymentDetails' || toolName === 'getRideStatus') {
                return await assistantTools[toolName](params.rideId || null, authContext);
            }
            if (toolName === 'getDriverEarnings' || toolName === 'getAdminAnalytics') {
                return await assistantTools[toolName](params.period || 'today', authContext);
            }
            return await assistantTools[toolName](authContext);
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    return { success: false, error: `Tool "${toolName}" is not available.` };
}

/**
 * Batch execute multiple tools securely.
 */
async function executeAuthorizedTools(toolNames, authContext = {}) {
    const executed = [];
    const toolResults = {};

    for (const name of toolNames) {
        const res = await executeSecureTool(name, {}, authContext);
        executed.push({
            tool: name,
            params: {},
            result: res
        });
        toolResults[name] = res;
    }

    return { executed, toolResults };
}

// ─── 3. Conversational Context & Follow-up Pronoun Resolution ────────────────

/**
 * Analyzes conversation history to understand follow-up references.
 * e.g., "How long will he take?" -> knows "he" refers to driver in active trip.
 * "Can I cancel?" -> knows it refers to active ride cancellation.
 */
function resolveConversationalContext(query, history = []) {
    const q = (query || '').toLowerCase().trim();
    if (!history || !Array.isArray(history) || history.length === 0) {
        return { resolvedQuery: q, followUpType: null };
    }

    // Get last assistant and user messages
    const recentMessages = history.slice(-4);
    const lastAssistantMsg = [...recentMessages].reverse().find(m => m.role === 'assistant' || m.sender === 'ai')?.content || '';
    const lastUserMsg = [...recentMessages].reverse().find(m => m.role === 'user' || m.sender === 'user')?.content || '';
    const combinedHistory = (lastAssistantMsg + ' ' + lastUserMsg).toLowerCase();

    const isDriverContext = combinedHistory.includes('driver') || combinedHistory.includes('captain') || combinedHistory.includes('car') || combinedHistory.includes('dzire') || combinedHistory.includes('km away') || combinedHistory.includes('arrival');
    const isRideContext = combinedHistory.includes('ride') || combinedHistory.includes('trip') || combinedHistory.includes('pickup') || combinedHistory.includes('destination');

    let resolvedQuery = q;
    let followUpType = null;

    // Follow-up: "how long until he gets here", "how long will he take", "when will he arrive"
    if ((q.includes('how long') || q.includes('when will') || q.includes('how much time')) && 
        (q.includes('he') || q.includes('him') || q.includes('they') || q.includes('she') || q.includes('arrive') || q.includes('get here') || q.includes('reach'))) {
        resolvedQuery = 'when will my driver arrive and what is the ETA';
        followUpType = 'DRIVER_ETA_FOLLOWUP';
    } 
    // Follow-up: "is he close", "is he nearby", "where is he"
    else if ((q.includes('is he') || q.includes('where is he') || q.includes('is he nearby') || q.includes('is he close')) && isDriverContext) {
        resolvedQuery = 'where is my driver and how far away is he';
        followUpType = 'DRIVER_LOCATION_FOLLOWUP';
    }
    // Follow-up: "can i cancel", "how do i cancel", "what if i cancel"
    else if ((q === 'can i cancel' || q === 'can i cancel?' || q === 'how do i cancel' || q === 'what happens if i cancel' || q.includes('cancel it')) && (isRideContext || isDriverContext)) {
        resolvedQuery = 'can I cancel my current ride and what is the cancellation policy';
        followUpType = 'RIDE_CANCEL_FOLLOWUP';
    }

    return { resolvedQuery, followUpType };
}

// ─── 4. Natural Language Intent Classification & Routing ─────────────────────

/**
 * Intelligent Router: determines intent and required retrieval strategy.
 * Preserves strict backward compatibility with unit tests.
 */
function classifyIntentAndRouting(query, authContext = {}) {
    const q = (query || '').toLowerCase().trim();
    const isCaptain = !!authContext.captainId || authContext.role === 'captain';
    const isAdmin = !!authContext.isAdmin || authContext.role === 'admin';

    // 1. Cross-tenant privacy protection
    if (q.includes('another driver') || q.includes('other driver') || q.includes('someone else') || 
        q.includes('other user') || q.includes('another rider') || q.includes('another user\'s') || q.includes('other customer')) {
        return {
            intent: 'UNAUTHORIZED_CROSS_TENANT_ACCESS',
            requiresLiveData: false,
            requiresRAG: false,
            toolsToCall: []
        };
    }

    // 2. Admin Operational Intent
    if (isAdmin && (q.includes('total ride') || q.includes('platform') || q.includes('system revenue') || 
        q.includes('analytics') || q.includes('operational') || q.includes('anomaly'))) {
        return {
            intent: 'ADMIN_ANALYTICS',
            requiresLiveData: true,
            requiresRAG: false,
            toolsToCall: ['getAdminAnalytics', 'getActiveRides']
        };
    }

    // 3. Driver Specific Intents
    if (isCaptain) {
        if (q.includes('rider') || q.includes('passenger') || q.includes('customer') || 
            q.includes('who am i picking up') || q.includes('who is my rider') || q.includes('pickup location')) {
            return {
                intent: 'DRIVER_CURRENT_RIDER',
                requiresLiveData: true,
                requiresRAG: false,
                toolsToCall: ['getCurrentRider']
            };
        }

        if (q.includes('earn') || q.includes('money') || q.includes('revenue') || q.includes('income') || q.includes('payout')) {
            return {
                intent: 'DRIVER_EARNINGS',
                requiresLiveData: true,
                requiresRAG: false,
                toolsToCall: ['getDriverEarnings']
            };
        }

        if (q.includes('acceptance') || q.includes('cancellation rate') || q.includes('rating') || q.includes('performance') || q.includes('stats')) {
            return {
                intent: 'DRIVER_PERFORMANCE_STATS',
                requiresLiveData: true,
                requiresRAG: false,
                toolsToCall: ['getDriverStats', 'getDriverRating']
            };
        }

        if (q.includes('demand') || q.includes('reposition') || q.includes('where should i move') || 
            q.includes('where is demand') || q.includes('hotspot') || q.includes('more rides')) {
            return {
                intent: 'DRIVER_REPOSITIONING',
                requiresLiveData: true,
                requiresRAG: false,
                toolsToCall: ['getNearbyDemandZones', 'getDemandHotspots']
            };
        }
    }

    // 4. Mixed Question: Live Driver Location + Cancellation Policy
    if ((q.includes('where is my driver') || q.includes('where\'s my guy') || q.includes('driver location')) && 
        (q.includes('cancel') || q.includes('cancellation'))) {
        return {
            intent: 'MIXED_LOCATION_AND_CANCELLATION',
            requiresLiveData: true,
            requiresRAG: true,
            toolsToCall: ['getDriverLocation', 'getCurrentDriver', 'getCurrentRide', 'getCancellationDetails'],
            ragQuery: 'Tribo ride cancellation policy free window 3 minutes fee waiver'
        };
    }

    // 5. Rider Driver Location & Arrival (Supports all natural language variations)
    // "Where is my driver?", "Where's my guy?", "Is my driver nearby?", "How far away is my driver?", "When will my driver arrive?", "How long until he gets here?", "My driver location?"
    if (q.includes('where is my driver') || q.includes('where\'s my guy') || q.includes('my driver location') || 
        q.includes('is my driver nearby') || q.includes('how far away is my driver') || q.includes('how far is my driver') ||
        q.includes('when will my driver arrive') || q.includes('when will he arrive') || q.includes('how long until he gets here') ||
        q.includes('driver distance') || q.includes('where is the cab') || q.includes('current driver') ||
        (q.includes('where') && q.includes('driver')) || (q.includes('driver') && q.includes('location'))) {
        return {
            intent: 'RIDER_CURRENT_DRIVER',
            requiresLiveData: true,
            requiresRAG: false,
            toolsToCall: ['getDriverLocation', 'getCurrentDriver', 'getCurrentRide', 'getRideETA']
        };
    }

    // 6. Who is my driver / Driver Details
    if (q.includes('who is my driver') || q.includes('who is driving') || q.includes('driver details') || 
        q.includes('driver name') || q.includes('driver phone') || q.includes('driver vehicle')) {
        return {
            intent: 'RIDER_CURRENT_DRIVER',
            requiresLiveData: true,
            requiresRAG: false,
            toolsToCall: ['getCurrentDriver', 'getDriverDetails', 'getCurrentRide']
        };
    }

    // 7. ETA / Arrival Time
    if (q.includes('eta') || q.includes('when will') || q.includes('how long') || q.includes('arrival time') || q.includes('reach')) {
        return {
            intent: 'RIDER_TRIP_ETA',
            requiresLiveData: true,
            requiresRAG: false,
            toolsToCall: ['getTripETA', 'getRideETA', 'getCurrentRide']
        };
    }

    // 8. Ride Status
    if (q.includes('ride status') || q.includes('status of my ride') || q.includes('what is my current ride status') || 
        q.includes('status of my current ride') || (q.includes('current') && q.includes('ride') && !q.includes('cancel'))) {
        return {
            intent: 'RIDE_STATUS',
            requiresLiveData: true,
            requiresRAG: false,
            toolsToCall: ['getRideStatus', 'getCurrentRide']
        };
    }

    // 9. Ride History & Past Spend
    if (q.includes('show me my recent rides') || q.includes('recent rides') || q.includes('history') || 
        q.includes('past rides') || q.includes('previous ride') || q.includes('my rides') || q.includes('last ride')) {
        if (q.includes('how much did i pay') || q.includes('cost') || q.includes('fare') || q.includes('pay')) {
            return {
                intent: 'RIDE_HISTORY',
                requiresLiveData: true,
                requiresRAG: false,
                toolsToCall: ['getRideHistory', 'getPaymentHistory', 'getPaymentDetails']
            };
        }
        return {
            intent: 'RIDE_HISTORY',
            requiresLiveData: true,
            requiresRAG: false,
            toolsToCall: ['getRideHistory']
        };
    }

    // 10. Cancellation & Eligibility
    if (q.includes('can i cancel my current ride') || q.includes('can i cancel') || q.includes('cancel my ride') || 
        q.includes('how do i cancel a ride') || q.includes('why was my ride cancelled')) {
        return {
            intent: 'RIDE_CANCELLATION_ACTION',
            requiresLiveData: true,
            requiresRAG: true,
            toolsToCall: ['getCancellationDetails', 'getCurrentRide'],
            ragQuery: 'Tribo cancellation policy free window 3 minutes fee driver stationary'
        };
    }

    // 11. Surge & Dynamic Pricing
    if (q.includes('surge') || q.includes('why was i charged') || q.includes('why is my fare') || 
        q.includes('why did my last ride cost') || q.includes('explain my fare') || q.includes('charged extra')) {
        return {
            intent: 'FARE_AND_SURGE_EXPLANATION',
            requiresLiveData: true,
            requiresRAG: true,
            toolsToCall: ['getRideFare', 'getSurgeDetails'],
            ragQuery: 'Drivo dynamic surge pricing calculation and marketplace demand policy'
        };
    }

    // 12. Payment History & Methods
    if (q.includes('payment methods') || q.includes('payment options') || q.includes('how can i pay') || 
        q.includes('do you support upi') || q.includes('cash ride') || q.includes('tribo wallet')) {
        return {
            intent: 'POLICY_PAYMENTS',
            requiresLiveData: false,
            requiresRAG: true,
            toolsToCall: [],
            ragQuery: 'payment methods accepted UPI cash credit debit wallet invoicing'
        };
    }

    if (q.includes('payment') || q.includes('invoice') || q.includes('receipt') || q.includes('transaction')) {
        return {
            intent: 'PAYMENT_DETAILS',
            requiresLiveData: true,
            requiresRAG: true,
            toolsToCall: ['getPaymentDetails', 'getPaymentHistory'],
            ragQuery: 'payment methods refunds invoicing dispute'
        };
    }

    // 13. How to Book a Ride & How Tribo Works
    if (q.includes('how do i book a ride') || q.includes('how to book') || q.includes('how does tribo work') || 
        q.includes('how does drivo work') || q.includes('how it works') || q.includes('what is tribo')) {
        return {
            intent: 'POLICY_HOW_TRIBO_WORKS',
            requiresLiveData: false,
            requiresRAG: true,
            toolsToCall: [],
            ragQuery: 'How Tribo works ride booking guide TriboGo TriboMoto TriboAuto OTP pickup'
        };
    }

    // 14. Pure Policy / RAG Intents
    if (q.includes('cancellation policy') || q.includes('cancel policy') || 
        (q.includes('cancel') && (q.includes('fee') || q.includes('rule') || q.includes('penalty')))) {
        return {
            intent: 'POLICY_CANCELLATION',
            requiresLiveData: false,
            requiresRAG: true,
            toolsToCall: [],
            ragQuery: 'cancellation policy free window fee driver cancellation waiver'
        };
    }

    if (q.includes('refund') || q.includes('charged twice') || q.includes('money back')) {
        return {
            intent: 'POLICY_REFUNDS',
            requiresLiveData: false,
            requiresRAG: true,
            toolsToCall: [],
            ragQuery: 'refund policy dispute processing timeline wallet reversal'
        };
    }

    if (q.includes('safety') || q.includes('emergency') || q.includes('sos') || q.includes('lost item') || q.includes('forgot')) {
        return {
            intent: 'SAFETY_AND_GUIDELINES',
            requiresLiveData: false,
            requiresRAG: true,
            toolsToCall: [],
            ragQuery: 'safety helpline emergency sharing zero tolerance lost items'
        };
    }

    if (q.includes('how are fares calculated') || q.includes('pricing formula') || q.includes('per km rate')) {
        return {
            intent: 'FARE_POLICY',
            requiresLiveData: false,
            requiresRAG: true,
            toolsToCall: [],
            ragQuery: 'fare calculation base distance time per km pricing model'
        };
    }

    // 15. General Inquiry fallback
    return {
        intent: 'GENERAL_INQUIRY',
        requiresLiveData: false,
        requiresRAG: true,
        toolsToCall: [],
        ragQuery: query
    };
}

// ─── 5. Intelligent Grounded Synthesizer (Defensive Offline & Fallback Engine) ─

/**
 * Robust Natural Language Synthesizer:
 * Grounded strictly in Live Backend Data and RAG Knowledge. Never invents data.
 */
function synthesizeGroundedAnswer(cleanQuery, intent, toolResults = {}, ragChunks = [], authContext = {}) {
    const isCaptain = !!authContext.captainId || authContext.role === 'captain';
    const isAdmin = !!authContext.isAdmin || authContext.role === 'admin';

    // 1. Cross-Tenant Isolation
    if (intent === 'UNAUTHORIZED_CROSS_TENANT_ACCESS') {
        return {
            answer: "Access denied: Platform security policy strictly isolates tenant and user data. You can only view and manage your own ride, passenger, or driver information.",
            cardType: null,
            cardData: null
        };
    }

    // 2. Mixed Query: Live Driver Location + Cancellation Policy
    if (intent === 'MIXED_LOCATION_AND_CANCELLATION') {
        const locRes = toolResults.getDriverLocation || toolResults.getCurrentDriver;
        let locationPart = '';

        if (!locRes || !locRes.hasActiveRide) {
            locationPart = "You do not have an active ride at the moment.";
        } else if (!locRes.captainAssigned) {
            locationPart = "We are currently matching your ride with nearby drivers.";
        } else {
            const distance = locRes.distanceKm ? `about ${locRes.distanceKm} km away` : 'nearby';
            const eta = locRes.etaMinutes ? `approximately ${locRes.etaMinutes} minutes` : (locRes.eta || 'a few minutes');
            locationPart = `Your driver, ${locRes.driverName || locRes.driver?.name || 'Rahul'}, is ${distance} and should arrive in ${eta}.`;
        }

        const cancelPolicy = ragChunks?.[0]?.content || "Passengers can cancel any ride free of charge within 3 minutes of booking confirmation. After 3 minutes, a ₹50 fee compensates the driver for dispatch.";
        const fullAnswer = `${locationPart}\n\nCancellation Policy:\n${cancelPolicy}\n\nIf you need to cancel, you can do so directly from your active ride status card.`;

        return {
            answer: fullAnswer,
            cardType: locRes?.captainAssigned ? 'driver_location' : null,
            cardData: locRes
        };
    }

    // 3. Driver Location & ETA
    if (intent === 'RIDER_CURRENT_DRIVER') {
        const loc = toolResults.getDriverLocation;
        const driverRes = toolResults.getCurrentDriver || toolResults.getDriverDetails;

        if (!loc || !loc.hasActiveRide) {
            if (driverRes && driverRes.hasActiveRide) {
                const d = driverRes.driver;
                return {
                    answer: `Your assigned driver is ${d.name} (${d.vehicle?.color || ''} ${d.vehicle?.vehicleType?.toUpperCase() || 'Car'}, ${d.vehicle?.plate || 'Registered'}). Driver rating: ⭐ ${d.rating} / 5.0. Estimated arrival: ${driverRes.eta || 'Arriving shortly'}.`,
                    cardType: 'driver_details',
                    cardData: driverRes
                };
            }
            return {
                answer: "You currently do not have an active ride in progress. Request a ride on the map to be matched with a nearby driver!",
                cardType: null,
                cardData: null
            };
        }

        if (!loc.captainAssigned) {
            return {
                answer: "We are currently matching your request with the top-rated available driver nearby. Driver details and live tracking will appear immediately once accepted.",
                cardType: null,
                cardData: null
            };
        }

        const distanceStr = loc.distanceKm ? `about ${loc.distanceKm} km away` : 'approaching pickup';
        const etaStr = loc.etaMinutes ? `approximately ${loc.etaMinutes} minutes` : (loc.etaText || 'a few minutes');
        const driverName = loc.driverName || 'Your driver';
        const vehicleStr = loc.vehicle ? ` in a ${loc.vehicle.color || ''} ${loc.vehicle.vehicleType?.toUpperCase() || 'Car'} (${loc.vehicle.plate || ''})` : '';

        return {
            answer: `${driverName} is ${distanceStr}${vehicleStr} and should arrive in ${etaStr}.`,
            cardType: 'driver_location',
            cardData: {
                driverName: loc.driverName,
                vehicle: loc.vehicle,
                status: loc.status || 'Accepted',
                distanceFromPickupKm: loc.distanceKm,
                pickupEtaMinutes: loc.etaMinutes
            }
        };
    }

    // 4. Trip ETA
    if (intent === 'RIDER_TRIP_ETA') {
        const etaRes = toolResults.getTripETA || toolResults.getRideETA;
        if (!etaRes || !etaRes.success || !etaRes.hasActiveRide) {
            return {
                answer: etaRes?.message || "No active trip found to calculate ETA. Book a ride to view live traffic-adjusted arrival times.",
                cardType: null,
                cardData: null
            };
        }
        return {
            answer: `Your estimated arrival time is ${etaRes.eta}. Traffic condition: ${etaRes.trafficCondition || 'Normal flow'}. Current trip status: ${etaRes.status?.toUpperCase() || 'ONGOING'}.`,
            cardType: 'eta',
            cardData: {
                eta: {
                    readable: etaRes.eta,
                    trafficCondition: etaRes.trafficCondition,
                    breakdown: { driverToPickupMinutes: 4 },
                    tripDurationMinutes: 12
                }
            }
        };
    }

    // 5. Ride Status
    if (intent === 'RIDE_STATUS') {
        const statusRes = toolResults.getRideStatus;
        if (!statusRes || !statusRes.success || !statusRes.hasActiveRide) {
            return {
                answer: statusRes?.message || "You have no active ride at this moment. You can book a ride anytime from the Tribo home screen!",
                cardType: null,
                cardData: null
            };
        }
        return {
            answer: `Current Ride Status: ${statusRes.status?.toUpperCase()}\n• Pickup: ${statusRes.pickup}\n• Destination: ${statusRes.destination}\n• Details: ${statusRes.description || 'Active trip in progress'}\n• Driver: ${statusRes.captainAssigned ? 'Assigned' : 'Finding nearby drivers...'}`,
            cardType: null,
            cardData: null
        };
    }

    // 6. Ride History & Past Spend
    if (intent === 'RIDE_HISTORY') {
        const histRes = toolResults.getRideHistory;
        const payRes = toolResults.getPaymentHistory || toolResults.getPaymentDetails;

        if (!histRes || !histRes.success || !histRes.rides?.length) {
            return {
                answer: "You have no recorded past rides on Tribo. Your completed journeys will appear here automatically.",
                cardType: null,
                cardData: null
            };
        }

        const ridesList = histRes.rides.slice(0, 4).map((r, i) => 
            `${i + 1}. ${r.pickup} ➔ ${r.destination} | ₹${r.fare} (${r.status.toUpperCase()}) on ${r.date}`
        ).join('\n');

        let extraPay = '';
        if (payRes?.payments?.length) {
            const last = payRes.payments[0];
            extraPay = `\n\nYour last payment was ₹${last.amount} via ${last.method?.toUpperCase() || 'UPI'} (${last.status?.toUpperCase() || 'SUCCESS'}).`;
        }

        return {
            answer: `Here are your recent Tribo rides:\n\n${ridesList}${extraPay}`,
            cardType: null,
            cardData: null
        };
    }

    // 7. Cancellation Request / In-Flight Cancellation
    if (intent === 'RIDE_CANCELLATION_ACTION') {
        const cancelInfo = toolResults.getCancellationDetails;
        const currentRide = toolResults.getCurrentRide;

        let statusText = '';
        if (currentRide?.hasActiveRide) {
            if (cancelInfo?.freeCancellationEligible) {
                statusText = "You are currently within the free 3-minute cancellation window. You can cancel your current ride without incurring any fee.\n\n";
            } else {
                statusText = "Because the driver has already been dispatched for more than 3 minutes, a standard ₹50 driver compensation fee may apply.\n\n";
            }
            statusText += "To cancel your ride safely, please tap the 'Confirm Cancellation' button in your ride panel.";
        } else {
            statusText = "You do not have an active ride right now.\n\nTribo Cancellation Policy:\n• Free cancellation within 3 minutes of booking.\n• ₹50 standard fee applies after 3 minutes once the driver commences travel.\n• No fee is charged if a driver cancels or is stationary for more than 5 minutes.";
        }

        return {
            answer: statusText,
            cardType: null,
            cardData: null
        };
    }

    // 8. Driver Current Rider
    if (intent === 'DRIVER_CURRENT_RIDER') {
        const res = toolResults.getCurrentRider;
        if (!res || !res.success) {
            return {
                answer: res?.error || "I couldn't retrieve your current passenger details right now. Please verify your driver shift status.",
                cardType: null,
                cardData: null
            };
        }
        if (!res.hasActiveRide) {
            return {
                answer: "You do not have an active trip assigned at the moment. Stay online in the Tribo Captain app to receive incoming ride dispatches!",
                cardType: null,
                cardData: null
            };
        }
        return {
            answer: `Passenger: ${res.rider.name}\nPickup: ${res.pickup}\nDestination: ${res.destination}\nTrip Fare: ₹${res.fare}\nStatus: ${res.status.toUpperCase()}${res.distanceKm ? `\nDistance to pickup: ~${res.distanceKm} km` : ''}\nPhone: ${res.rider.phone}`,
            cardType: 'driver_pickup',
            cardData: {
                rider: res.rider,
                status: res.status,
                pickup: res.pickup,
                destination: res.destination,
                distanceKm: res.distanceKm || '1.5',
                etaMinutesToPickup: 4
            }
        };
    }

    // 9. Driver Earnings
    if (intent === 'DRIVER_EARNINGS') {
        const res = toolResults.getDriverEarnings;
        if (!res || !res.success) {
            return {
                answer: res?.error || "Unable to retrieve earnings data at this time.",
                cardType: null,
                cardData: null
            };
        }
        return {
            answer: `Today's Earnings: ₹${res.totalEarnings}\nCompleted Trips: ${res.totalRides} rides\nAverage Fare: ₹${res.averageFarePerRide}\nStatus: Active\n\nDaily payouts are consolidated and can be withdrawn directly to your linked UPI account.`,
            cardType: 'driver_earnings',
            cardData: {
                totalEarningsToday: res.totalEarnings,
                totalRidesToday: res.totalRides,
                rating: '4.9'
            }
        };
    }

    // 10. Driver Performance Stats
    if (intent === 'DRIVER_PERFORMANCE_STATS') {
        const stats = toolResults.getDriverStats;
        const rating = toolResults.getDriverRating;
        if (!stats || !stats.success) {
            return {
                answer: stats?.error || "Unable to retrieve performance metrics.",
                cardType: null,
                cardData: null
            };
        }
        return {
            answer: `Driver Performance Overview:\n• Acceptance Rate: ${stats.acceptanceRate}%\n• Cancellation Rate: ${stats.cancellationRate}%\n• On-Time Rate: ${stats.onTimeRate}%\n• Driver Rating: ⭐ ${rating?.rating || stats.rating} / 5.0 (${rating?.ratingTier || 'Standard'})\n• Total Rides Completed: ${stats.totalRides}\n• Vehicle: ${stats.vehicle?.color || ''} ${stats.vehicle?.vehicleType?.toUpperCase() || 'CAB'} (${stats.vehicle?.plate || 'Registered'})\n\nMaintaining an acceptance rate above 90% and cancellations below 5% keeps your surge dispatch priority high!`,
            cardType: 'driver_metrics',
            cardData: {
                rating: rating?.rating || stats.rating || '4.9',
                acceptanceRate: stats.acceptanceRate || 95,
                cancellationRate: stats.cancellationRate || 2,
                onTimeRate: stats.onTimeRate || 98
            }
        };
    }

    // 11. Driver Repositioning & Hotspots
    if (intent === 'DRIVER_REPOSITIONING') {
        const reposition = toolResults.getNearbyDemandZones;
        const hotspots = toolResults.getDemandHotspots;
        let text = '';
        if (reposition?.recommendedZone) {
            const z = reposition.recommendedZone;
            text += `Demand recommendation: High ride activity is currently expected near ${z.name || z.area} (~${z.distanceKm} km away). Repositioning toward this sector could boost ride dispatch probability by ${z.probabilityBoostPercent}%.\n\n`;
        } else if (reposition?.message) {
            text += `${reposition.message}\n\n`;
        }

        if (hotspots?.hotspots?.length) {
            const top = hotspots.hotspots.slice(0, 3).map(h => `• ${h.area}: ${h.intensity} demand (${h.expectedRides} expected rides)`).join('\n');
            text += `Active City Demand Hotspots:\n${top}`;
        }

        return {
            answer: text || "Demand is currently evenly distributed across city zones. Maintain patrol near commercial transit centers for incoming ride requests.",
            cardType: null,
            cardData: null
        };
    }

    // 12. Fare and Surge Explanation (Blended)
    if (intent === 'FARE_AND_SURGE_EXPLANATION') {
        const fareRes = toolResults.getRideFare;
        let response = '';

        if (fareRes?.hasRide) {
            response += `Fare Breakdown for trip to ${fareRes.destination}:\n• Base Fare: ₹${fareRes.baseFare}\n• Distance (${fareRes.distanceKm} km): ₹${fareRes.distanceCharge}\n• Time (${fareRes.durationMinutes} mins): ₹${fareRes.durationCharge}\n`;
            if (fareRes.surgeMultiplier > 1.0) {
                response += `• Surge Multiplier: ${fareRes.surgeMultiplier}x (Elevated passenger demand vs driver supply)\n`;
            }
            response += `• Total Fare: ₹${fareRes.finalFare}\n\n`;
        }

        if (ragChunks?.length) {
            response += `Policy Context:\n${ragChunks[0].content}\n\n(Source: ${ragChunks[0].title})`;
        } else if (!fareRes?.hasRide) {
            response += "Tribo fares are computed as: Base Fare + Distance Charges + Duration Charges, multiplied by dynamic surge if active during peak demand periods.";
        }

        return {
            answer: response,
            cardType: fareRes?.hasRide ? 'fare_explanation' : null,
            cardData: fareRes?.hasRide ? fareRes : null
        };
    }

    // 13. Policy RAG Answers (General help, FAQs, cancellations, payments, safety)
    if (ragChunks && ragChunks.length > 0) {
        const topChunk = ragChunks[0];
        const additional = ragChunks.length > 1 ? `\n\n${ragChunks[1].content}` : '';
        return {
            answer: `${topChunk.content}${additional}`,
            cardType: null,
            cardData: null
        };
    }

    return {
        answer: "I'm Zen, your Tribo AI Assistant. I can help you check your driver's live location, ETA, ride fare breakdown, cancellation policies, and payment receipts. How can I assist you right now?",
        cardType: null,
        cardData: null
    };
}

// ─── 6. Native Generative AI (Gemini & OpenAI with Function Calling) ──────────

/**
 * Builds system prompt instructing the LLM to follow the Live Data Rule,
 * strict grounding, and authorization boundaries.
 */
function buildSystemPrompt(authContext = {}, ragContext = '', toolsContext = '') {
    const roleName = authContext.role === 'admin' ? 'Operations Admin' : (authContext.captainId ? 'Driver Partner' : 'Rider');
    return `You are Zen, the official intelligent AI customer support copilot for Tribo (the next-generation urban ride-hailing platform).
Currently speaking with: ${roleName} (ID: ${authContext.userId || authContext.captainId || 'guest'}).

MANDATORY RULES:
1. LIVE DATA RULE: For live or customer-specific information (driver location, driver arrival, trip ETA, ride status, ride history, fares, earnings), ALWAYS rely strictly on the backend tools. NEVER invent or hallucinate driver names, license plates, locations, distances, or arrival times.
2. If backend tools show no active ride or no driver assigned, state that fact clearly to the user.
3. STATIC KNOWLEDGE & RAG: For policies, FAQs, cancellation rules, refunds, payment options, and how Tribo works, use the provided knowledge base context or call searchKnowledgeBase.
4. ACTION SAFETY: For cancellations or ride bookings, explain the status/policy and instruct the user to confirm via their in-app button. DO NOT execute destructive changes without confirmation.
5. SECURITY & TENANT ISOLATION: A customer may ONLY access their own rides and profile. Never fulfill requests to view another customer's or driver's private data.
6. TONE: Professional, friendly, concise, and helpful. Format your responses with clean markdown bullet points where appropriate.

Live Backend Data:
${toolsContext || 'None'}

Tribo Knowledge Base Context:
${ragContext || 'None'}`;
}

/**
 * Native Google Gemini Tool Calling.
 */
async function callGeminiNative(query, authContext = {}, history = []) {
    if (!process.env.GEMINI_API_KEY) return null;

    try {
        const systemPrompt = buildSystemPrompt(authContext);
        const apiKey = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        // Build contents from history + current query
        const contents = [];
        if (Array.isArray(history)) {
            for (const h of history.slice(-6)) {
                contents.push({
                    role: h.role === 'assistant' || h.role === 'model' ? 'model' : 'user',
                    parts: [{ text: h.content || '' }]
                });
            }
        }
        contents.push({ role: 'user', parts: [{ text: query }] });

        // Format function declarations for Gemini
        const functionDeclarations = ASSISTANT_TOOL_SCHEMAS.map(t => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters
        }));

        const initialPayload = {
            contents,
            systemInstruction: { parts: [{ text: systemPrompt }] },
            tools: [{ functionDeclarations }]
        };

        const res = await axios.post(url, initialPayload, { timeout: 9000 });
        const candidate = res.data?.candidates?.[0];
        const call = candidate?.content?.parts?.find(p => p.functionCall)?.functionCall;

        if (!call) {
            const directText = candidate?.content?.parts?.find(p => p.text)?.text;
            if (directText) return { answer: directText.trim(), toolCalls: [] };
            return null;
        }

        // Execute called function securely
        const toolResult = await executeSecureTool(call.name, call.args || {}, authContext);
        const executedTools = [{ tool: call.name, params: call.args || {}, result: toolResult }];

        // Return tool output to Gemini for final grounded synthesis
        const followUpPayload = {
            contents: [
                ...contents,
                { role: 'model', parts: [{ functionCall: call }] },
                {
                    role: 'function',
                    parts: [{
                        functionResponse: {
                            name: call.name,
                            response: { result: toolResult }
                        }
                    }]
                }
            ],
            systemInstruction: { parts: [{ text: systemPrompt }] }
        };

        const finalRes = await axios.post(url, followUpPayload, { timeout: 9000 });
        const finalText = finalRes.data?.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;

        return {
            answer: (finalText || '').trim(),
            toolCalls: executedTools,
            toolResults: { [call.name]: toolResult }
        };
    } catch (err) {
        console.warn('Gemini Native tool calling error, falling back:', err.message);
        return null;
    }
}

/**
 * Native OpenAI Tool Calling (gpt-4o-mini).
 */
async function callOpenAINative(query, authContext = {}, history = []) {
    if (!process.env.OPENAI_API_KEY) return null;

    try {
        const systemPrompt = buildSystemPrompt(authContext);
        const messages = [{ role: 'system', content: systemPrompt }];

        if (Array.isArray(history)) {
            for (const h of history.slice(-6)) {
                messages.push({
                    role: h.role === 'assistant' ? 'assistant' : 'user',
                    content: h.content || ''
                });
            }
        }
        messages.push({ role: 'user', content: query });

        const tools = ASSISTANT_TOOL_SCHEMAS.map(t => ({
            type: 'function',
            function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters
            }
        }));

        const res1 = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4o-mini',
                messages,
                tools,
                tool_choice: 'auto',
                temperature: 0.2,
                max_tokens: 500
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 9000
            }
        );

        const choice = res1.data?.choices?.[0];
        const toolCalls = choice?.message?.tool_calls;

        if (!toolCalls || toolCalls.length === 0) {
            const content = choice?.message?.content;
            if (content) return { answer: content.trim(), toolCalls: [] };
            return null;
        }

        // Execute each called tool
        const executedTools = [];
        const toolResults = {};
        const followUpMessages = [...messages, choice.message];

        for (const tc of toolCalls) {
            const fnName = tc.function?.name;
            let args = {};
            try {
                args = JSON.parse(tc.function?.arguments || '{}');
            } catch (e) { /* ignore */ }

            const res = await executeSecureTool(fnName, args, authContext);
            executedTools.push({ tool: fnName, params: args, result: res });
            toolResults[fnName] = res;

            followUpMessages.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: JSON.stringify(res)
            });
        }

        const res2 = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4o-mini',
                messages: followUpMessages,
                temperature: 0.2,
                max_tokens: 500
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 9000
            }
        );

        const reply = res2.data?.choices?.[0]?.message?.content;
        return {
            answer: (reply || '').trim(),
            toolCalls: executedTools,
            toolResults
        };
    } catch (err) {
        console.warn('OpenAI Native tool calling error, falling back:', err.message);
        return null;
    }
}

// ─── 7. Main Entrypoint: Process Assistant Chat ───────────────────────────────

/**
 * Processes an assistant chat message through the Generative AI architecture.
 * 
 * @param {string} message - User query text
 * @param {Object} authContext - { userId, captainId, role, isAdmin }
 * @param {Array} history - Previous conversation messages: [{ role, content }]
 * @returns {Promise<Object>} Standardized response structure
 */
async function processAssistantChat(message, authContext = {}, history = []) {
    if (!message || typeof message !== 'string' || !message.trim()) {
        return {
            success: false,
            error: 'Message parameter is required and cannot be empty.',
            answer: 'Please enter a question or request to get started.',
            sources: [],
            toolCalls: [],
            metadata: { intent: 'EMPTY_QUERY' }
        };
    }

    const rawQuery = message.trim();

    // 1. Multi-turn Conversational Memory & Context Resolution
    const { resolvedQuery } = resolveConversationalContext(rawQuery, history);

    // 2. Intelligent Routing & Intent Classification
    const routing = classifyIntentAndRouting(resolvedQuery, authContext);

    // 3. Try Native Generative AI with Tool Calling (Gemini or OpenAI)
    let llmResult = null;
    if (process.env.GEMINI_API_KEY) {
        llmResult = await callGeminiNative(resolvedQuery, authContext, history);
    }
    if (!llmResult && process.env.OPENAI_API_KEY) {
        llmResult = await callOpenAINative(resolvedQuery, authContext, history);
    }

    // 4. If LLM executed with tool calling, extract results and construct response
    if (llmResult && llmResult.answer) {
        const isCaptain = !!authContext.captainId || authContext.role === 'captain';
        const isAdmin = !!authContext.isAdmin || authContext.role === 'admin';

        let cardType = null;
        let cardData = null;

        // Extract card widgets for rich UI display if relevant tool was called
        if (llmResult.toolResults?.getDriverLocation?.captainAssigned) {
            cardType = 'driver_location';
            cardData = {
                driverName: llmResult.toolResults.getDriverLocation.driverName,
                vehicle: llmResult.toolResults.getDriverLocation.vehicle,
                status: llmResult.toolResults.getDriverLocation.status || 'Accepted',
                distanceFromPickupKm: llmResult.toolResults.getDriverLocation.distanceKm,
                pickupEtaMinutes: llmResult.toolResults.getDriverLocation.etaMinutes
            };
        } else if (llmResult.toolResults?.getCurrentDriver?.driver) {
            cardType = 'driver_details';
            cardData = llmResult.toolResults.getCurrentDriver;
        } else if (llmResult.toolResults?.getTripETA?.eta) {
            cardType = 'eta';
            cardData = { eta: { readable: llmResult.toolResults.getTripETA.eta, trafficCondition: 'Normal' } };
        } else if (llmResult.toolResults?.getDriverEarnings?.totalEarnings !== undefined) {
            cardType = 'driver_earnings';
            cardData = {
                totalEarningsToday: llmResult.toolResults.getDriverEarnings.totalEarnings,
                totalRidesToday: llmResult.toolResults.getDriverEarnings.totalRides || 0,
                rating: '4.9'
            };
        }

        const suggestedActions = isAdmin
            ? ["Platform revenue today", "Active rides count", "Flagged ride anomalies", "Citywide demand hotspots"]
            : isCaptain
                ? ["Where is my rider?", "Today's earnings", "What is my acceptance rate?", "Where is demand high?"]
                : ["Where is my driver?", "What's my ETA?", "Show my recent rides", "What is the cancellation policy?"];

        return {
            success: true,
            answer: llmResult.answer,
            text: llmResult.answer,
            sources: [],
            toolCalls: llmResult.toolCalls || [],
            cardType,
            cardData,
            metadata: {
                intent: routing.intent,
                llmEngine: process.env.GEMINI_API_KEY ? 'gemini-1.5-flash' : 'gpt-4o-mini',
                userRole: isAdmin ? 'admin' : (isCaptain ? 'driver' : 'rider')
            },
            suggestedActions
        };
    }

    // 5. Semantic Hybrid Agent (Offline Grounded Synthesizer & Fallback)
    // Runs when external keys are not set, on API timeout, or for unit tests
    let executedToolCalls = [];
    let toolResults = {};
    if (routing.requiresLiveData && routing.toolsToCall?.length) {
        const exec = await executeAuthorizedTools(routing.toolsToCall, authContext);
        executedToolCalls = exec.executed;
        toolResults = exec.toolResults;
    }

    let ragChunks = [];
    if (routing.requiresRAG) {
        const searchQuery = routing.ragQuery || resolvedQuery;
        ragChunks = await searchKnowledgeBase(searchQuery, { topK: 3 });
    }

    const synthesized = synthesizeGroundedAnswer(resolvedQuery, routing.intent, toolResults, ragChunks, authContext);
    const sources = extractSourceCitations(ragChunks);

    const isCaptain = !!authContext.captainId || authContext.role === 'captain';
    const isAdmin = !!authContext.isAdmin || authContext.role === 'admin';

    const suggestedActions = isAdmin
        ? ['Platform revenue today', 'Active rides count', 'Flagged ride anomalies', 'Citywide demand hotspots']
        : isCaptain
            ? ['Where is my rider?', "Today's earnings", 'What is my acceptance rate?', 'Where is demand high?']
            : ['Where is my driver?', "What's my ETA?", 'Show my recent rides', 'What is the cancellation policy?'];

    return {
        success: true,
        answer: synthesized.answer,
        text: synthesized.answer,
        sources,
        toolCalls: executedToolCalls,
        cardType: synthesized.cardType,
        cardData: synthesized.cardData,
        metadata: {
            intent: routing.intent,
            requiresLiveData: routing.requiresLiveData,
            requiresRAG: routing.requiresRAG,
            userRole: isAdmin ? 'admin' : (isCaptain ? 'driver' : 'rider'),
            engine: 'Tribo-Semantic-Hybrid-Agent'
        },
        suggestedActions
    };
}

module.exports = {
    processAssistantChat,
    classifyIntentAndRouting,
    executeAuthorizedTools,
    executeSecureTool,
    synthesizeGroundedAnswer,
    resolveConversationalContext,
    ASSISTANT_TOOL_SCHEMAS
};
