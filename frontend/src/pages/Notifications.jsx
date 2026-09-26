import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
    Bell, 
    CheckCircle2, 
    Car, 
    Tag, 
    ShieldCheck, 
    Trash2, 
    ArrowRight, 
    Sparkles, 
    Clock 
} from 'lucide-react';
import { notyf } from '../utils/notyf';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const INITIAL_NOTIFICATIONS = [
    {
        id: 1,
        title: '50% Welcome Discount Available',
        message: 'Use code DRIVO50 on your next booking to enjoy up to ₹120 off across any vehicle class.',
        category: 'offers',
        time: '15 mins ago',
        unread: true,
        actionLink: '/offers',
        actionLabel: 'View Offer'
    },
    {
        id: 2,
        title: 'Real-Time Telemetry & Safety Active',
        message: 'Your Drivo account is protected by 24/7 AI-monitored GPS route verification and emergency SOS routing.',
        category: 'safety',
        time: '3 hours ago',
        unread: true,
        actionLink: '/support',
        actionLabel: 'Safety Center'
    },
    {
        id: 3,
        title: 'Last Journey Receipt Generated',
        message: 'Your trip from Salt Lake Sector V to Park Street has been billed for ₹285. Invoice is ready for download.',
        category: 'rides',
        time: 'Yesterday at 6:42 PM',
        unread: false,
        actionLink: '/my-rides',
        actionLabel: 'View Receipt'
    },
    {
        id: 4,
        title: 'Weekend Surge Free Zone',
        message: 'Zero surge pricing is currently in effect around New Town and Sector V till midnight.',
        category: 'offers',
        time: '2 days ago',
        unread: false,
        actionLink: '/home',
        actionLabel: 'Book Now'
    },
    {
        id: 5,
        title: 'Payment Method Verified',
        message: 'Your payment profile has been successfully linked with one-click UPI checkout.',
        category: 'system',
        time: '3 days ago',
        unread: false,
        actionLink: '/payments',
        actionLabel: 'Wallet & Cards'
    }
];

const Notifications = () => {
    const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
    const [filter, setFilter] = useState('all');

    const markAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
        notyf.success('All notifications marked as read');
    };

    const clearAll = () => {
        setNotifications([]);
        notyf.success('Notifications cleared');
    };

    const deleteNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const filtered = notifications.filter(n => {
        if (filter === 'all') return true;
        return n.category === filter;
    });

    const unreadCount = notifications.filter(n => n.unread).length;

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col">
            <Navbar />
            <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
                    <div>
                        <div className="flex items-center gap-2 text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">
                            <Bell className="h-4 w-4" />
                            <span>Activity & Updates</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                                Notifications
                            </h1>
                            {unreadCount > 0 && (
                                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                    {unreadCount} unread
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {notifications.length > 0 && (
                            <>
                                <button
                                    onClick={markAllRead}
                                    className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all"
                                >
                                    Mark all read
                                </button>
                                <button
                                    onClick={clearAll}
                                    className="p-2 text-slate-400 hover:text-rose-400 bg-white/5 hover:bg-rose-500/10 border border-white/10 rounded-xl transition-all"
                                    title="Clear All Notifications"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap gap-2">
                    {[
                        { key: 'all', label: 'All Notifications' },
                        { key: 'rides', label: 'Trips & Rides' },
                        { key: 'offers', label: 'Promos & Offers' },
                        { key: 'safety', label: 'Safety & Alerts' },
                        { key: 'system', label: 'System' },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setFilter(tab.key)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                                filter === tab.key
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                                    : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Notifications List */}
                {filtered.length === 0 ? (
                    <div className="text-center py-20 px-4 bg-white/5 border border-white/10 rounded-3xl space-y-3">
                        <div className="h-14 w-14 bg-white/5 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                            <Bell className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-bold text-white">No notifications in this category</h3>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                            You're all caught up! Important ride updates, promo vouchers, and safety alerts will appear here.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map((item) => (
                            <div
                                key={item.id}
                                className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                                    item.unread
                                        ? 'bg-slate-900/90 border-blue-500/30 shadow-lg'
                                        : 'bg-slate-900/40 border-white/5 hover:bg-slate-900/70'
                                }`}
                            >
                                <div className="flex items-start gap-3.5">
                                    <div className="mt-0.5">
                                        {item.category === 'offers' ? (
                                            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                                                <Tag className="h-5 w-5" />
                                            </div>
                                        ) : item.category === 'rides' ? (
                                            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                                                <Car className="h-5 w-5" />
                                            </div>
                                        ) : (
                                            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                                                <ShieldCheck className="h-5 w-5" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-bold text-white">{item.title}</h4>
                                            {item.unread && (
                                                <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                                            {item.message}
                                        </p>
                                        <span className="text-[11px] text-slate-500 block">{item.time}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-center">
                                    {item.actionLink && (
                                        <Link
                                            to={item.actionLink}
                                            className="px-3.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded-xl text-xs font-semibold inline-flex items-center gap-1 transition-all"
                                        >
                                            <span>{item.actionLabel}</span>
                                            <ArrowRight className="h-3 w-3" />
                                        </Link>
                                    )}

                                    <button
                                        onClick={() => deleteNotification(item.id)}
                                        className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
                                        title="Dismiss"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

            </div>
            </main>

            <Footer />
        </div>
    );
};

export default Notifications;
