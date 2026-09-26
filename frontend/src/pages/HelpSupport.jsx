import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
    HelpCircle, 
    Bot, 
    Sparkles, 
    Phone, 
    Mail, 
    Shield, 
    ChevronDown, 
    ChevronUp, 
    MessageSquare, 
    Clock, 
    CheckCircle2, 
    AlertCircle 
} from 'lucide-react';
import SupportAssistantModal from '../components/SupportAssistantModal';
import { notyf } from '../utils/notyf';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const FAQS = [
    {
        q: 'How does Drivo calculate upfront fares?',
        a: 'Drivo uses dynamic telemetry algorithms that factor in precise road distance, predicted travel duration, real-time traffic congestion, and local vehicle supply. The fare shown before booking is transparent and guaranteed.'
    },
    {
        q: 'What should I do if I left an item in the car/cab?',
        a: 'Go to "My Bookings" in the navbar, select the specific trip, and click "Contact Captain". Alternatively, reach our 24/7 Safety Desk immediately at 1800-DRIVO-CARE (1800-374-8622) with your trip reference.'
    },
    {
        q: 'How do cancellation fees work?',
        a: 'Cancellations made within 3 minutes of a captain accepting your request are 100% free of charge. If a driver has already driven a significant distance towards your pickup location, a nominal standard cancellation charge may apply.'
    },
    {
        q: 'How does the Drivo Safety Shield protect my trip?',
        a: 'Every ride features real-time GPS telemetry, verified driver background checks, OTP verification before ride commencement, and a direct one-tap Emergency SOS route to local authorities and Drivo safety teams.'
    },
    {
        q: 'How do I redeem promo coupons and wallet credits?',
        a: 'Navigate to "Offers" in the navbar to find and copy active promo codes like DRIVO50. You can paste or select any coupon code on the ride confirmation panel before requesting your captain.'
    }
];

