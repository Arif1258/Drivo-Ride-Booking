/**
 * Context-Aware AI Customer Support Assistant
 * 
 * Provides policy-grounded, context-aware support by inspecting the user's
 * recent rides, payments, and account status before generating answers.
 * 
 * Employs a dual-engine architecture:
 * - Deterministic policy RAG & context extractor (guaranteed offline/fallback response)
 * - LLM synthesis if GEMINI_API_KEY is configured
 */

const axios = require('axios');
const rideModel = require('../../models/ride.model');
const paymentModel = require('../../models/payment.model');

// Official Drivo Policy Knowledge Base
const KNOWLEDGE_BASE = {
    cancellation: {
        keywords: ['cancel', 'cancellation', 'fee', 'charge for cancelling', 'cancelled'],
        summary: "Drivo allows free cancellation within 3 minutes of ride booking. If you cancel after 3 minutes and the captain has traveled toward your pickup, a standard ₹50 cancellation fee applies to compensate the driver's fuel and time.",
        rules: [
            "Free cancellation window: 3 minutes from booking time.",
            "Post-3 minute fee: ₹50 standard fee.",
            "Driver-initiated cancellation: No fee charged to rider.",
            "Waiver request: If the driver was stationary for > 5 minutes, fee is automatically refunded."
        ]
    },
    refunds: {
        keywords: ['refund', 'charged twice', 'deducted', 'money back', 'double charge', 'failed payment'],
        summary: "Refunds for failed, duplicate, or disputed transactions are processed automatically within 3 to 5 business days back to your original payment method (UPI, card, or wallet).",
        rules: [
            "Processing timeline: 3 - 5 business days.",
            "Failed transactions: Usually auto-reversed by your bank within 24 hours.",
            "Cash disputes: Credited directly to your Drivo Wallet upon verification."
        ]
    },
    fare_calculation: {
        keywords: ['fare', 'price', 'pricing', 'rate', 'cost', 'expensive', 'surge', 'how much'],
        summary: "Drivo fares are calculated transparently using: Base Fare + (Distance × per-km rate) + (Trip Duration × per-minute rate). During peak demand or adverse weather, dynamic surge pricing may apply.",
        rules: [
            "Car: Base ₹50 + ₹15/km + ₹3/min.",
            "Auto: Base ₹30 + ₹10/km + ₹2/min.",
            "Motorcycle: Base ₹20 + ₹8/km + ₹1.5/min.",
            "Tolls & Parking: Added directly to the final invoice."
        ]
    },
    lost_items: {
        keywords: ['lost', 'forgot', 'left my', 'item', 'phone', 'bag', 'wallet', 'belongings'],
        summary: "If you left an item in a Drivo vehicle, you can reach out to your captain directly through the trip receipt in Payment History for up to 24 hours. Alternatively, provide your Ride ID to support.",
        rules: [
            "Direct driver contact: Available for 24 hours post-trip.",
            "Driver return fee: A nominal fee of ₹100 may be paid to the driver for personal delivery of the item.",
            "Unclaimed items: Handed over to the nearest Drivo City Hub after 48 hours."
        ]
    },
    driver_conduct: {
        keywords: ['driver', 'captain', 'behavior', 'route', 'rude', 'safety', 'harassment', 'refused'],
        summary: "Safety and professional conduct are our highest priority. If a captain was unprofessional, refused air conditioning, took an unauthorized route, or violated safety guidelines, we will investigate and take immediate corrective action.",
        rules: [
            "24/7 Safety Helpline: Reach out immediately at 1800-DRIVO-SAFE.",
            "Rating feedback: Low ratings (< 3★) prompt an automated review by our quality team.",
            "Fair routing: In case of excessive deviations, your fare will be recalculated to the optimal route."
        ]
    }
};

/**
 * Retrieves user's recent contextual ride and payment data.
 */
async function getUserContext(userId) {
    if (!userId) return { recentRides: [], recentPayments: [] };

    try {
        const recentRides = await rideModel.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(3)
            .populate('captain', 'fullname vehicle');

        const recentPayments = await paymentModel.find({ userId })
            .sort({ createdAt: -1 })
            .limit(3);

        return { recentRides, recentPayments };
    } catch (err) {
        console.warn('Failed to load user context for support assistant:', err.message);
        return { recentRides: [], recentPayments: [] };
    }
}

/**
 * Matches user query to relevant policy domain.
 */
function findMatchingPolicy(query) {
    const q = query.toLowerCase();
    let bestMatch = null;
    let maxKeywordHits = 0;

    for (const [category, data] of Object.entries(KNOWLEDGE_BASE)) {
        let hits = 0;
        for (const kw of data.keywords) {
            if (q.includes(kw)) {
                hits++;
            }
        }
        if (hits > maxKeywordHits) {
            maxKeywordHits = hits;
            bestMatch = { category, ...data };
        }
    }

    return bestMatch;
}

