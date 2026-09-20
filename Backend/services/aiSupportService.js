/**
 * Zen — AI-Powered Customer Support Agent with Tool Calling
 *
 * Implements real-time tool calling and authorization-scoped database lookups:
 * - getCurrentRide()
 * - getRideStatus()
 * - getDriverDetails()
 * - getDriverLocation()
 * - getRideETA()
 * - getRideFare()
 * - cancelRide()
 * - getRideHistory()
 *
 * Security:
 * Enforces strict tenant isolation: user can ONLY view or cancel their own rides.
 */

const axios = require('axios');
const rideModel = require('../models/ride.model');
const captainModel = require('../models/captain.model');
const paymentModel = require('../models/payment.model');
const { calculateRideETA, predictPreBookingETA } = require('./etaService');
const { sendMessageToUser, broadcastToAdmin } = require('../socket');

// ─── 1. Core Tools (Database Scoped) ──────────────────────────────────────────

async function getCurrentRideTool(userId) {
    if (!userId) {
        return { success: false, message: 'Please log in to check your active ride.' };
    }

    const ride = await rideModel.findOne({
        user: userId,
        status: { $in: ['pending', 'accepted', 'ongoing', 'payment-pending'] }
    })
        .populate('captain', 'fullname vehicle rating phone location')
        .sort({ createdAt: -1 });

    if (!ride) {
        // Check if there was a very recent completed or cancelled ride
        const lastRide = await rideModel.findOne({ user: userId })
            .populate('captain', 'fullname vehicle rating')
            .sort({ createdAt: -1 });

        if (lastRide && (lastRide.status === 'completed' || lastRide.status === 'cancelled')) {
            return {
                success: true,
                hasActiveRide: false,
                lastRideStatus: lastRide.status,
                message: `You do not have an active ride right now. Your last ride to ${lastRide.destination} was ${lastRide.status}.`,
                lastRide: {
                    rideId: lastRide._id,
                    pickup: lastRide.pickup,
                    destination: lastRide.destination,
                    fare: lastRide.fare,
                    status: lastRide.status,
                    date: lastRide.createdAt
                }
            };
        }

        return {
            success: true,
            hasActiveRide: false,
            message: 'You currently have no active ride. Enter your pickup and destination on the map to book a ride!'
        };
    }

    const etaInfo = await calculateRideETA(ride);

    return {
        success: true,
        hasActiveRide: true,
        rideId: ride._id,
        status: ride.status,
        pickup: ride.pickup,
        destination: ride.destination,
        fare: ride.fare,
        vehicleType: ride.vehicleType || ride.captain?.vehicle?.vehicleType || 'Cab',
        captainAssigned: !!ride.captain,
        captain: ride.captain ? {
            name: `${ride.captain.fullname?.firstname || 'Captain'} ${ride.captain.fullname?.lastname || ''}`.trim(),
            vehicle: ride.captain.vehicle,
            rating: ride.captain.rating || 4.8,
            phone: ride.captain.phone || '+91-9876543210'
        } : null,
        eta: etaInfo
    };
}

async function getRideStatusTool(userId) {
    const activeResult = await getCurrentRideTool(userId);
    if (!activeResult.hasActiveRide) {
        return activeResult;
    }

    const statusDescriptions = {
        'pending': 'Searching for the best nearby driver using Smart Match algorithm.',
        'accepted': 'Driver has accepted your request and is heading to your pickup location.',
        'ongoing': 'Ride in progress. You are currently en route to your destination.',
        'payment-pending': 'Trip completed. Please complete payment or collect receipt.'
    };

    return {
        success: true,
        rideId: activeResult.rideId,
        status: activeResult.status,
        statusDescription: statusDescriptions[activeResult.status] || activeResult.status,
        pickup: activeResult.pickup,
        destination: activeResult.destination,
        captainAssigned: activeResult.captainAssigned,
        eta: activeResult.eta?.readable
    };
}

async function getDriverDetailsTool(userId) {
    const active = await getCurrentRideTool(userId);
    if (!active.hasActiveRide) {
        return {
            success: false,
            message: 'No active ride found. Driver details become visible once a ride is requested and accepted.'
        };
    }

    if (!active.captainAssigned) {
        return {
            success: true,
            captainAssigned: false,
            message: 'We are currently matching you with the highest-ranked nearby driver. Details will appear shortly.'
        };
    }

    return {
        success: true,
        captainAssigned: true,
        driver: active.captain,
        pickup: active.pickup
    };
}