const HelpSupport = () => {
    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [openFaq, setOpenFaq] = useState(0);

    // Ticket form state
    const [ticketCategory, setTicketCategory] = useState('billing');
    const [ticketSubject, setTicketSubject] = useState('');
    const [ticketMessage, setTicketMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleTicketSubmit = (e) => {
        e.preventDefault();
        if (!ticketSubject || !ticketMessage) {
            notyf.error('Please enter a subject and message');
            return;
        }

        setSubmitting(true);
        setTimeout(() => {
            setSubmitting(false);
            notyf.success('Support ticket created! Ticket ID #DRV-84920');
            setTicketSubject('');
            setTicketMessage('');
        }, 800);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col">
            <Navbar />
            <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-5xl mx-auto space-y-8">

                {/* Top Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
                    <div>
                        <div className="flex items-center gap-2 text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">
                            <HelpCircle className="h-4 w-4" />
                            <span>Customer Care & FAQs</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                            Help & Support Center
                        </h1>
                        <p className="text-slate-400 text-xs sm:text-sm mt-1">
                            Find answers, connect with 24/7 Drivo Care, or chat directly with our AI dispatch assistant.
                        </p>
                    </div>

                    <button
                        onClick={() => setAiModalOpen(true)}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/25 hover:scale-105 active:scale-95 transition-all"
                    >
                        <Bot className="h-4 w-4" />
                        <span>Chat with Drivo AI</span>
                        <Sparkles className="h-3.5 w-3.5" />
                    </button>
                </div>

                {/* AI Assistant Banner */}
                <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl backdrop-blur-xl">
                    <div className="space-y-2 max-w-xl">
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span className="text-[11px] uppercase tracking-wider font-bold text-blue-300">
                                24/7 AI Operations Copilot
                            </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                            Instant AI Solutions for Any Trip Issue
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                            Need help locating a driver, calculating an estimated fare, understanding a cancellation charge, or tracking a route? Our AI agent is available 24/7.
                        </p>
                    </div>

                    <button
                        onClick={() => setAiModalOpen(true)}
                        className="px-6 py-3 bg-white text-slate-950 font-bold rounded-2xl text-xs sm:text-sm shadow-xl hover:bg-slate-100 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 flex-shrink-0"
                    >
                        <Bot className="h-4 w-4 text-blue-600" />
                        <span>Launch Assistant</span>
                    </button>
                </div>

                {/* Contact Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl space-y-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                            <Phone className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-sm">24/7 Hotline</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Instant phone assistance for ongoing trips</p>
                        </div>
                        <a
                            href="tel:18003748622"
                            className="inline-block text-xs font-bold text-blue-400 hover:text-blue-300"
                        >
                            1800-DRIVO-CARE (Toll Free)
                        </a>
                    </div>

                    <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl space-y-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                            <Mail className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-sm">Email Support</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Inquiries, receipts & account inquiries</p>
                        </div>
                        <a
                            href="mailto:support@drivo.com"
                            className="inline-block text-xs font-bold text-emerald-400 hover:text-emerald-300"
                        >
                            support@drivo.com
                        </a>
                    </div>

                    <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl space-y-3">
                        <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
                            <Shield className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-sm">Safety Response</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Emergency SOS & incident intervention</p>
                        </div>
                        <span className="inline-block text-xs font-bold text-rose-400">
                            Available 24x7 In-App SOS
                        </span>
                    </div>
                </div>

                {/* FAQs and Support Ticket Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                    
                    {/* FAQ Accordion */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                            <span>Frequently Asked Questions</span>
                        </h3>

                        <div className="space-y-3">
                            {FAQS.map((faq, index) => {
                                const isOpen = openFaq === index;
                                return (
                                    <div
                                        key={index}
                                        className="border border-white/10 rounded-2xl bg-slate-900/50 overflow-hidden transition-all"
                                    >
                                        <button
                                            onClick={() => setOpenFaq(isOpen ? -1 : index)}
                                            className="w-full p-4 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-bold text-white hover:bg-white/5 transition-colors"
                                        >
                                            <span>{faq.q}</span>
                                            {isOpen ? (
                                                <ChevronUp className="h-4 w-4 text-blue-400 flex-shrink-0" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                            )}
                                        </button>
                                        {isOpen && (
                                            <div className="px-4 pb-4 text-xs text-slate-400 leading-relaxed border-t border-white/5 pt-2">
                                                {faq.a}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Support Ticket Submission */}
                    <div className="p-6 bg-slate-900/70 border border-white/10 rounded-3xl space-y-4 backdrop-blur-xl">
                        <div className="space-y-1">
                            <h3 className="text-lg font-black text-white">Create a Support Ticket</h3>
                            <p className="text-xs text-slate-400">Our customer care specialist will respond within 2 hours.</p>
                        </div>

                        <form onSubmit={handleTicketSubmit} className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Issue Category</label>
                                <select
                                    value={ticketCategory}
                                    onChange={(e) => setTicketCategory(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="billing" className="bg-slate-900 text-white">Fare & Billing Inquiry</option>
                                    <option value="lost-item" className="bg-slate-900 text-white">Lost Property in Vehicle</option>
                                    <option value="driver" className="bg-slate-900 text-white">Driver Behavior or Feedback</option>
                                    <option value="app" className="bg-slate-900 text-white">App / Payment Glitch</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Subject</label>
                                <input
                                    type="text"
                                    value={ticketSubject}
                                    onChange={(e) => setTicketSubject(e.target.value)}
                                    placeholder="Brief summary of the issue..."
                                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Details</label>
                                <textarea
                                    rows="3"
                                    value={ticketMessage}
                                    onChange={(e) => setTicketMessage(e.target.value)}
                                    placeholder="Describe your issue with ride ID or location..."
                                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-blue-600/20"
                            >
                                {submitting ? 'Submitting Ticket...' : 'Submit Support Request'}
                            </button>
                        </form>
                    </div>

                </div>

                </div>
            </main>

            <Footer />

            {/* AI Assistant Modal Integration */}
            <SupportAssistantModal
                isOpen={aiModalOpen}
                onClose={() => setAiModalOpen(false)}
                userType="user"
            />
        </div>
    );
};

export default HelpSupport;
