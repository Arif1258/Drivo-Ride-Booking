import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Bot, Send, X, ShieldAlert, Sparkles, HelpCircle, PhoneCall, CheckCircle } from 'lucide-react';

const QUICK_PROMPTS = [
    "Why was I charged a cancellation fee?",
    "What is the refund policy?",
    "How are ride fares calculated?",
    "I forgot an item in my last ride",
    "How does AI driver matching work?"
];

const SupportAssistantModal = ({ isOpen, onClose, userType = 'user' }) => {
    const [messages, setMessages] = useState([
        {
            sender: 'ai',
            text: "Hello! I am **Drivo AI Support Assistant**. I can help you with trip details, fare breakdowns, cancellation rules, refunds, and lost items. How can I assist you today?",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
                actions: response.data.suggestedActions || [],
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            setMessages(prev => [...prev, aiReply]);
        } catch (err) {
            setMessages(prev => [
                ...prev,
                {
                    sender: 'ai',
                    text: "I'm temporarily having trouble connecting to support services. Please contact our 24/7 helpline at support@drivo.com or call +91-1800-DRIVO.",
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className='fixed inset-0 z-[999] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4'>
            <div className='bg-white text-slate-900 w-full sm:max-w-lg h-[85vh] sm:h-[650px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100'>
                {/* Header */}
                <div className='bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                        <div className='h-10 w-10 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30'>
                            <Bot className='h-5 w-5 text-white' />
                        </div>
                        <div>
                            <div className='flex items-center gap-2'>
                                <h3 className='font-bold text-base tracking-tight'>Drivo AI Support</h3>
                                <span className='inline-flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full'>
                                    <span className='h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse'></span> Context-Aware
                                </span>
                            </div>
                            <p className='text-xs text-slate-400'>Policy grounded • Ride history synced</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className='h-9 w-9 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full flex items-center justify-center transition-colors'
                    >
                        <X className='h-5 w-5' />
                    </button>
                </div>

                {/* Quick Prompts Carousel */}
                <div className='bg-slate-50 border-b border-slate-100 p-2.5 overflow-x-auto flex gap-2 no-scrollbar'>
                    {QUICK_PROMPTS.map((prompt, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSend(prompt)}
                            className='flex-shrink-0 text-xs font-semibold bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-full px-3 py-1.5 transition-all shadow-sm'
                        >
                            {prompt}
                        </button>
                    ))}
                </div>

                {/* Chat Messages */}
                <div className='flex-1 overflow-y-auto p-4 space-y-4'>
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                        >
                            <div
                                className={`max-w-[85%] rounded-2xl p-3.5 text-sm shadow-sm leading-relaxed ${
                                    msg.sender === 'user'
                                        ? 'bg-blue-600 text-white rounded-br-none'
                                        : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200'
                                }`}
                            >
                                <div className='whitespace-pre-wrap'>{msg.text}</div>
                                {msg.confidence && (
                                    <div className='mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500'>
                                        <span className='flex items-center gap-1'>
                                            <Sparkles className='h-3 w-3 text-blue-500' /> Grounded Policy Answer
                                        </span>
                                        <span className='font-mono'>{(msg.confidence * 100).toFixed(0)}% match</span>
                                    </div>
                                )}
                            </div>
                            <span className='text-[10px] text-slate-400 mt-1 px-1'>{msg.time}</span>
                        </div>
                    ))}

                    {loading && (
                        <div className='flex items-center gap-2 text-xs text-slate-500 p-2'>
                            <div className='h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin'></div>
                            <span>Inspecting trip context & policies...</span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Bottom Input */}
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
                            placeholder='Ask about your ride, fares, refunds, or policies...'
                            className='flex-1 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-sm rounded-xl px-4 py-3 outline-none transition-all'
                        />
                        <button
                            type='submit'
                            disabled={!input.trim() || loading}
                            className='h-11 w-11 bg-black hover:bg-slate-900 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-all shadow-md flex-shrink-0'
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