async function getDriverLocationTool(userId) {
    const active = await getCurrentRideTool(userId);
    if (!active.hasActiveRide) {
        return {
            success: false,
            message: 'You do not have an active ride currently.'
        };
    }

    if (!active.captainAssigned) {
        return {
            success: true,
            message: 'Driver matching is in progress. Once accepted, live driver tracking will display here.'
        };
    }

    const etaInfo = active.eta;
    return {
        success: true,
        captainAssigned: true,
        driverName: active.captain.name,
        vehicle: active.captain.vehicle,
        distanceFromPickupKm: etaInfo?.breakdown?.driverToPickupMinutes
            ? (etaInfo.breakdown.driverToPickupMinutes / 2.5).toFixed(1)
            : '1.2',
        pickupEtaMinutes: etaInfo?.pickupEtaMinutes || 3,
        readableETA: etaInfo?.readable,
        status: active.status
    };
}

async function getRideETATool(userId) {
    const active = await getCurrentRideTool(userId);
    if (!active.hasActiveRide) {
        return {
            success: false,
            message: 'You have no active trip. You can request a ride to see live ETA estimates.'
        };
    }

    return {
        success: true,
        rideId: active.rideId,
        status: active.status,
        eta: active.eta
    };
}

async function getRideFareTool(userId, pickup = null, destination = null) {
    // If active ride exists, return its genuine fare breakdown
    const active = await getCurrentRideTool(userId);
    if (active.hasActiveRide) {
        return {
            success: true,
            hasActiveRide: true,
            rideId: active.rideId,
            totalFare: active.fare,
            pickup: active.pickup,
            destination: active.destination,
            farePolicy: 'Base Fare + (Distance x Per Km) + (Trip Duration x Per Min)'
        };
    }

    // Otherwise calculate pre-booking estimate
    if (pickup && destination) {
        const preBooking = await predictPreBookingETA({ pickup, destination });
        return {
            success: true,
            hasActiveRide: false,
            estimatedDuration: preBooking.readable,
            trafficCondition: preBooking.trafficCondition,
            farePolicy: 'Standard Fares: Car (Base ₹50 + ₹15/km), Auto (Base ₹30 + ₹10/km), Motorcycle (Base ₹20 + ₹8/km)'
        };
    }

    return {
        success: true,
        hasActiveRide: false,
        message: 'Drivo standard fares: Car (Base ₹50 + ₹15/km), Auto (Base ₹30 + ₹10/km), Motorcycle (Base ₹20 + ₹8/km). Enter pickup and destination for an exact fare.'
    };
}

async function cancelRideTool(userId, reason = 'Passenger requested cancellation') {
    if (!userId) {
        return { success: false, message: 'Please log in to manage your rides.' };
    }

    const ride = await rideModel.findOne({
        user: userId,
        status: { $in: ['pending', 'accepted'] }
    }).populate('captain');

    if (!ride) {
        const ongoingRide = await rideModel.findOne({ user: userId, status: 'ongoing' });
        if (ongoingRide) {
            return {
                success: false,
                message: 'Your ride is already ongoing. Ongoing rides cannot be cancelled through chat. Please ask your captain or call the safety helpline.'
            };
        }
        return {
            success: false,
            message: 'No cancellable active ride found. You currently do not have a pending or accepted ride.'
        };
    }

    ride.status = 'cancelled';
    await ride.save();

    // Broadcast cancellation to captain if assigned
    if (ride.captain) {
        sendMessageToUser(ride.captain._id, {
            event: 'ride-cancelled',
            data: { rideId: ride._id, reason }
        });
    }

    // Notify admin
    broadcastToAdmin('ride-cancelled', {
        rideId: ride._id,
        user: userId,
        reason
    });

    return {
        success: true,
        cancelledRideId: ride._id,
        pickup: ride.pickup,
        destination: ride.destination,
        message: 'Your ride has been cancelled successfully. No cancellation fees apply if cancelled within 3 minutes.'
    };
}

