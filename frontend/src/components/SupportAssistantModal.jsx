import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
    Bot, Send, X, Sparkles, Navigation, Clock, 
    UserCheck, DollarSign, Ban, History, Shield, Car, Phone, Star, MapPin,
    Award, CheckCircle2, ChevronRight, TrendingUp, RotateCcw, AlertCircle, HelpCircle,
    Info, Compass, AlertTriangle, Key, ArrowRight, Mail, PhoneCall
} from 'lucide-react';

const CUSTOMER_QUICK_ACTIONS = [
    { label: "🚗 Book a Ride", query: "Book a ride from Salt Lake to Park Street.", desc: "Instant booking with smart fare estimate" },
    { label: "📍 Track Current Ride", query: "Where is my driver?", desc: "Check live driver telemetry & ETA" },
    { label: "❌ Cancel Ride", query: "Cancel my current ride.", desc: "Safe cancellation & fee check" },
    { label: "🧾 Ride History", query: "Show my recent rides.", desc: "Past journeys and payment receipts" },
    { label: "💰 Available Ride Options", query: "What are my available ride options?", desc: "Drivo Go, Auto, and Moto options" },
    { label: "🆘 Contact Support", query: "I want to contact support.", desc: "24/7 Drivo Care hotline & email" }
];

const CAPTAIN_STARTER_PROMPTS = [
    { label: "Where is my rider?", icon: Navigation, desc: "Current pickup telemetry" },
    { label: "What is the pickup location?", icon: MapPin, desc: "Exact address and directions" },
    { label: "How much have I earned today?", icon: DollarSign, desc: "Daily shift earnings and completed trips" },
    { label: "What is my acceptance rate?", icon: Star, desc: "Driver performance metrics" },
    { label: "Where is demand high?", icon: TrendingUp, desc: "Citywide hotspot recommendations" },
    { label: "Active trip details", icon: Car, desc: "Passenger & destination overview" }
];

const ADMIN_STARTER_PROMPTS = [
    { label: "Today's platform revenue", icon: DollarSign, desc: "Gross bookings and commissions" },
    { label: "Active rides count", icon: Car, desc: "Live in-transit trips across zones" },
    { label: "Flagged ride anomalies", icon: Shield, desc: "GPS route deviations and fraud alerts" },
    { label: "Citywide demand hotspots", icon: TrendingUp, desc: "Surge clusters and vehicle density" }
];

