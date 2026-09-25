import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
    Bot, Send, X, Sparkles, Navigation, Clock, 
    UserCheck, DollarSign, Ban, History, Shield, Car, Phone, Star, MapPin,
    Award, CheckCircle2, ChevronRight, TrendingUp, RotateCcw, AlertCircle, HelpCircle,
    Info, Compass
} from 'lucide-react';

const STARTER_PROMPTS = [
    { label: "Where is my driver?", icon: Navigation, desc: "Check live GPS position & ETA" },
    { label: "What's my current ride status?", icon: Car, desc: "Pending, accepted, or ongoing" },
    { label: "Show my recent rides", icon: History, desc: "Past trips and fare breakdown" },
    { label: "How much did I pay?", icon: DollarSign, desc: "Last ride payment and receipts" },
    { label: "How do I cancel a ride?", icon: Ban, desc: "Cancellation window & fee policy" },
    { label: "How does Tribo work?", icon: HelpCircle, desc: "Booking guide, safety & vehicles" }
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

const SupportAssistantModal = ({ isOpen, onClose, userType = 'user' }) => {
    const isCaptain = userType === 'captain';
    const isAdmin = userType === 'admin';
    const activePrompts = isAdmin ? ADMIN_STARTER_PROMPTS : (isCaptain ? CAPTAIN_STARTER_PROMPTS : STARTER_PROMPTS);

    const initialGreeting = isAdmin
        ? "👋 Welcome Admin! I'm **Zen**, your AI Operations Copilot for Tribo. I'm connected to live fleet analytics, active ride counts, revenue telemetry, and safety anomaly detection.\n\nHow can I help you manage the platform?"
        : isCaptain
            ? "👋 Hi Captain! I'm **Zen**, your Tribo AI Driving Copilot. I can pull up your active trip pickup telemetry, today's shift earnings, driver rating, or recommend high-demand repositioning hotspots.\n\nWhat would you like to check?"
            : "👋 Hi! I'm **Zen**, your Tribo AI Customer Copilot. Powered by live telemetry and smart tool calling, I can track your driver's arrival in real time, calculate traffic-adjusted ETAs, explain fare receipts, or assist with cancellation policies.\n\nHow can I help with your journey today?";

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

    // Reset greeting if role changes
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
        } catch (err) {
            console.error('Support assistant chat error:', err);
            setHasError(true);
            setLastFailedText(textToSend);
            setMessages(prev => [
                ...prev,
                {
                    sender: 'ai',
                    text: "I'm temporarily having trouble connecting to live trip services. If you need immediate assistance, our 24/7 Tribo helpline is available at support@tribo.com or call 1800-TRIBO-SAFE.",
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
            <div className='bg-white text-slate-900 w-full sm:max-w-xl h-[92vh] sm:h-[720px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100/90 relative'>
                
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
                                <h3 className='font-bold text-base tracking-tight text-white'>Zen Copilot</h3>
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                    isCaptain 
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                        : isAdmin
                                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                            : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                                }`}>
                                    {isCaptain ? 'Captain AI' : isAdmin ? 'Admin AI' : 'Tribo GenAI'}
                                </span>
                            </div>
                            <p className='text-xs text-slate-400 flex items-center gap-1.5 mt-0.5'>
                                <span className='inline-block h-1.5 w-1.5 rounded-full bg-emerald-400'></span>
                                <span>Live Telemetry • Multi-Turn Memory</span>
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

                {/* Compact Quick-Action Carousel (Always visible when conversation is underway) */}
                {!isInitialState && (
                    <div className='bg-slate-50/95 border-b border-slate-100 px-3 py-2 overflow-x-auto flex gap-1.5 no-scrollbar'>
                        {activePrompts.slice(0, 5).map((prompt, idx) => {
                            const IconComp = prompt.icon;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleSend(prompt.label)}
                                    className={`flex-shrink-0 text-xs font-medium bg-white border rounded-full px-3 py-1 transition-all shadow-xs flex items-center gap-1.5 ${
                                        isCaptain 
                                            ? 'hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border-slate-200 hover:border-emerald-300'
                                            : 'hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border-slate-200 hover:border-indigo-300'
                                    }`}
                                >
                                    <IconComp className={`h-3 w-3 ${isCaptain ? 'text-emerald-600' : 'text-indigo-600'}`} />
                                    <span>{prompt.label}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Chat Messages Body */}
                <div className='flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/50'>
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                        >
                            <div className='flex items-start gap-2.5 max-w-[92%] sm:max-w-[85%]'>
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
                                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-xs'
                                            : msg.isError
                                                ? 'bg-rose-50 text-rose-950 border border-rose-200 rounded-tl-xs'
                                                : 'bg-white text-slate-800 rounded-tl-xs border border-slate-200/90'
                                    }`}
                                >
                                    <div className='whitespace-pre-wrap font-normal leading-relaxed'>{msg.text}</div>

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

                                    {/* ── Rider Card: Fare Explanation ── */}
                                    {msg.cardType === 'fare_explanation' && msg.cardData && (
                                        <div className='mt-3 pt-3 border-t border-slate-100 bg-amber-50/60 rounded-xl p-3.5 text-xs space-y-2 border border-amber-200/60'>
                                            <div className='flex items-center justify-between font-bold text-amber-950'>
                                                <span className='flex items-center gap-1'>
                                                    <DollarSign className='h-3.5 w-3.5 text-amber-600' /> Transparent Fare Math
                                                </span>
                                                <span className='text-xs font-black text-amber-900 bg-amber-200/80 px-2.5 py-0.5 rounded-full'>
                                                    ₹{msg.cardData.finalFare}
                                                </span>
                                            </div>
                                            <div className='space-y-1 text-slate-700'>
                                                <div className='flex justify-between'>
                                                    <span>Base Fare:</span>
                                                    <span className='font-semibold'>₹{msg.cardData.baseFare}</span>
                                                </div>
                                                <div className='flex justify-between'>
                                                    <span>Distance ({msg.cardData.distanceKm} km):</span>
                                                    <span className='font-semibold'>₹{msg.cardData.distanceCharge}</span>
                                                </div>
                                                <div className='flex justify-between'>
                                                    <span>Duration ({msg.cardData.durationMinutes} mins):</span>
                                                    <span className='font-semibold'>₹{msg.cardData.durationCharge}</span>
                                                </div>
                                                {msg.cardData.surgeMultiplier > 1.0 && (
                                                    <div className='flex justify-between pt-1 border-t border-amber-200 text-amber-900 font-bold'>
                                                        <span>Surge Multiplier:</span>
                                                        <span>{msg.cardData.surgeMultiplier}x ({msg.cardData.surgeReason})</span>
                                                    </div>
                                                )}
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
                                                    Live Tool: {tc.tool}()
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

                                    {/* Source & Telemetry Attribution */}
                                    {msg.source && (
                                        <div className='mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400'>
                                            <span className={`flex items-center gap-1 font-medium ${isAdmin ? 'text-amber-700' : isCaptain ? 'text-emerald-700' : 'text-indigo-600'}`}>
                                                <Sparkles className='h-3 w-3' /> Live GenAI + RAG
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

                    {/* Starter Prompts Empty State Grid (Prominent when conversation is fresh) */}
                    {isInitialState && (
                        <div className='mt-4 pt-2'>
                            <p className='text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1'>
                                Frequently Asked Questions
                            </p>
                            <div className='grid grid-cols-1 sm:grid-cols-2 gap-2.5'>
                                {activePrompts.map((p, pIdx) => {
                                    const IconComp = p.icon;
                                    return (
                                        <button
                                            key={pIdx}
                                            onClick={() => handleSend(p.label)}
                                            className={`p-3 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-400 hover:shadow-md transition-all text-left flex items-start gap-3 group ${
                                                isCaptain ? 'hover:border-emerald-400' : ''
                                            }`}
                                        >
                                            <div className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                                isCaptain 
                                                    ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors' 
                                                    : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors'
                                            }`}>
                                                <IconComp className='h-4 w-4' />
                                            </div>
                                            <div>
                                                <h4 className='font-semibold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors'>
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
                                    Zen is querying live trip telemetry & policy base...
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
                                    ? 'Ask Zen: "Where is my rider?", "Today\'s earnings?", "My acceptance rate"...'
                                    : 'Ask Zen: "Where is my driver?", "What\'s my ETA?", "How do I cancel?"...'
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
                        <span>Powered by Tribo GenAI & Live Telemetry Tools</span>
                        <span>Zero arbitrary DB access • Isolated Tenant Auth</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupportAssistantModal;