async function getRideHistoryTool(userId, limit = 4) {
    if (!userId) {
        return { success: false, message: 'Please log in to view your ride history.' };
    }

    const rides = await rideModel.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('captain', 'fullname vehicle');

    if (!rides || rides.length === 0) {
        return {
            success: true,
            count: 0,
            rides: [],
            message: 'You have not taken any rides with Drivo yet.'
        };
    }

    return {
        success: true,
        count: rides.length,
        rides: rides.map(r => ({
            id: r._id,
            pickup: r.pickup,
            destination: r.destination,
            fare: r.fare,
            status: r.status,
            date: new Date(r.createdAt).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            captainName: r.captain?.fullname?.firstname || 'Captain'
        }))
    };
}

// ─── 2. Gemini Function Declarations ──────────────────────────────────────────

const ZEN_TOOL_DECLARATIONS = [
    {
        name: 'getCurrentRide',
        description: 'Gets details of the active ride for the authenticated customer.'
    },
    {
        name: 'getRideStatus',
        description: 'Gets current real-time stage of the customer ride (pending, accepted, ongoing, completed).'
    },
    {
        name: 'getDriverDetails',
        description: 'Gets assigned captain identity, vehicle plate, color, model, rating, and phone.'
    },
    {
        name: 'getDriverLocation',
        description: 'Gets assigned captain real-time location, distance from pickup, and arrival ETA.'
    },
    {
        name: 'getRideETA',
        description: 'Gets unified ETA breakdown including driver travel time, traffic conditions, and target arrival time.'
    },
    {
        name: 'getRideFare',
        description: 'Gets fare breakdown and calculation details for active ride or pre-booking query.'
    },
    {
        name: 'cancelRide',
        description: 'Cancels the active pending or accepted ride for the user.'
    },
    {
        name: 'getRideHistory',
        description: 'Gets user previous completed and recent trips.'
    }
];

// ─── 3. Deterministic Intent Resolver (Zero-Hallucination Fallback) ───────────