const SupportAssistantModal = ({ 
    isOpen, 
    onClose, 
    userType = 'user',
    onRideCreated,
    onRideCancelled
}) => {
    const isCaptain = userType === 'captain';
    const isAdmin = userType === 'admin';
    const activePrompts = isAdmin 
        ? ADMIN_STARTER_PROMPTS 
        : (isCaptain ? CAPTAIN_STARTER_PROMPTS : CUSTOMER_QUICK_ACTIONS.map(q => ({ label: q.label, icon: Car, desc: q.desc, query: q.query })));

    const initialGreeting = isAdmin
        ? "👋 Welcome Admin! I'm your **Drivo Operations Copilot**. Connected to live fleet analytics, active ride counts, revenue telemetry, and safety anomaly detection.\n\nHow can I help you manage the platform?"
        : isCaptain
            ? "👋 Hi Captain! I'm your **Drivo Captain Assistant**. I can pull up your active trip pickup telemetry, today's shift earnings, driver rating, or recommend high-demand repositioning hotspots.\n\nWhat would you like to check?"
            : "👋 Hi! I'm your **Drivo AI Customer Assistant**.\n\nI can book rides, track your driver's live GPS position, calculate traffic-adjusted ETAs, explain fare receipts, or manage cancellations safely.\n\nHow can I help you with your journey today?";

    const [messages, setMessages] = useState([
        {
            sender: 'ai',
            text: initialGreeting,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            source: 'system'
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [lastFailedText, setLastFailedText] = useState('');
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
            setTimeout(() => inputRef.current?.focus(), 150);
        }
    }, [messages, isOpen]);

    useEffect(() => {
        handleResetChat();
    }, [userType]);

    const handleResetChat = () => {
        setMessages([
            {
                sender: 'ai',
                text: initialGreeting,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                source: 'system'
            }
        ]);
        setHasError(false);
        setLastFailedText('');
    };

    const handleSend = async (queryText) => {
        const textToSend = queryText || input;
        if (!textToSend.trim() || loading) return;

        const userMsg = {
            sender: 'user',
            text: textToSend,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        if (!queryText) setInput('');
        setLoading(true);
        setHasError(false);

        // Build conversational history array (excluding initial greeting)
        const history = updatedMessages
            .slice(1)
            .map(m => ({
                role: m.sender === 'user' ? 'user' : 'assistant',
                content: m.text
            }));

        try {
            const token = localStorage.getItem(isCaptain ? 'captain-token' : 'token');
            let response;
            try {
                // Primary: Dedicated Generative AI Assistant API with tool calling & memory
                response = await axios.post(
                    `${import.meta.env.VITE_BASE_URL}/api/assistant/chat`,
                    { message: textToSend, history },
                    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
                );
            } catch (primaryErr) {
                // Secondary fallback endpoint
                response = await axios.post(
                    `${import.meta.env.VITE_BASE_URL}/api/ai/support-chat`,
                    { query: textToSend, history },
                    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
                );
            }

            const data = response.data;
            const aiReply = {
                sender: 'ai',
                text: data.answer || data.text,
                source: data.source,
                sources: data.sources || [],
                toolCalls: data.toolCalls || [],
                metadata: data.metadata,
                cardType: data.cardType,
                cardData: data.cardData,
                actions: data.suggestedActions || [],
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            setMessages(prev => [...prev, aiReply]);

            // Notify parent page of active ride updates
            if (data.cardType === 'booking_success' && data.cardData?.ride && onRideCreated) {
                onRideCreated(data.cardData.ride);
            } else if (data.cardType === 'cancel_success' && onRideCancelled) {
                onRideCancelled(data.cardData);
            }
        } catch (err) {
            console.error('Support assistant chat error:', err);
            setHasError(true);
            setLastFailedText(textToSend);
            setMessages(prev => [
                ...prev,
                {
                    sender: 'ai',
                    text: "I'm temporarily having trouble connecting to live trip services. For immediate assistance, our 24/7 Drivo helpline is available at support@drivo.com or call 1800-DRIVO-SAFE.",
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    source: 'fallback',
                    isError: true
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const isInitialState = messages.length <= 1;

    return (
        <div className='fixed inset-0 z-[999] bg-slate-950/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200'>
            <div className='bg-white text-slate-900 w-full sm:max-w-xl h-[94vh] sm:h-[740px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100 relative'>
                
                {/* Header */}
                <div className={`p-4 sm:p-5 flex items-center justify-between border-b shadow-sm text-white ${
                    isCaptain 
                        ? 'bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border-emerald-900/40' 
                        : isAdmin
                            ? 'bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 border-amber-900/30'
                            : 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-indigo-900/40'
                }`}>
                    <div className='flex items-center gap-3'>
                        <div className='relative'>
                            <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shadow-lg ring-2 ring-white/10 ${
                                isCaptain 
                                    ? 'bg-gradient-to-tr from-emerald-500 via-teal-600 to-cyan-500 shadow-emerald-500/25'
                                    : isAdmin
                                        ? 'bg-gradient-to-tr from-amber-500 via-orange-600 to-amber-400 shadow-amber-500/25'
                                        : 'bg-gradient-to-tr from-blue-500 via-indigo-600 to-violet-500 shadow-indigo-500/25'
                            }`}>
                                <Bot className='h-6 w-6 text-white' />
                            </div>
                            <span className='absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-pulse'></span>
                        </div>
                        <div>
                            <div className='flex items-center gap-2'>
                                <h3 className='font-bold text-base tracking-tight text-white'>Drivo AI Assistant</h3>
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                    isCaptain 
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                        : isAdmin
                                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                            : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                                }`}>
                                    {isCaptain ? 'Captain AI' : isAdmin ? 'Admin AI' : 'Customer AI'}
                                </span>
                            </div>
                            <p className='text-xs text-slate-400 flex items-center gap-1.5 mt-0.5'>
                                <span className='inline-block h-1.5 w-1.5 rounded-full bg-emerald-400'></span>
                                <span>Live Telemetry • Validated Tool Execution</span>
                            </p>
                        </div>
                    </div>
                    
                    <div className='flex items-center gap-1.5'>
                        <button
                            onClick={handleResetChat}
                            className='h-9 w-9 bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full flex items-center justify-center transition-colors'
                            title="New Conversation / Reset Memory"
                            aria-label="New Conversation"
                        >
                            <RotateCcw className='h-4 w-4' />
                        </button>
                        <button
                            onClick={onClose}
                            className='h-9 w-9 bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full flex items-center justify-center transition-colors'
                            aria-label="Close Assistant"
                        >
                            <X className='h-5 w-5' />
                        </button>
                    </div>
                </div>

                {/* Quick-Action Chips Carousel */}
                {!isInitialState && (
                    <div className='bg-slate-50/95 border-b border-slate-100 px-3 py-2 overflow-x-auto flex gap-1.5 no-scrollbar'>
                        {(isCaptain ? CAPTAIN_STARTER_PROMPTS : isAdmin ? ADMIN_STARTER_PROMPTS : CUSTOMER_QUICK_ACTIONS).slice(0, 6).map((prompt, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleSend(prompt.query || prompt.label)}
                                className={`flex-shrink-0 text-xs font-semibold bg-white border rounded-full px-3 py-1.5 transition-all shadow-xs flex items-center gap-1.5 ${
                                    isCaptain 
                                        ? 'hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border-slate-200 hover:border-emerald-300'
                                        : 'hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border-slate-200 hover:border-indigo-300'
                                }`}
                            >
                                <span>{prompt.label}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Chat Messages Body */}
                <div className='flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/50'>
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                        >
                            <div className='flex items-start gap-2.5 max-w-[94%] sm:max-w-[88%]'>
                                {msg.sender === 'ai' && (
                                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 text-white shadow-xs ${
                                        isCaptain
                                            ? 'bg-gradient-to-tr from-emerald-600 to-teal-500'
                                            : isAdmin
                                                ? 'bg-gradient-to-tr from-amber-600 to-orange-500'
                                                : 'bg-gradient-to-tr from-blue-600 to-indigo-600'
                                    }`}>
                                        <Bot className='h-4 w-4' />
                                    </div>
                                )}

                                <div
                                    className={`rounded-2xl p-4 text-sm shadow-xs leading-relaxed ${
                                        msg.sender === 'user'
                                            ? isCaptain 
                                                ? 'bg-emerald-700 text-white rounded-tr-xs' 
                                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-xs font-medium'
                                            : msg.isError
                                                ? 'bg-rose-50 text-rose-950 border border-rose-200 rounded-tl-xs'
                                                : 'bg-white text-slate-800 rounded-tl-xs border border-slate-200/90'
                                    }`}
                                >
                                    <div className='whitespace-pre-wrap font-normal leading-relaxed'>{msg.text}</div>

                                    {/* ── RICH CARD: Booking Confirmation Summary (Two-Step Flow) ── */}
                                    {msg.cardType === 'booking_confirmation' && msg.cardData && (
                                        <div className='mt-3.5 pt-3.5 border-t border-slate-100 bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/60 rounded-2xl p-4 text-xs space-y-3 border border-indigo-100 shadow-sm'>
                                            <div className='flex items-center justify-between'>
                                                <span className='font-bold text-indigo-950 flex items-center gap-1.5 text-sm'>
                                                    <Car className='h-4 w-4 text-indigo-600' /> Trip Confirmation
                                                </span>
                                                <span className='bg-indigo-100 text-indigo-800 font-bold px-2.5 py-0.5 rounded-full text-[11px] uppercase tracking-wider'>
                                                    {msg.cardData.vehicleType === 'moto' ? 'Drivo Moto' : (msg.cardData.vehicleType === 'auto' ? 'Drivo Auto' : 'Drivo Go')}
                                                </span>
                                            </div>

                                            {/* Route Display */}
                                            <div className='bg-white p-3 rounded-xl border border-indigo-100/80 space-y-2'>
                                                <div className='flex items-start gap-2.5'>
                                                    <span className='h-2.5 w-2.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0 ring-2 ring-emerald-100'></span>
                                                    <div>
                                                        <div className='text-[10px] text-slate-400 uppercase font-bold tracking-wider'>Pickup</div>
                                                        <div className='font-bold text-slate-900'>{msg.cardData.pickup}</div>
                                                    </div>
                                                </div>
                                                <div className='border-l-2 border-dashed border-slate-200 ml-1.5 h-3'></div>
                                                <div className='flex items-start gap-2.5'>
                                                    <span className='h-2.5 w-2.5 rounded-full bg-rose-500 mt-1 flex-shrink-0 ring-2 ring-rose-100'></span>
                                                    <div>
                                                        <div className='text-[10px] text-slate-400 uppercase font-bold tracking-wider'>Destination</div>
                                                        <div className='font-bold text-slate-900'>{msg.cardData.destination}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Fare & Notice */}
                                            <div className='flex items-center justify-between px-1'>
                                                <span className='text-slate-600 font-medium'>Estimated Fare:</span>
                                                <span className='text-lg font-black text-slate-900'>₹{msg.cardData.estimatedFare}</span>
                                            </div>

                                            {/* Two-step Explicit Confirmation Action Buttons */}
                                            <div className='grid grid-cols-2 gap-2 pt-1'>
                                                <button
                                                    onClick={() => handleSend("Yes, confirm")}
                                                    className='w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5'
                                                >
                                                    <CheckCircle2 className='h-4 w-4' /> Confirm Booking
                                                </button>
                                                <button
                                                    onClick={() => handleSend("No, don't book")}
                                                    className='w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all'
                                                >
                                                    Cancel Request
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* ── RICH CARD: Booking Success ── */}
                                    {msg.cardType === 'booking_success' && msg.cardData?.ride && (
                                        <div className='mt-3.5 pt-3.5 border-t border-slate-100 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/60 rounded-2xl p-4 text-xs space-y-3 border border-emerald-200 shadow-sm'>
                                            <div className='flex items-center justify-between'>
                                                <span className='font-black text-emerald-950 flex items-center gap-1.5 text-sm'>
                                                    <CheckCircle2 className='h-4 w-4 text-emerald-600' /> Ride Booked Successfully!
                                                </span>
                                                <span className='bg-emerald-100 text-emerald-800 font-mono font-bold px-2 py-0.5 rounded-full text-[10px]'>
                                                    #{msg.cardData.ride._id?.slice(-6).toUpperCase()}
                                                </span>
                                            </div>

                                            <div className='bg-white p-3 rounded-xl border border-emerald-100 space-y-1.5 text-slate-700'>
                                                <div><strong className='text-slate-900'>From:</strong> {msg.cardData.ride.pickup}</div>
                                                <div><strong className='text-slate-900'>To:</strong> {msg.cardData.ride.destination}</div>
                                                <div className='flex justify-between items-center pt-1 border-t border-slate-100'>
                                                    <span>Vehicle: <strong className='text-slate-900'>{msg.cardData.ride.vehicleType?.toUpperCase() || 'DRIVO GO'}</strong></span>
                                                    <span className='font-bold text-slate-900 text-sm'>₹{msg.cardData.ride.fare}</span>
                                                </div>
                                            </div>

                                            {msg.cardData.ride.otp && (
                                                <div className='bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-center justify-between'>
                                                    <div className='flex items-center gap-1.5 text-amber-900 font-medium'>
                                                        <Key className='h-4 w-4 text-amber-600' /> Ride OTP (Share on Boarding):
                                                    </div>
                                                    <span className='font-mono font-black text-base tracking-widest text-slate-900 bg-white px-2 py-0.5 rounded border border-amber-300'>
                                                        {msg.cardData.ride.otp}
                                                    </span>
                                                </div>
                                            )}

                                            <p className='text-[11px] text-emerald-800 font-medium flex items-center gap-1'>
                                                <Sparkles className='h-3.5 w-3.5' /> AI driver matching in progress. We're dispatching the nearest Captain!
                                            </p>
                                        </div>
                                    )}

                                    {/* ── RICH CARD: Cancel Confirmation Dialog ── */}
                                    {msg.cardType === 'cancel_confirmation' && msg.cardData && (
                                        <div className='mt-3.5 pt-3.5 border-t border-slate-100 bg-gradient-to-br from-rose-50/80 via-white to-amber-50/60 rounded-2xl p-4 text-xs space-y-3 border border-rose-200 shadow-sm'>
                                            <div className='flex items-center justify-between'>
                                                <span className='font-bold text-rose-950 flex items-center gap-1.5 text-sm'>
                                                    <AlertTriangle className='h-4 w-4 text-rose-600' /> Cancel Ride Confirmation
                                                </span>
                                                <span className='bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full text-[10px] uppercase'>
                                                    Action Required
                                                </span>
                                            </div>

                                            <div className='bg-white p-3 rounded-xl border border-rose-100 space-y-1 text-slate-700'>
                                                <div><strong>Pickup:</strong> {msg.cardData.pickup}</div>
                                                <div><strong>Destination:</strong> {msg.cardData.destination}</div>
                                                <div className='pt-1 text-[11px] font-semibold text-rose-700'>
                                                    {msg.cardData.feeApplies 
                                                        ? "⚠️ Notice: A ₹50 driver dispatch compensation fee may apply as travel commenced."
                                                        : "✅ Free cancellation: You are within the 3-minute grace period (No fee)."}
                                                </div>
                                            </div>

                                            <div className='grid grid-cols-2 gap-2 pt-1'>
                                                <button
                                                    onClick={() => handleSend("Yes, cancel")}
                                                    className='w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md shadow-rose-600/20 active:scale-95 transition-all'
                                                >
                                                    Yes, Cancel Ride
                                                </button>
                                                <button
                                                    onClick={() => handleSend("Keep my ride")}
                                                    className='w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl transition-all'
                                                >
                                                    Keep My Ride
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* ── RICH CARD: Cancel Success ── */}
                                    {msg.cardType === 'cancel_success' && msg.cardData && (
                                        <div className='mt-3.5 pt-3.5 border-t border-slate-100 bg-slate-100 rounded-2xl p-4 text-xs space-y-2 border border-slate-200'>
                                            <div className='flex items-center justify-between font-bold text-slate-900'>
                                                <span className='flex items-center gap-1.5 text-rose-600'>
                                                    <Ban className='h-4 w-4' /> Ride Cancelled
                                                </span>
                                                <span className='bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-mono text-[10px]'>
                                                    #{msg.cardData.rideId?.slice(-6).toUpperCase()}
                                                </span>
                                            </div>
                                            <p className='text-slate-600 leading-relaxed'>
                                                {msg.cardData.cancellationFee > 0
                                                    ? `Applied fee: ₹${msg.cardData.cancellationFee}. Receipt sent to your account.`
                                                    : 'No cancellation fee applied. You can request another ride anytime.'}
                                            </p>
                                        </div>
                                    )}

                                    {/* ── RICH CARD: Available Ride Options ── */}
                                    {msg.cardType === 'ride_options' && msg.cardData?.options && (
                                        <div className='mt-3.5 pt-3.5 border-t border-slate-100 space-y-2'>
                                            <div className='text-xs font-bold text-slate-900 mb-1 flex items-center gap-1.5'>
                                                <Car className='h-4 w-4 text-indigo-600' /> Drivo Fleet Categories
                                            </div>
                                            <div className='grid grid-cols-1 gap-2'>
                                                {msg.cardData.options.map((opt, oIdx) => (
                                                    <div 
                                                        key={oIdx} 
                                                        className='bg-white p-3 rounded-xl border border-slate-200 hover:border-indigo-400 transition-all shadow-xs flex items-center justify-between'
                                                    >
                                                        <div>
                                                            <div className='font-bold text-slate-900 text-xs flex items-center gap-1.5'>
                                                                {opt.name}
                                                                <span className='text-[10px] text-slate-400 font-normal'>• Seats {opt.capacity}</span>
                                                            </div>
                                                            <div className='text-[11px] text-slate-500 mt-0.5'>{opt.description}</div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleSend(`Book a ${opt.name}`)}
                                                            className='text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1'
                                                        >
                                                            <span>Book</span>
                                                            <ArrowRight className='h-3 w-3' />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* ── RICH CARD: Contact Support ── */}
                                    {msg.cardType === 'contact_support' && (
                                        <div className='mt-3.5 pt-3.5 border-t border-slate-100 bg-indigo-50/60 rounded-2xl p-4 text-xs space-y-3 border border-indigo-100'>
                                            <div className='flex items-center justify-between font-bold text-indigo-950'>
                                                <span className='flex items-center gap-1.5 text-sm'>
                                                    <Shield className='h-4 w-4 text-indigo-600' /> Drivo 24/7 Helpline
                                                </span>
                                                <span className='bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]'>
                                                    Active 24x7
                                                </span>
                                            </div>
                                            <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1'>
                                                <a 
                                                    href='tel:18003748672'
                                                    className='p-2.5 bg-white border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors flex items-center gap-2.5'
                                                >
                                                    <div className='h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0'>
                                                        <PhoneCall className='h-4 w-4' />
                                                    </div>
                                                    <div>
                                                        <div className='font-bold text-slate-900 text-xs'>Toll-Free</div>
                                                        <div className='text-[10px] text-slate-500'>1800-DRIVO-SAFE</div>
                                                    </div>
                                                </a>
                                                <a 
                                                    href='mailto:support@drivo.com'
                                                    className='p-2.5 bg-white border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors flex items-center gap-2.5'
                                                >
                                                    <div className='h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0'>
                                                        <Mail className='h-4 w-4' />
                                                    </div>
                                                    <div>
                                                        <div className='font-bold text-slate-900 text-xs'>Email Support</div>
                                                        <div className='text-[10px] text-slate-500'>support@drivo.com</div>
                                                    </div>
                                                </a>
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Rider Card: Driver Location ── */}
                                    {msg.cardType === 'driver_location' && msg.cardData && (
                                        <div className='mt-3 pt-3 border-t border-slate-100 bg-indigo-50/60 rounded-xl p-3.5 text-xs space-y-2 border border-indigo-100'>
                                            <div className='flex items-center justify-between font-semibold text-slate-900'>
                                                <span className='flex items-center gap-1.5 text-indigo-700 font-bold'>
                                                    <Car className='h-4 w-4' /> {msg.cardData.driverName || 'Driver'}
                                                </span>
                                                <span className='bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px] uppercase'>
                                                    {msg.cardData.status || 'En Route'}
                                                </span>
                                            </div>
                                            <div className='text-slate-600 flex justify-between'>
                                                <span>Vehicle: <strong className='text-slate-800'>{msg.cardData.vehicle?.color} {msg.cardData.vehicle?.vehicleType}</strong></span>
                                                <span className='font-mono font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-indigo-200'>{msg.cardData.vehicle?.plate || 'Registered'}</span>
                                            </div>
                                            <div className='flex items-center justify-between pt-1 border-t border-indigo-100 text-indigo-900 font-medium'>
                                                <span>Distance to pickup:</span>
                                                <span className='font-bold'>~{msg.cardData.distanceFromPickupKm || 1.8} km</span>
                                            </div>
                                            <div className='flex items-center justify-between text-indigo-950 font-bold'>
                                                <span>Driver Arrival ETA:</span>
                                                <span className='text-emerald-600 text-sm font-black'>~{msg.cardData.pickupEtaMinutes || 5} mins</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Rider Card: Driver Details ── */}
                                    {msg.cardType === 'driver_details' && msg.cardData?.driver && (
                                        <div className='mt-3 pt-3 border-t border-slate-100 bg-slate-50/90 rounded-xl p-3.5 text-xs space-y-2 border border-slate-200'>
                                            <div className='flex items-center justify-between'>
                                                <span className='font-bold text-slate-900 text-sm'>{msg.cardData.driver.name}</span>
                                                <span className='flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-bold text-[11px]'>
                                                    <Star className='h-3 w-3 fill-amber-500 text-amber-500' /> {msg.cardData.driver.rating || 4.8}
                                                </span>
                                            </div>
                                            <div className='text-slate-600 space-y-1'>
                                                <div>Vehicle: <span className='font-medium text-slate-800'>{msg.cardData.driver.vehicle?.color} {msg.cardData.driver.vehicle?.vehicleType?.toUpperCase()}</span></div>
                                                <div>Plate: <span className='font-mono font-bold text-slate-800'>{msg.cardData.driver.vehicle?.plate}</span></div>
                                                {msg.cardData.driver.phone && (
                                                    <div className='pt-1'>
                                                        <a 
                                                            href={`tel:${msg.cardData.driver.phone}`} 
                                                            className='inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors'
                                                        >
                                                            <Phone className='h-3 w-3' /> Call Driver ({msg.cardData.driver.phone})
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Rider Card: ETA Breakdown ── */}
                                    {msg.cardType === 'eta' && msg.cardData?.eta && (
                                        <div className='mt-3 pt-3 border-t border-slate-100 bg-emerald-50/60 rounded-xl p-3.5 text-xs space-y-2 border border-emerald-100'>
                                            <div className='flex items-center justify-between font-bold text-emerald-950'>
                                                <span className='flex items-center gap-1'>
                                                    <Clock className='h-3.5 w-3.5 text-emerald-600' /> {msg.cardData.eta.readable}
                                                </span>
                                                <span className='text-[10px] bg-emerald-200/60 text-emerald-800 px-2 py-0.5 rounded-full font-semibold'>
                                                    {msg.cardData.eta.trafficCondition || 'Smooth Flow'}
                                                </span>
                                            </div>
                                            <div className='space-y-1 text-slate-600'>
                                                <div className='flex justify-between'>
                                                    <span>Driver to pickup:</span>
                                                    <span className='font-semibold text-slate-800'>~{msg.cardData.eta.breakdown?.driverToPickupMinutes || 4} mins</span>
                                                </div>
                                                <div className='flex justify-between'>
                                                    <span>Trip duration to drop:</span>
                                                    <span className='font-semibold text-slate-800'>~{msg.cardData.eta.tripDurationMinutes || 12} mins</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Driver Card: Passenger Pickup ── */}
                                    {msg.cardType === 'driver_pickup' && msg.cardData && (
                                        <div className='mt-3 pt-3 border-t border-slate-100 bg-emerald-50/70 rounded-xl p-3.5 text-xs space-y-2 border border-emerald-200/60'>
                                            <div className='flex items-center justify-between font-bold text-emerald-950'>
                                                <span className='flex items-center gap-1.5'>
                                                    <MapPin className='h-4 w-4 text-emerald-600' /> {msg.cardData.rider?.name || 'Passenger'}
                                                </span>
                                                <span className='bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full text-[10px] uppercase'>
                                                    {msg.cardData.status}
                                                </span>
                                            </div>
                                            <div className='space-y-1.5 text-slate-700'>
                                                <div>
                                                    <span className='font-bold text-slate-900'>Pickup: </span>
                                                    <span>{msg.cardData.pickup}</span>
                                                </div>
                                                <div>
                                                    <span className='font-bold text-slate-900'>Drop: </span>
                                                    <span>{msg.cardData.destination}</span>
                                                </div>
                                                <div className='flex items-center justify-between pt-1 border-t border-emerald-200 font-semibold text-emerald-900'>
                                                    <span>Distance to Pickup:</span>
                                                    <span>~{msg.cardData.distanceKm} km</span>
                                                </div>
                                                {msg.cardData.rider?.phone && (
                                                    <div className='pt-1'>
                                                        <a 
                                                            href={`tel:${msg.cardData.rider.phone}`}
                                                            className='inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors'
                                                        >
                                                            <Phone className='h-3 w-3' /> Call Passenger ({msg.cardData.rider.phone})
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Driver Card: Today's Earnings ── */}
                                    {msg.cardType === 'driver_earnings' && msg.cardData && (
                                        <div className='mt-3 pt-3 border-t border-slate-100 bg-teal-50/70 rounded-xl p-3.5 text-xs space-y-2 border border-teal-200/60'>
                                            <div className='flex items-center justify-between font-bold text-teal-950'>
                                                <span className='flex items-center gap-1'>
                                                    <TrendingUp className='h-4 w-4 text-teal-600' /> Daily Shift Earnings
                                                </span>
                                                <span className='text-sm font-black text-teal-700 bg-teal-200/80 px-2.5 py-0.5 rounded-full'>
                                                    ₹{msg.cardData.totalEarningsToday}
                                                </span>
                                            </div>
                                            <div className='grid grid-cols-2 gap-2 pt-1'>
                                                <div className='bg-white p-2.5 rounded-lg border border-teal-100'>
                                                    <div className='text-[10px] text-slate-500'>Trips Completed</div>
                                                    <div className='text-sm font-bold text-slate-900'>{msg.cardData.totalRidesToday}</div>
                                                </div>
                                                <div className='bg-white p-2.5 rounded-lg border border-teal-100'>
                                                    <div className='text-[10px] text-slate-500'>Driver Rating</div>
                                                    <div className='text-sm font-bold text-slate-900 flex items-center gap-1'>
                                                        ⭐ {msg.cardData.rating}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Driver Card: Driver Metrics ── */}
                                    {msg.cardType === 'driver_metrics' && msg.cardData && (
                                        <div className='mt-3 pt-3 border-t border-slate-100 bg-slate-50 rounded-xl p-3.5 text-xs space-y-2 border border-slate-200'>
                                            <div className='flex items-center justify-between font-bold text-slate-900'>
                                                <span className='flex items-center gap-1'>
                                                    <Award className='h-4 w-4 text-amber-500' /> Shift Performance
                                                </span>
                                                <span className='font-mono text-[11px] text-slate-600'>
                                                    ⭐ {msg.cardData.rating} / 5.0
                                                </span>
                                            </div>
                                            <div className='grid grid-cols-3 gap-1.5 pt-1 text-center'>
                                                <div className='bg-white p-2 rounded-lg border border-slate-200'>
                                                    <div className='text-[10px] text-slate-500'>Acceptance</div>
                                                    <div className='text-xs font-black text-emerald-600'>{msg.cardData.acceptanceRate}%</div>
                                                </div>
                                                <div className='bg-white p-2 rounded-lg border border-slate-200'>
                                                    <div className='text-[10px] text-slate-500'>Cancellation</div>
                                                    <div className='text-xs font-black text-rose-600'>{msg.cardData.cancellationRate}%</div>
                                                </div>
                                                <div className='bg-white p-2 rounded-lg border border-slate-200'>
                                                    <div className='text-[10px] text-slate-500'>On-Time</div>
                                                    <div className='text-xs font-black text-indigo-600'>{msg.cardData.onTimeRate}%</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Interactive Suggested Action Chips */}
                                    {msg.actions && msg.actions.length > 0 && (
                                        <div className='mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5'>
                                            {msg.actions.map((act, aIdx) => (
                                                <button
                                                    key={aIdx}
                                                    onClick={() => handleSend(act)}
                                                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all flex items-center gap-1 ${
                                                        isCaptain
                                                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                                                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200'
                                                    }`}
                                                >
                                                    <span>{act}</span>
                                                    <ChevronRight className='h-3 w-3 opacity-60' />
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Tool Execution Activity Badges */}
                                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                                        <div className='mt-2.5 flex flex-wrap gap-1'>
                                            {msg.toolCalls.map((tc, tcIdx) => (
                                                <span key={tcIdx} className='inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono border border-slate-200'>
                                                    <CheckCircle2 className='h-2.5 w-2.5 text-emerald-500' />
                                                    Validated Tool: {tc.tool}()
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* RAG Policy & Source Badges */}
                                    {msg.sources && msg.sources.length > 0 && (
                                        <div className='mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5'>
                                            <span className='text-[10px] text-slate-400 font-semibold uppercase tracking-wider'>Cited Policies:</span>
                                            {msg.sources.map((s, sIdx) => (
                                                <span key={sIdx} className='inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium border border-blue-200'>
                                                    <Shield className='h-2.5 w-2.5 text-blue-500' />
                                                    {s.title}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Source Attribution */}
                                    {msg.source && (
                                        <div className='mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400'>
                                            <span className={`flex items-center gap-1 font-medium ${isAdmin ? 'text-amber-700' : isCaptain ? 'text-emerald-700' : 'text-indigo-600'}`}>
                                                <Sparkles className='h-3 w-3' /> Live Drivo AI + RAG
                                            </span>
                                            <span className='font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500'>
                                                {msg.source}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <span className='text-[10px] text-slate-400 mt-1 px-10'>{msg.time}</span>
                        </div>
                    ))}

                    {/* Starter Prompts Empty State Grid */}
                    {isInitialState && (
                        <div className='mt-4 pt-2'>
                            <p className='text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1'>
                                Instant Actions & Questions
                            </p>
                            <div className='grid grid-cols-1 sm:grid-cols-2 gap-2.5'>
                                {(isCaptain ? CAPTAIN_STARTER_PROMPTS : isAdmin ? ADMIN_STARTER_PROMPTS : CUSTOMER_QUICK_ACTIONS).map((p, pIdx) => {
                                    return (
                                        <button
                                            key={pIdx}
                                            onClick={() => handleSend(p.query || p.label)}
                                            className={`p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-400 hover:shadow-md transition-all text-left flex items-start gap-3 group ${
                                                isCaptain ? 'hover:border-emerald-400' : ''
                                            }`}
                                        >
                                            <div className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                                isCaptain 
                                                    ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors' 
                                                    : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors'
                                            }`}>
                                                <Car className='h-4 w-4' />
                                            </div>
                                            <div>
                                                <h4 className='font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors'>
                                                    {p.label}
                                                </h4>
                                                <p className='text-[11px] text-slate-500 mt-0.5'>
                                                    {p.desc}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Typing / Loading Animation */}
                    {loading && (
                        <div className='flex items-start gap-2.5'>
                            <div className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-xs ${
                                isCaptain
                                    ? 'bg-gradient-to-tr from-emerald-600 to-teal-500'
                                    : 'bg-gradient-to-tr from-blue-600 to-indigo-600'
                            }`}>
                                <Bot className='h-4 w-4' />
                            </div>
                            <div className='bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-3.5 shadow-xs flex items-center gap-3'>
                                <div className='flex gap-1.5'>
                                    <span className='h-2 w-2 rounded-full bg-indigo-600 animate-bounce' style={{ animationDelay: '0ms' }}></span>
                                    <span className='h-2 w-2 rounded-full bg-indigo-600 animate-bounce' style={{ animationDelay: '150ms' }}></span>
                                    <span className='h-2 w-2 rounded-full bg-indigo-600 animate-bounce' style={{ animationDelay: '300ms' }}></span>
                                </div>
                                <span className='text-xs text-slate-500 font-medium'>
                                    Drivo Assistant is evaluating backend tools & live telemetry...
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Retry Button upon Error */}
                    {hasError && lastFailedText && (
                        <div className='flex justify-end pr-2'>
                            <button
                                onClick={() => handleSend(lastFailedText)}
                                className='inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-full font-semibold transition-all'
                            >
                                <RotateCcw className='h-3 w-3' /> Retry: "{lastFailedText.slice(0, 25)}..."
                            </button>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Bottom Input Field */}
                <div className='p-3 sm:p-4 border-t border-slate-100 bg-white shadow-lg'>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSend();
                        }}
                        className='flex items-center gap-2'
                    >
                        <div className='relative flex-1'>
                            <input
                                ref={inputRef}
                                type='text'
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={isCaptain 
                                    ? 'Ask Captain Assistant: "Where is my rider?", "Today\'s earnings?"...'
                                    : 'Ask Drivo: "Book a ride from A to B", "Where is my driver?", "Cancel my ride"...'
                                }
                                className={`w-full bg-slate-50 border text-sm rounded-2xl pl-4 pr-10 py-3.5 outline-none transition-all placeholder:text-slate-400 ${
                                    isCaptain 
                                        ? 'border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-3 focus:ring-emerald-500/10' 
                                        : 'border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-3 focus:ring-indigo-500/10'
                                }`}
                            />
                            {input && (
                                <button
                                    type='button'
                                    onClick={() => setInput('')}
                                    className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1'
                                >
                                    <X className='h-3.5 w-3.5' />
                                </button>
                            )}
                        </div>

                        <button
                            type='submit'
                            disabled={!input.trim() || loading}
                            className={`h-12 w-12 text-white rounded-2xl flex items-center justify-center transition-all shadow-md disabled:opacity-40 disabled:pointer-events-none flex-shrink-0 ${
                                isCaptain 
                                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 active:scale-95' 
                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-indigo-600/25 active:scale-95'
                            }`}
                            aria-label="Send message"
                        >
                            <Send className='h-4 w-4' />
                        </button>
                    </form>
                    <div className='flex items-center justify-between text-[10px] text-slate-400 mt-2 px-1'>
                        <span>Drivo AI • Validated Tool Execution & Live Telemetry</span>
                        <span>Zero arbitrary queries • Isolated Tenant Identity</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupportAssistantModal;
