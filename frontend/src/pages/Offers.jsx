import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
    Tag, 
    Sparkles, 
    Copy, 
    Check, 
    Clock, 
    Car, 
    Shield, 
    Gift, 
    ArrowRight, 
    Zap, 
    Percent 
} from 'lucide-react';
import { notyf } from '../utils/notyf';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const OFFERS = [
    {
        id: 'promo-1',
        code: 'DRIVO50',
        title: '50% Off First 3 Journeys',
        description: 'New rider welcome discount. Enjoy seamless urban travel with maximum savings.',
        discount: '50% OFF',
        maxSavings: 'Up to ₹120',
        validUntil: 'Valid until Oct 31, 2026',
        vehicleType: 'All Vehicles',
        minAmount: '₹99',
        badgeColor: 'from-blue-600 to-indigo-600'
    },
    {
        id: 'promo-2',
        code: 'WEEKEND20',
        title: 'Weekend Explorer Bonus',
        description: 'Enjoy 20% cashback on all city weekend trips between Friday 6 PM and Sunday midnight.',
        discount: '20% OFF',
        maxSavings: 'Up to ₹80',
        validUntil: 'Every Fri - Sun',
        vehicleType: 'Car & Auto',
        minAmount: '₹149',
        badgeColor: 'from-purple-600 to-pink-600'
    },
    {
        id: 'promo-3',
        code: 'MOTOFAST',
        title: 'Rush Hour Express Bike',
        description: 'Beat heavy city traffic with nimble two-wheeler rides at lowest fixed rates.',
        discount: 'FLAT ₹30 OFF',
        maxSavings: 'Flat ₹30',
        validUntil: 'Daily 8 AM - 11 AM, 5 PM - 9 PM',
        vehicleType: 'Moto',
        minAmount: '₹60',
        badgeColor: 'from-amber-500 to-orange-500'
    },
    {
        id: 'promo-4',
        code: 'AIRPORTDROP',
        title: 'Airport Terminal Shuttle',
        description: 'Comfortable air-conditioned sedan rides to and from Kolkata NSCB International Airport.',
        discount: '25% OFF',
        maxSavings: 'Up to ₹200',
        validUntil: 'Valid on Airport routes',
        vehicleType: 'Sedan / SUV',
        minAmount: '₹299',
        badgeColor: 'from-emerald-500 to-teal-600'
    }
];

const Offers = () => {
    const [copiedCode, setCopiedCode] = useState('');

    const handleCopy = (code) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        notyf.success(`Promo code "${code}" copied!`);
        setTimeout(() => setCopiedCode(''), 3000);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col">
            <Navbar />
            <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
                    <div>
                        <div className="flex items-center gap-2 text-xs text-amber-400 font-bold uppercase tracking-wider mb-1">
                            <Tag className="h-4 w-4" />
                            <span>Exclusive Promotions</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                            Offers & Promo Codes
                        </h1>
                        <p className="text-slate-400 text-xs sm:text-sm mt-1">
                            Save on every journey. Apply these active discount codes when requesting your ride.
                        </p>
                    </div>

                    <Link
                        to="/home"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-blue-500/25 hover:scale-105 active:scale-95 transition-all"
                    >
                        <Car className="h-4 w-4" />
                        <span>Book Ride with Offer</span>
                    </Link>
                </div>

                {/* Referral Program Banner */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900/60 via-indigo-900/40 to-slate-900 border border-blue-500/30 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="space-y-2 max-w-xl">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-bold border border-blue-500/30">
                                <Gift className="h-3.5 w-3.5 text-blue-400" />
                                <span>Referral Rewards</span>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                Invite Friends, Earn ₹150 Drivo Cash
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                                Give your friends 50% off their first ride. When they complete their trip, you'll receive ₹150 directly in your Drivo Wallet balance!
                            </p>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-950/80 border border-white/10 p-2 rounded-2xl">
                            <div className="px-3.5 py-1.5">
                                <span className="text-[10px] text-slate-400 uppercase font-bold block">Your Referral Code</span>
                                <span className="text-sm font-black font-mono text-white tracking-wider">DRIVO-HERO99</span>
                            </div>
                            <button
                                onClick={() => handleCopy('DRIVO-HERO99')}
                                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                            >
                                {copiedCode === 'DRIVO-HERO99' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                <span>{copiedCode === 'DRIVO-HERO99' ? 'Copied' : 'Copy'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Promo Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {OFFERS.map((offer) => (
                        <div
                            key={offer.id}
                            className="p-6 bg-slate-900/60 hover:bg-slate-900 border border-white/10 hover:border-blue-500/30 rounded-3xl transition-all duration-200 shadow-xl backdrop-blur-md flex flex-col justify-between space-y-6"
                        >
                            {/* Card Top */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-gradient-to-r ${offer.badgeColor} text-white shadow-md`}>
                                        {offer.discount}
                                    </span>
                                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                        <Clock className="h-3.5 w-3.5" />
                                        {offer.validUntil}
                                    </span>
                                </div>

                                <div>
                                    <h3 className="text-lg font-black text-white">{offer.title}</h3>
                                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                        {offer.description}
                                    </p>
                                </div>

                                {/* Terms chips */}
                                <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-slate-400">
                                    <span className="px-2.5 py-1 bg-white/5 border border-white/5 rounded-lg">
                                        Max: <strong className="text-slate-200">{offer.maxSavings}</strong>
                                    </span>
                                    <span className="px-2.5 py-1 bg-white/5 border border-white/5 rounded-lg">
                                        Min Order: <strong className="text-slate-200">{offer.minAmount}</strong>
                                    </span>
                                    <span className="px-2.5 py-1 bg-white/5 border border-white/5 rounded-lg">
                                        {offer.vehicleType}
                                    </span>
                                </div>
                            </div>

                            {/* Card Bottom: Code & Action */}
                            <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="px-3.5 py-1.5 bg-white/5 border border-dashed border-white/20 rounded-xl font-mono font-bold text-sm text-blue-400 tracking-wider">
                                        {offer.code}
                                    </span>
                                    <button
                                        onClick={() => handleCopy(offer.code)}
                                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all"
                                        title="Copy Coupon Code"
                                    >
                                        {copiedCode === offer.code ? (
                                            <Check className="h-4 w-4 text-emerald-400" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>

                                <Link
                                    to="/home"
                                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300"
                                >
                                    <span>Apply in Ride</span>
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
            </main>

            <Footer />
        </div>
    );
};

export default Offers;