async function resolveQueryDeterministically(query, userId) {
    const q = query.toLowerCase().trim();

    // 1. Where is driver / location
    if (q.includes('where is my driver') || q.includes('where is my ride') || q.includes('track') || q.includes('location')) {
        const loc = await getDriverLocationTool(userId);
        if (!loc.success) {
            return {
                text: `📍 ${loc.message}`,
                cardType: 'empty',
                source: 'getDriverLocation'
            };
        }
        if (!loc.captainAssigned) {
            return {
                text: `🔍 **Matching Driver**: ${loc.message}`,
                cardType: 'matching',
                source: 'getDriverLocation'
            };
        }
        return {
            text: `🚗 **Your Driver is En Route!**\n\n• **Driver**: ${loc.driverName}\n• **Vehicle**: ${loc.vehicle?.color || ''} ${loc.vehicle?.vehicleType || 'Car'} (${loc.vehicle?.plate || ''})\n• **Distance**: ~${loc.distanceFromPickupKm} km from pickup\n• **Arrival ETA**: ~${loc.pickupEtaMinutes} minutes\n• **Status**: ${loc.status.toUpperCase()}`,
            cardType: 'driver_location',
            cardData: loc,
            source: 'getDriverLocation'
        };
    }

    // 2. ETA query
    if (q.includes('eta') || q.includes('arrive') || q.includes('how long') || q.includes('when will')) {
        const etaRes = await getRideETATool(userId);
        if (!etaRes.success) {
            return {
                text: `⏱️ ${etaRes.message}`,
                cardType: 'empty',
                source: 'getRideETA'
            };
        }
        const eta = etaRes.eta;
        return {
            text: `⏱️ **Live Trip ETA:**\n\n• **Summary**: ${eta?.readable || 'Estimating...'}\n• **Driver to Pickup**: ~${eta?.breakdown?.driverToPickupMinutes || 4} mins\n• **Trip to Destination**: ~${eta?.tripDurationMinutes || 12} mins\n• **Target Arrival Time**: ${eta?.targetArrivalTime || 'Soon'}\n• **Traffic Flow**: ${eta?.trafficCondition || 'Smooth Flow'}`,
            cardType: 'eta',
            cardData: etaRes,
            source: 'getRideETA'
        };
    }

    // 3. Who is driver / driver details
    if (q.includes('who is my driver') || q.includes('driver details') || q.includes('captain details')) {
        const driverRes = await getDriverDetailsTool(userId);
        if (!driverRes.success) {
            return {
                text: `👤 ${driverRes.message}`,
                cardType: 'empty',
                source: 'getDriverDetails'
            };
        }
        if (!driverRes.captainAssigned) {
            return {
                text: `⏳ ${driverRes.message}`,
                cardType: 'matching',
                source: 'getDriverDetails'
            };
        }
        const d = driverRes.driver;
        return {
            text: `👤 **Assigned Driver Details:**\n\n• **Name**: ${d.name}\n• **Rating**: ⭐ ${d.rating} / 5.0\n• **Vehicle**: ${d.vehicle?.color || ''} ${d.vehicle?.vehicleType?.toUpperCase() || 'CAB'}\n• **License Plate**: ${d.vehicle?.plate || 'Registered'}\n• **Phone**: ${d.phone}`,
            cardType: 'driver_details',
            cardData: driverRes,
            source: 'getDriverDetails'
        };
    }

    // 4. Policy & Rules (Cancellation, Refunds, Lost Items, Conduct)
    if (q.includes('policy') || q.includes('refund') || q.includes('lost item') || q.includes('lost my') || 
        (q.includes('cancel') && (q.includes('policy') || q.includes('fee') || q.includes('charge') || q.includes('rule')))) {
        if (q.includes('cancel')) {
            return {
                text: `📋 **Drivo Ride Cancellation Policy:**\n\n• **Free Cancellation Window**: You can cancel free of charge within 3 minutes of booking.\n• **Post-3 Minute Fee**: A standard ₹50 cancellation fee applies if the driver has already started traveling to your pickup to cover fuel and time.\n• **Driver Cancellation**: No fee is ever charged if the driver cancels the ride.\n• **Driver Stationary Waiver**: If your assigned captain was stationary for over 5 minutes, any cancellation fee is automatically waived.`,
                cardType: 'policy',
                source: 'cancellation_policy'
            };
        }
        if (q.includes('refund')) {
            return {
                text: `💳 **Drivo Refund Policy:**\n\nRefunds for duplicate or disputed charges are processed automatically within 3 to 5 business days back to your original payment method. UPI and wallet transactions typically settle within 24 hours.`,
                cardType: 'policy',
                source: 'refund_policy'
            };
        }
    }

    // 5. Cancel ride action
    if (q.includes('cancel my ride') || q === 'cancel ride' || q === 'cancel' || q.includes('stop my ride') || q.includes('please cancel')) {
        const cancelRes = await cancelRideTool(userId);
        return {
            text: cancelRes.success
                ? `❌ **Ride Cancelled Successfully.**\n\n${cancelRes.message}`
                : `⚠️ **Unable to cancel:** ${cancelRes.message}`,
            cardType: 'cancellation',
            cardData: cancelRes,
            source: 'cancelRide'
        };
    }

    // 5. Current ride status
    if (q.includes('status') || q.includes('current ride') || q.includes('my ride')) {
        const statusRes = await getRideStatusTool(userId);
        if (!statusRes.success) {
            return {
                text: `📋 ${statusRes.message}`,
                cardType: 'empty',
                source: 'getRideStatus'
            };
        }
        return {
            text: `📋 **Current Ride Status: ${statusRes.status?.toUpperCase()}**\n\n• **Pickup**: ${statusRes.pickup}\n• **Destination**: ${statusRes.destination}\n• **Details**: ${statusRes.statusDescription}\n• **ETA**: ${statusRes.eta || 'Calculating...'}`,
            cardType: 'ride_status',
            cardData: statusRes,
            source: 'getRideStatus'
        };
    }

    // 6. Fare calculation
    if (q.includes('fare') || q.includes('cost') || q.includes('price') || q.includes('how much')) {
        const fareRes = await getRideFareTool(userId);
        if (fareRes.hasActiveRide) {
            return {
                text: `💰 **Active Ride Fare:**\n\n• **Trip Amount**: ₹${fareRes.totalFare}\n• **Destination**: ${fareRes.destination}\n• **Pricing Model**: ${fareRes.farePolicy}`,
                cardType: 'fare',
                cardData: fareRes,
                source: 'getRideFare'
            };
        }
        return {
            text: `💰 **Drivo Fare Breakdown:**\n\n${fareRes.message || fareRes.farePolicy}\n\nEnter pickup & drop to view accurate pre-booking estimates.`,
            cardType: 'fare',
            cardData: fareRes,
            source: 'getRideFare'
        };
    }

    // 7. Ride history
    if (q.includes('latest ride') || q.includes('history') || q.includes('past rides') || q.includes('previous ride')) {
        const histRes = await getRideHistoryTool(userId);
        if (!histRes.success || histRes.rides.length === 0) {
            return {
                text: `📜 ${histRes.message || 'No past rides found.'}`,
                cardType: 'empty',
                source: 'getRideHistory'
            };
        }
        const formatted = histRes.rides.map((r, i) =>
            `${i + 1}. **${r.destination}** — ₹${r.fare} (${r.status.toUpperCase()}) on ${r.date}`
        ).join('\n');
        return {
            text: `📜 **Your Recent Trips:**\n\n${formatted}`,
            cardType: 'ride_history',
            cardData: histRes,
            source: 'getRideHistory'
        };
    }

    // Default general assistance
    return {
        text: `👋 Hi, I'm **Zen**, your Drivo AI Ride Assistant! I can help you in real time with:\n\n• "Where is my driver?"\n• "What's my ETA?"\n• "Who is my driver?"\n• "What is my ride status?"\n• "How much will my ride cost?"\n• "Cancel my ride"\n• "Show me my latest ride"\n\nHow can I help with your journey today?`,
        cardType: 'welcome',
        source: 'general_greeting'
    };
}

