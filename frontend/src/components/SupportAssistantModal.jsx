import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
    Bot, Send, X, Sparkles, Navigation, Clock, 
    UserCheck, DollarSign, Ban, History, Shield, Car, Phone, Star, MapPin,
    Award, CheckCircle2, ChevronRight, TrendingUp
} from 'lucide-react';

const RIDER_PROMPTS = [
    { label: "Where is my driver?", icon: Navigation },
    { label: "What's my ETA?", icon: Clock },
    { label: "Why was surge applied?", icon: DollarSign },
    { label: "Show me my latest ride", icon: History },
    { label: "Who is my driver?", icon: UserCheck },
    { label: "What is my ride status?", icon: Car },
    { label: "Cancel my ride", icon: Ban }
];

const CAPTAIN_PROMPTS = [
    { label: "Where is my rider?", icon: Navigation },
    { label: "What is the pickup location?", icon: MapPin },
    { label: "How much have I earned today?", icon: DollarSign },
    { label: "What is my acceptance rate?", icon: Star },
    { label: "What is my cancellation rate?", icon: Shield },
    { label: "Active trip details", icon: Car }
];

const SupportAssistantModal = ({ isOpen, onClose, userType = 'user' }) => {
    const isCaptain = userType === 'captain';
    const activePrompts = isCaptain ? CAPTAIN_PROMPTS : RIDER_PROMPTS;

    const initialGreeting = isCaptain
        ? "👋 Hi Captain! I'm **Zen**, your AI Driving Copilot. I'm connected to your active trips, pickup telemetry, today's earnings, and performance metrics.\n\nHow can I assist your shift right now?"
        : "👋 Hi! I'm **Zen**, your AI Ride Copilot. Powered by live telemetry and smart dispatch tools, I can look up your driver's real-time location, arrival ETA, fare breakdown, or assist with cancellations & policies.\n\nHow can I help you right now?";

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
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    // Reset greeting if userType changes
    useEffect(() => {
        setMessages([
            {
                sender: 'ai',
                text: initialGreeting,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                source: 'system'
            }
        ]);
    }, [userType]);

    const handleSend = async (queryText) => {
        const textToSend = queryText || input;
        if (!textToSend.trim()) return;

        const userMsg = {
            sender: 'user',
            text: textToSend,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMsg]);
        if (!queryText) setInput('');
        setLoading(true);

        try {
            const token = localStorage.getItem(isCaptain ? 'captain-token' : 'token');
            const response = await axios.post(
                `${import.meta.env.VITE_BASE_URL}/api/ai/support-chat`,
                { query: textToSend },
                {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                }
            );

            const aiReply = {
                sender: 'ai',
                text: response.data.text,
                source: response.data.source,
                confidence: response.data.confidence,
                cardType: response.data.cardType,
                cardData: response.data.cardData,
                actions: response.data.suggestedActions || [],
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            setMessages(prev => [...prev, aiReply]);
        } catch (err) {
            setMessages(prev => [
                ...prev,
                {
                    sender: 'ai',
                    text: "I'm temporarily having trouble connecting to live trip services. If you need immediate assistance, our 24/7 helpline is available at support@drivo.com or call 1800-DRIVO.",
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    source: 'fallback'
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className='fixed inset-0 z-[999] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200'>
            <div className='bg-white text-slate-900 w-full sm:max-w-lg h-[90vh] sm:h-[680px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100/80'>
                {/* Header */}
                <div className={`p-4 sm:p-5 flex items-center justify-between border-b shadow-md text-white ${
                    isCaptain 
                        ? 'bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border-emerald-900/50' 
                        : 'bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border-slate-800'
                }`}>
                    <div className='flex items-center gap-3'>
                        <div className='relative'>
                            <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shadow-lg ring-2 ring-white/10 ${
                                isCaptain 
                                    ? 'bg-gradient-to-tr from-emerald-500 via-teal-600 to-cyan-500 shadow-emerald-500/30'
                                    : 'bg-gradient-to-tr from-blue-500 via-indigo-600 to-violet-500 shadow-indigo-500/30'
                            }`}>
                                <Bot className='h-6 w-6 text-white' />
                            </div>
                            <span className='absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-pulse'></span>
                        </div>
                        <div>
                            <div className='flex items-center gap-2'>
                                <h3 className='font-bold text-base tracking-tight text-white'>Zen</h3>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                    isCaptain 
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                        : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                                }`}>
                                    {isCaptain ? 'Captain AI Copilot' : 'Rider AI Copilot'}
                                </span>
                            </div>
                            <p className='text-xs text-slate-400'>
                                {isCaptain ? 'Shift Analytics & Live Route Telemetry' : 'Real-time Telemetry & DB Tool Calling'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className='h-9 w-9 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full flex items-center justify-center transition-colors'
                        aria-label="Close Zen Assistant"
                    >
                        <X className='h-5 w-5' />
                    </button>
                </div>

                {/* Quick Action Chips Carousel */}
                <div className='bg-slate-50/90 border-b border-slate-100 px-3 py-2.5 overflow-x-auto flex gap-2 no-scrollbar'>
                    {activePrompts.map((prompt, idx) => {
                        const IconComponent = prompt.icon;
                        return (
                            <button
                                key={idx}
                                onClick={() => handleSend(prompt.label)}
                                className={`flex-shrink-0 text-xs font-medium bg-white border rounded-full px-3 py-1.5 transition-all shadow-sm flex items-center gap-1.5 ${
                                    isCaptain 
                                        ? 'hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border-slate-200 hover:border-emerald-300'
                                        : 'hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border-slate-200 hover:border-indigo-300'
                                }`}
                            >
                                <IconComponent className={`h-3.5 w-3.5 ${isCaptain ? 'text-emerald-600' : 'text-indigo-600'}`} />
                                <span>{prompt.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Chat Messages Body */}
                <div className='flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40'>
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                        >
                            <div
                                className={`max-w-[90%] rounded-2xl p-4 text-sm shadow-sm leading-relaxed ${
                                    msg.sender === 'user'
                                        ? isCaptain 
                                            ? 'bg-emerald-700 text-white rounded-br-none' 
                                            : 'bg-indigo-600 text-white rounded-br-none'
                                        : 'bg-white text-slate-800 rounded-bl-none border border-slate-200/80'
                                }`}
                            >
                                <div className='whitespace-pre-wrap font-normal'>{msg.text}</div>

                                {/* ── Rider Card: Driver Location ── */}
                                {msg.cardType === 'driver_location' && msg.cardData && (
                                    <div className='mt-3 pt-3 border-t border-slate-100 bg-indigo-50/60 rounded-xl p-3 text-xs space-y-1.5'>
                                        <div className='flex items-center justify-between font-semibold text-slate-900'>
                                            <span className='flex items-center gap-1.5 text-indigo-700 font-bold'>
                                                <Car className='h-4 w-4' /> {msg.cardData.driverName}
                                            </span>
                                            <span className='bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px] uppercase'>
                                                {msg.cardData.status}
                                            </span>
                                        </div>
                                        <div className='text-slate-600 flex justify-between'>
                                            <span>Vehicle: {msg.cardData.vehicle?.color} {msg.cardData.vehicle?.vehicleType}</span>
                                            <span className='font-mono font-bold'>{msg.cardData.vehicle?.plate}</span>
                                        </div>
                                        <div className='flex items-center justify-between pt-1 border-t border-indigo-100 text-indigo-900 font-semibold'>
                                            <span>Distance from pickup:</span>
                                            <span>~{msg.cardData.distanceFromPickupKm} km</span>
                                        </div>
                                        <div className='flex items-center justify-between text-indigo-900 font-bold'>
                                            <span>Driver Arrival ETA:</span>
                                            <span className='text-emerald-600 text-sm font-black'>~{msg.cardData.pickupEtaMinutes} mins</span>
                                        </div>
                                    </div>
                                )}

                                {/* ── Rider Card: Driver Details ── */}
                                {msg.cardType === 'driver_details' && msg.cardData?.driver && (
                                    <div className='mt-3 pt-3 border-t border-slate-100 bg-slate-50 rounded-xl p-3 text-xs space-y-2'>
                                        <div className='flex items-center justify-between'>
                                            <span className='font-bold text-slate-900 text-sm'>{msg.cardData.driver.name}</span>
                                            <span className='flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold text-[11px]'>
                                                <Star className='h-3 w-3 fill-amber-500 text-amber-500' /> {msg.cardData.driver.rating}
                                            </span>
                                        </div>
                                        <div className='text-slate-600 space-y-1'>
                                            <div>Vehicle: <span className='font-medium text-slate-800'>{msg.cardData.driver.vehicle?.color} {msg.cardData.driver.vehicle?.vehicleType}</span></div>
                                            <div>Plate: <span className='font-mono font-bold text-slate-800'>{msg.cardData.driver.vehicle?.plate}</span></div>
                                            {msg.cardData.driver.phone && (
                                                <div className='flex items-center gap-1 text-indigo-600 font-medium pt-1'>
                                                    <Phone className='h-3 w-3' /> {msg.cardData.driver.phone}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* ── Rider Card: ETA Breakdown ── */}
                                {msg.cardType === 'eta' && msg.cardData?.eta && (
                                    <div className='mt-3 pt-3 border-t border-slate-100 bg-emerald-50/60 rounded-xl p-3 text-xs space-y-2'>
                                        <div className='flex items-center justify-between font-bold text-emerald-900'>
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
                                                <span>Trip to destination:</span>
                                                <span className='font-semibold text-slate-800'>~{msg.cardData.eta.tripDurationMinutes || 12} mins</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── Rider Card: Fare Explanation ── */}
                                {msg.cardType === 'fare_explanation' && msg.cardData && (
                                    <div className='mt-3 pt-3 border-t border-slate-100 bg-amber-50/60 rounded-xl p-3 text-xs space-y-2 border border-amber-200/60'>
                                        <div className='flex items-center justify-between font-bold text-amber-950'>
                                            <span className='flex items-center gap-1'>
                                                <DollarSign className='h-3.5 w-3.5 text-amber-600' /> Transparent Fare Math
                                            </span>
                                            <span className='text-[11px] font-black text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-full'>
                                                ₹{msg.cardData.finalFare}
                                            </span>
                                        </div>
                                        <div className='space-y-1 text-slate-700'>
                                            <div className='flex justify-between'>
                                                <span>Base Fare:</span>
                                                <span className='font-semibold'>₹{msg.cardData.baseFare}</span>
                                            </div>
                                            <div className='flex justify-between'>
                                                <span>Distance ({msg.cardData.distanceKm} km @ ₹{msg.cardData.distanceRatePerKm}/km):</span>
                                                <span className='font-semibold'>₹{msg.cardData.distanceCharge}</span>
                                            </div>
                                            <div className='flex justify-between'>
                                                <span>Duration ({msg.cardData.durationMinutes} mins @ ₹{msg.cardData.durationRatePerMin}/min):</span>
                                                <span className='font-semibold'>₹{msg.cardData.durationCharge}</span>
                                            </div>
                                            <div className='flex justify-between pt-1 border-t border-amber-200 text-amber-900 font-bold'>
                                                <span>Surge Multiplier:</span>
                                                <span>{msg.cardData.surgeMultiplier}x ({msg.cardData.surgeReason})</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── Driver Card: Passenger Pickup ── */}
                                {msg.cardType === 'driver_pickup' && msg.cardData && (
                                    <div className='mt-3 pt-3 border-t border-slate-100 bg-emerald-50/70 rounded-xl p-3 text-xs space-y-2 border border-emerald-200/60'>
                                        <div className='flex items-center justify-between font-bold text-emerald-950'>
                                            <span className='flex items-center gap-1.5'>
                                                <MapPin className='h-4 w-4 text-emerald-600' /> {msg.cardData.rider?.name}
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
                                            <div className='flex items-center justify-between font-bold text-emerald-950'>
                                                <span>Arrival Time:</span>
                                                <span className='text-emerald-700 text-sm'>~{msg.cardData.etaMinutesToPickup} mins</span>
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
                                    <div className='mt-3 pt-3 border-t border-slate-100 bg-teal-50/70 rounded-xl p-3 text-xs space-y-2 border border-teal-200/60'>
                                        <div className='flex items-center justify-between font-bold text-teal-950'>
                                            <span className='flex items-center gap-1'>
                                                <TrendingUp className='h-4 w-4 text-teal-600' /> Daily Shift Earnings
                                            </span>
                                            <span className='text-sm font-black text-teal-700 bg-teal-200/70 px-2 py-0.5 rounded-full'>
                                                ₹{msg.cardData.totalEarningsToday}
                                            </span>
                                        </div>
                                        <div className='grid grid-cols-2 gap-2 pt-1'>
                                            <div className='bg-white p-2 rounded-lg border border-teal-100'>
                                                <div className='text-[10px] text-slate-500'>Trips Completed</div>
                                                <div className='text-sm font-bold text-slate-900'>{msg.cardData.totalRidesToday}</div>
                                            </div>
                                            <div className='bg-white p-2 rounded-lg border border-teal-100'>
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
                                    <div className='mt-3 pt-3 border-t border-slate-100 bg-slate-50 rounded-xl p-3 text-xs space-y-2 border border-slate-200'>
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

                                {/* Source & Telemetry Attribution */}
                                {msg.source && (
                                    <div className='mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400'>
                                        <span className={`flex items-center gap-1 font-medium ${isCaptain ? 'text-emerald-700' : 'text-indigo-600'}`}>
                                            <Sparkles className='h-3 w-3' /> Live DB Telemetry
                                        </span>
                                        <span className='font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500'>
                                            {msg.source}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <span className='text-[10px] text-slate-400 mt-1 px-1'>{msg.time}</span>
                        </div>
                    ))}

                    {loading && (
                        <div className={`flex items-center gap-2 text-xs font-medium p-2 rounded-xl w-fit border ${
                            isCaptain 
                                ? 'text-emerald-700 bg-emerald-50/70 border-emerald-200' 
                                : 'text-indigo-600 bg-indigo-50/70 border-indigo-100'
                        }`}>
                            <div className={`h-4 w-4 border-2 border-t-transparent rounded-full animate-spin ${
                                isCaptain ? 'border-emerald-600' : 'border-indigo-600'
                            }`}></div>
                            <span>Zen is querying live trip telemetry & dispatch DB...</span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Bottom Input Field */}
                <div className='p-3 sm:p-4 border-t border-slate-100 bg-white'>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSend();
                        }}
                        className='flex items-center gap-2'
                    >
                        <input
                            type='text'
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={isCaptain 
                                ? 'Ask Zen: "Where is my rider?", "Today\'s earnings?", "My acceptance rate"...'
                                : 'Ask Zen: "Where is my driver?", "What\'s my ETA?", "Why was surge applied?"...'
                            }
                            className={`flex-1 bg-slate-50 border text-sm rounded-xl px-4 py-3 outline-none transition-all placeholder:text-slate-400 ${
                                isCaptain 
                                    ? 'border-slate-200 focus:border-emerald-500 focus:bg-white' 
                                    : 'border-slate-200 focus:border-indigo-500 focus:bg-white'
                            }`}
                        />
                        <button
                            type='submit'
                            disabled={!input.trim() || loading}
                            className={`h-11 w-11 text-white rounded-xl flex items-center justify-center transition-all shadow-md disabled:opacity-40 flex-shrink-0 ${
                                isCaptain 
                                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' 
                                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                            }`}
                            aria-label="Send message"
                        >
                            <Send className='h-4 w-4' />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SupportAssistantModal;
