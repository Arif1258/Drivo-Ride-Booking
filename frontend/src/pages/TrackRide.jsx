import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
    Navigation, 
    Car, 
    MapPin, 
    Phone, 
    Shield, 
    Share2, 
    Clock, 
    Sparkles, 
    AlertTriangle, 
    CheckCircle2, 
    Search,
    ArrowRight,
    Compass
} from 'lucide-react';
import LiveTracking from '../components/LiveTracking';
import { notyf } from '../utils/notyf';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const TrackRide = () => {
    const [ride, setRide] = useState(null);
    const [loading, setLoading] = useState(true);
    const [customRideId, setCustomRideId] = useState('');
    const navigate = useNavigate();

    const fetchActiveRide = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/rides/active-ride`, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 6000
            });

            if (response.data && response.data._id) {
                setRide(response.data);
            } else {
                setRide(null);
            }
        } catch (error) {
            console.log('No active ride detected:', error.message);
            setRide(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActiveRide();
        // Poll every 10 seconds for real-time status update if active ride
        const interval = setInterval(fetchActiveRide, 10000);
        return () => clearInterval(interval);
    }, []);

    const shareTrip = () => {
        if (navigator.share) {
            navigator.share({
                title: 'Track My Drivo Ride',
                text: `I'm travelling with Drivo. Track my live trip:`,
                url: window.location.href,
            }).catch(() => {});
        } else {
            navigator.clipboard.writeText(window.location.href);
            notyf.success('Live trip tracking link copied to clipboard!');
        }
    };

    const triggerSOS = () => {
        notyf.error('🚨 Emergency SOS alert sent to Drivo Safety Team & Emergency Contacts!');
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col">
            <Navbar />
            <main className="flex-1 py-6 px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                    <div>
                        <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold uppercase tracking-wider mb-1">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span>Live GPS Telemetry</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                            Track Active Ride
                        </h1>
                        <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
                            Real-time GPS positioning, driver verification OTP, and route tracking.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchActiveRide}
                            className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all"
                        >
                            Refresh GPS
                        </button>
                        <Link
                            to="/home"
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                        >
                            Book a Ride
                        </Link>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-24 bg-white/5 border border-white/10 rounded-2xl">
                        <div className="h-10 w-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        <p className="text-xs text-slate-400">Pinging satellite telemetry...</p>
                    </div>
                ) : ride ? (
                    /* Active Ride View */
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left 2 Cols: Live Map */}
                        <div className="lg:col-span-2 h-[450px] sm:h-[550px] rounded-2xl overflow-hidden border border-white/10 relative shadow-2xl">
                            <LiveTracking pickup={ride.pickup} destination={ride.destination} ride={ride} />
                            
                            {/* Floating Map Status Overlay */}
                            <div className="absolute top-4 left-4 z-20 bg-slate-900/90 backdrop-blur-md border border-white/10 px-3.5 py-2 rounded-xl flex items-center gap-2.5 shadow-xl">
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                <div>
                                    <span className="text-[11px] font-bold text-white block leading-tight">Live Trip Active</span>
                                    <span className="text-[10px] text-slate-400">Driver in transit</span>
                                </div>
                            </div>
                        </div>

                        {/* Right Col: Driver & Trip Telemetry Card */}
                        <div className="space-y-4">
                            {/* Driver Card */}
                            <div className="p-5 bg-slate-900/90 border border-white/10 rounded-2xl space-y-4 shadow-xl backdrop-blur-md">
                                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                            {ride.captain?.fullname?.firstname?.[0] || 'C'}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-base">
                                                {ride.captain?.fullname?.firstname || 'Drivo Captain'} {ride.captain?.fullname?.lastname || ''}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-amber-400 font-bold flex items-center gap-1">
                                                    ★ 4.9
                                                </span>
                                                <span className="text-xs text-slate-400">• Verified Captain</span>
                                            </div>
                                        </div>
                                    </div>
                                    <a
                                        href={`tel:${ride.captain?.phone || '1800-DRIVO'}`}
                                        className="h-10 w-10 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 flex items-center justify-center transition-all"
                                        title="Call Driver"
                                    >
                                        <Phone className="h-4 w-4" />
                                    </a>
                                </div>

                                {/* Vehicle & OTP */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Vehicle</span>
                                        <span className="text-xs font-bold text-white block mt-0.5 font-mono">
                                            {ride.captain?.vehicle?.plate || 'WB-06-B-4412'}
                                        </span>
                                        <span className="text-[10px] text-slate-400 capitalize">
                                            {ride.vehicleType || 'Sedan'}
                                        </span>
                                    </div>
                                    <div className="p-3 bg-blue-600/10 border border-blue-500/20 rounded-xl">
                                        <span className="text-[10px] uppercase font-bold text-blue-400 block">Start OTP</span>
                                        <span className="text-lg font-black text-white block tracking-widest font-mono">
                                            {ride.otp || '7821'}
                                        </span>
                                    </div>
                                </div>

                                {/* Locations */}
                                <div className="relative pl-6 space-y-3 pt-1">
                                    <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gradient-to-b from-emerald-500 to-rose-500 rounded-full"></div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-emerald-400">Pickup</p>
                                        <p className="text-xs font-semibold text-slate-200 line-clamp-1">{ride.pickup}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-rose-400">Destination</p>
                                        <p className="text-xs font-semibold text-slate-200 line-clamp-1">{ride.destination}</p>
                                    </div>
                                </div>

                                {/* Fare & Safety Actions */}
                                <div className="pt-3 border-t border-white/10 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-400">Estimated Total</span>
                                        <span className="text-lg font-black text-white">₹{ride.fare}</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-2">
                                        <button
                                            onClick={shareTrip}
                                            className="w-full py-2.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-all"
                                        >
                                            <Share2 className="h-3.5 w-3.5 text-blue-400" />
                                            <span>Share Trip</span>
                                        </button>
                                        <button
                                            onClick={triggerSOS}
                                            className="w-full py-2.5 px-3 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 rounded-xl text-xs font-bold text-rose-400 flex items-center justify-center gap-1.5 transition-all"
                                        >
                                            <Shield className="h-3.5 w-3.5 text-rose-400" />
                                            <span>Emergency SOS</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* No Active Ride State */
                    <div className="max-w-2xl mx-auto py-12 px-6 bg-slate-900/60 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-xl text-center space-y-6">
                        <div className="h-16 w-16 bg-blue-500/10 text-blue-400 rounded-3xl flex items-center justify-center mx-auto border border-blue-500/20 shadow-lg">
                            <Compass className="h-8 w-8 text-blue-400" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-black text-white tracking-tight">
                                No Active Ride in Transit
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                                You currently don't have an ongoing trip. When you confirm a ride, your driver's real-time GPS telemetry, vehicle details, and arrival countdown will appear here.
                            </p>
                        </div>

                        {/* Quick Lookup Input */}
                        <div className="max-w-md mx-auto relative">
                            <input
                                type="text"
                                value={customRideId}
                                onChange={(e) => setCustomRideId(e.target.value)}
                                placeholder="Enter Ride Booking ID (e.g. 66df...)"
                                className="w-full pl-4 pr-24 py-3 bg-white/5 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                            />
                            <button
                                onClick={() => {
                                    if (!customRideId.trim()) {
                                        notyf.error('Please enter a valid Ride ID');
                                        return;
                                    }
                                    notyf.success(`Searching telemetry for Ride #${customRideId}`);
                                    fetchActiveRide();
                                }}
                                className="absolute right-1.5 top-1.5 bottom-1.5 px-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all"
                            >
                                Track
                            </button>
                        </div>

                        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Link
                                to="/home"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/25 hover:scale-105 active:scale-95 transition-all"
                            >
                                <Car className="h-4 w-4" />
                                <span>Book a Ride Now</span>
                            </Link>
                            <Link
                                to="/my-rides"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-xl text-xs sm:text-sm font-semibold transition-all"
                            >
                                <span>View Past Bookings</span>
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                )}

            </div>
            </main>

            <Footer />
        </div>
    );
};

export default TrackRide;