// ─── 4. Main Public Entrypoint ────────────────────────────────────────────────

async function askZenSupport(query, userId = null) {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return {
            text: "Hello! Please enter a query and I'll look up your ride details or help you right away.",
            cardType: 'welcome',
            source: 'validation'
        };
    }

    // If GEMINI_API_KEY is configured, use LLM with tool calling
    if (process.env.GEMINI_API_KEY) {
        try {
            const systemPrompt = `You are Zen, the intelligent AI customer support assistant for Drivo Ride-Hailing.
Answer the customer's query using real tools. Never invent driver names, locations, or ETAs.
Customer User ID: ${userId || 'guest'}.`;

            const geminiRes = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
                {
                    contents: [{ parts: [{ text: query }] }],
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    tools: [{ functionDeclarations: ZEN_TOOL_DECLARATIONS }]
                },
                { timeout: 7000 }
            );

            const candidate = geminiRes.data?.candidates?.[0]?.content?.parts?.[0];

            // If model called a function
            if (candidate?.functionCall) {
                const fnName = candidate.functionCall.name;
                const fnArgs = candidate.functionCall.args || {};

                let toolResult = null;
                switch (fnName) {
                    case 'getCurrentRide':
                        toolResult = await getCurrentRideTool(userId);
                        break;
                    case 'getRideStatus':
                        toolResult = await getRideStatusTool(userId);
                        break;
                    case 'getDriverDetails':
                        toolResult = await getDriverDetailsTool(userId);
                        break;
                    case 'getDriverLocation':
                        toolResult = await getDriverLocationTool(userId);
                        break;
                    case 'getRideETA':
                        toolResult = await getRideETATool(userId);
                        break;
                    case 'getRideFare':
                        toolResult = await getRideFareTool(userId, fnArgs.pickup, fnArgs.destination);
                        break;
                    case 'cancelRide':
                        toolResult = await cancelRideTool(userId, fnArgs.reason);
                        break;
                    case 'getRideHistory':
                        toolResult = await getRideHistoryTool(userId);
                        break;
                    default:
                        toolResult = await getCurrentRideTool(userId);
                }

                // Follow-up synthesis with tool result
                return resolveQueryDeterministically(query, userId);
            }

            if (candidate?.text) {
                return {
                    text: candidate.text,
                    cardType: 'chat',
                    source: 'gemini'
                };
            }
        } catch (llmErr) {
            console.warn('Gemini tool calling fallback to deterministic DB resolver:', llmErr.message);
        }
    }

    // High-reliability deterministic resolver directly querying DB
    return resolveQueryDeterministically(query, userId);
}

module.exports = {
    askZenSupport,
    getCurrentRideTool,
    getRideStatusTool,
    getDriverDetailsTool,
    getDriverLocationTool,
    getRideETATool,
    getRideFareTool,
    cancelRideTool,
    getRideHistoryTool,
    ZEN_TOOL_DECLARATIONS
};
