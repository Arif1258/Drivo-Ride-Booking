import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
    Bot, Send, X, Sparkles, Navigation, Clock, 
    UserCheck, DollarSign, Ban, History, Shield, Car, Phone, Star, MapPin
} from 'lucide-react';

const QUICK_PROMPTS = [
    { label: "Where is my driver?", icon: Navigation },
    { label: "What's my ETA?", icon: Clock },
    { label: "Who is my driver?", icon: UserCheck },
    { label: "What is my ride status?", icon: Car },
    { label: "How much will my ride cost?", icon: DollarSign },
    { label: "Cancel my ride", icon: Ban },
    { label: "Show me my latest ride", icon: History }
];

const SupportAssistantModal = ({ isOpen, onClose, userType = 'user' }) => {
    const [messages, setMessages] = useState([
        {
            sender: 'ai',
            text: "👋 Hi! I'm **Zen**, your AI Ride Assistant. Powered by live telemetry and smart dispatch tools, I can look up your driver's real-time location, arrival ETA, fare breakdown, or assist with cancellations & policies.\n\nHow can I help you right now?",
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
            const token = localStorage.getItem(userType === 'captain' ? 'captain-token' : 'token');
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
        <div className='fixed inset-0 z-[999] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4'>
            <div className='bg-white text-slate-900 w-full sm:max-w-lg h-[88vh] sm:h-[680px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100'>
                {/* Header */}
                <div className='bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shadow-md'>
                    <div className='flex items-center gap-3'>
                        <div className='relative'>
                            <div className='h-11 w-11 bg-gradient-to-tr from-blue-500 via-indigo-600 to-violet-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-2 ring-white/10'>
                                <Bot className='h-6 w-6 text-white' />
                            </div>
                            <span className='absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-pulse'></span>
                        </div>
                        <div>
                            <div className='flex items-center gap-2'>
                                <h3 className='font-bold text-base tracking-tight text-white'>Zen</h3>
                                <span className='text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded-full border border-indigo-500/30'>
                                    AI Ride Copilot
                                </span>
                            </div>
                            <p className='text-xs text-slate-400'>Real-time Telemetry & DB Tool Calling</p>
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
                <div className='bg-slate-50/80 border-b border-slate-100 px-3 py-2.5 overflow-x-auto flex gap-2 no-scrollbar'>
                    {QUICK_PROMPTS.map((prompt, idx) => {
                        const IconComponent = prompt.icon;
                        return (
                            <button
                                key={idx}
                                onClick={() => handleSend(prompt.label)}
                                className='flex-shrink-0 text-xs font-medium bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 rounded-full px-3 py-1.5 transition-all shadow-sm flex items-center gap-1.5'
                            >
                                <IconComponent className='h-3.5 w-3.5 text-indigo-500' />
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
                                className={`max-w-[88%] rounded-2xl p-4 text-sm shadow-sm leading-relaxed ${
                                    msg.sender === 'user'
                                        ? 'bg-indigo-600 text-white rounded-br-none'
                                        : 'bg-white text-slate-800 rounded-bl-none border border-slate-200/80'
                                }`}
                            >
                                <div className='whitespace-pre-wrap'>{msg.text}</div>

                                {/* Rich Visual Card: Driver Location */}
                                {msg.cardType === 'driver_location' && msg.cardData && (
                                    <div className='mt-3 pt-3 border-t border-slate-100 bg-indigo-50/50 rounded-xl p-3 text-xs space-y-1.5'>
                                        <div className='flex items-center justify-between font-semibold text-slate-900'>
                                            <span className='flex items-center gap-1.5 text-indigo-700'>
                                                <Car className='h-4 w-4' /> {msg.cardData.driverName}
                                            </span>
                                            <span className='bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px] uppercase'>
                                                {msg.cardData.status}
                                            </span>
                                        </div>
                                        <div className='text-slate-600 flex justify-between'>
                                            <span>Vehicle: {msg.cardData.vehicle?.color} {msg.cardData.vehicle?.vehicleType}</span>
                                            <span className='font-mono font-medium'>{msg.cardData.vehicle?.plate}</span>
                                        </div>
                                        <div className='flex items-center justify-between pt-1 border-t border-indigo-100 text-indigo-900 font-semibold'>
                                            <span>Distance from pickup:</span>
                                            <span>~{msg.cardData.distanceFromPickupKm} km</span>
                                        </div>
                                        <div className='flex items-center justify-between text-indigo-900 font-bold'>
                                            <span>Driver Arrival ETA:</span>
                                            <span className='text-emerald-600 text-sm'>~{msg.cardData.pickupEtaMinutes} mins</span>
                                        </div>
                                    </div>
                                )}

                                {/* Rich Visual Card: Driver Details */}
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

                                {/* Rich Visual Card: ETA Breakdown */}
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

                                {/* Confidence & Source Tag */}
                                {msg.source && (
                                    <div className='mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400'>
                                        <span className='flex items-center gap-1 text-indigo-600 font-medium'>
                                            <Sparkles className='h-3 w-3' /> Drivo Live DB
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
                        <div className='flex items-center gap-2 text-xs text-indigo-600 font-medium p-2 bg-indigo-50/60 rounded-xl w-fit border border-indigo-100'>
                            <div className='h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin'></div>
                            <span>Zen is querying live trip telemetry & tools...</span>
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
                            placeholder='Ask Zen: "Where is my driver?", "What is my ETA?", "Cancel ride"...'
                            className='flex-1 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white text-sm rounded-xl px-4 py-3 outline-none transition-all placeholder:text-slate-400'
                        />
                        <button
                            type='submit'
                            disabled={!input.trim() || loading}
                            className='h-11 w-11 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-all shadow-md shadow-indigo-600/20 flex-shrink-0'
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