/**
 * Deterministic Context-Aware Response Engine (Zero-failure fallback).
 */
function generateDeterministicAnswer(query, policy, userContext) {
    const { recentRides, recentPayments } = userContext;
    const lastRide = recentRides[0];
    const lastPayment = recentPayments[0];

    // If no specific policy match is detected and question is generic
    if (!policy) {
        return {
            text: "I want to make sure you get the exact help you need. I can assist you with:\n• Ride cancellation fees & policies\n• Payment and refund inquiries\n• Lost items in vehicles\n• Fare breakdowns and calculations\n• Driver safety and conduct\n\nIf your issue requires personalized agent review, please email support@drivo.com or call our 24/7 helpline at +91-1800-DRIVO.",
            confidence: 0.70,
            source: 'general_faq',
            suggestedActions: ['Cancellation Policy', 'Refund Status', 'Fare Calculation', 'Lost Item']
        };
    }

    let contextualDetail = '';

    // If asking about charges/cancellations and there is a recent ride
    if (policy.category === 'cancellation' || policy.category === 'refunds' || policy.category === 'fare_calculation') {
        if (lastRide) {
            const rideDate = new Date(lastRide.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            contextualDetail += `\n\n📋 **Your Most Recent Ride:**\n• Destination: ${lastRide.destination}\n• Date: ${rideDate}\n• Status: ${lastRide.status.toUpperCase()}\n• Amount: ₹${lastRide.fare}`;
        }
        if (lastPayment) {
            contextualDetail += `\n• Payment ID: ${lastPayment.paymentId} (${lastPayment.paymentStatus.toUpperCase()})`;
        }
    }

    if (policy.category === 'lost_items' && lastRide) {
        contextualDetail += `\n\n🚗 **Most Recent Trip Details:**\n• Vehicle: ${lastRide.captain?.vehicle?.color || ''} ${lastRide.captain?.vehicle?.vehicleType || 'Cab'} (${lastRide.captain?.vehicle?.plate || 'Plate registered'})\n• Captain: ${lastRide.captain?.fullname?.firstname || 'Assigned Driver'}\n• Ride ID: ${lastRide._id}`;
    }

    const fullResponse = `**Drivo ${policy.category.replace('_', ' ').toUpperCase()} INFO:**\n\n${policy.summary}\n\n**Key Guidelines:**\n${policy.rules.map(r => `• ${r}`).join('\n')}${contextualDetail}\n\n*If this does not resolve your concern, reply to connect with human support.*`;

    return {
        text: fullResponse,
        confidence: 0.94,
        source: policy.category,
        suggestedActions: ['View Trip History', 'Contact Human Agent', 'Report an Issue']
    };
}

/**
 * Main customer support entrypoint.
 * 
 * @param {string} query - User's question
 * @param {string} [userId] - Authenticated user ID for context
 * @returns {Object} Contextual answer with metadata
 */
const aiSupportService = require('../aiSupportService');

async function askSupportAssistant(query, userId = null) {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return {
            text: "Please enter a question so I can assist you with your ride, billing, or policies.",
            confidence: 1.0,
            source: 'validation'
        };
    }

    // 1. Check if user is asking specific policy question (cancellation, refund, lost item, etc.)
    const matchedPolicy = findMatchingPolicy(query);
    if (matchedPolicy) {
        const userContext = await getUserContext(userId);
        return generateDeterministicAnswer(query, matchedPolicy, userContext);
    }

    // 2. Check for general FAQ / out-of-scope question
    const q = query.toLowerCase();
    const isRideToolQuery = q.includes('driver') || q.includes('ride') || q.includes('eta') ||
                            q.includes('status') || q.includes('cancel') || q.includes('fare') ||
                            q.includes('history') || q.includes('cost') || q.includes('arrive') ||
                            q.includes('where') || q.includes('who') || q.includes('track');

    if (!isRideToolQuery) {
        return generateDeterministicAnswer(query, null, { recentRides: [], recentPayments: [] });
    }

    // 3. Real-time Zen AI Tool Calling
    const result = await aiSupportService.askZenSupport(query, userId);
    return {
        text: result.text,
        confidence: 0.98,
        source: result.source || 'zen_ai',
        cardType: result.cardType,
        cardData: result.cardData,
        suggestedActions: ['Where is my driver?', "What's my ETA?", 'Who is my driver?', 'Cancel ride']
    };
}

module.exports = {
    askSupportAssistant,
    findMatchingPolicy,
    KNOWLEDGE_BASE,
    getUserContext,
    ...aiSupportService
};

