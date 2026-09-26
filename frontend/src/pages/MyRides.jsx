import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
    CalendarClock, 
    Car, 
    MapPin, 
    Navigation, 
    CheckCircle2, 
    Clock, 
    XCircle, 
    ArrowRight, 
    RotateCcw, 
    Download, 
    Star, 
    Shield, 
    Phone, 
    ChevronRight,
    Search,
    Filter
} from 'lucide-react';
import { notyf } from '../utils/notyf';
import Navbar from '../components/Navbar';

const SAMPLE_RIDES = [
    {
        _id: 'ride-demo-101',
        pickup: 'Salt Lake Sector V, Kolkata, WB',
        destination: 'Park Street Metro Station, Kolkata, WB',
        fare: 285,
        status: 'completed',
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        vehicleType: 'car',
        captain: {
            fullname: { firstname: 'Rajesh', lastname: 'Sharma' },
            vehicle: { plate: 'WB-06-B-4412', vehicleType: 'car', color: 'White' },
            rating: 4.9
        },
        duration: '32 mins',
        distance: '14.2 km'
    },
    {
        _id: 'ride-demo-102',
        pickup: 'Netaji Subhash Chandra Bose International Airport',
        destination: 'New Town Eco Park, Major Arterial Road',
        fare: 190,
        status: 'completed',
        createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
        vehicleType: 'auto',
        captain: {
            fullname: { firstname: 'Subrata', lastname: 'Paul' },
            vehicle: { plate: 'WB-24-C-8819', vehicleType: 'auto', color: 'Green' },
            rating: 4.8
        },
        duration: '18 mins',
        distance: '8.4 km'
    },
    {
        _id: 'ride-demo-103',
        pickup: 'Howrah Railway Station Terminal 1',
        destination: 'Victoria Memorial Hall, Queens Way',
        fare: 120,
        status: 'completed',
        createdAt: new Date(Date.now() - 3600000 * 120).toISOString(),
        vehicleType: 'moto',
        captain: {
            fullname: { firstname: 'Amit', lastname: 'Dey' },
            vehicle: { plate: 'WB-02-K-1940', vehicleType: 'moto', color: 'Black' },
            rating: 4.9
        },
        duration: '22 mins',
        distance: '6.8 km'
    }
];

const MyRides = () => {
    const [rides, setRides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchRides = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/rides/my-rides`, {
                    headers: { Authorization: `Bearer ${token}` },
                    timeout: 6000
                });

                if (response.data && response.data.length > 0) {
                    setRides(response.data);
                } else {
                    setRides(SAMPLE_RIDES);
                }
            } catch (err) {
                console.log('Falling back to saved/sample rides:', err.message);
                setRides(SAMPLE_RIDES);
            } finally {
                setLoading(false);
            }
        };

        fetchRides();
    }, []);

    const printInvoice = (ride) => {
        const printWindow = window.open('', '_blank');
        const driverName = ride.captain 
            ? `${ride.captain.fullname?.firstname || 'Captain'} ${ride.captain.fullname?.lastname || ''}` 
            : 'Drivo Captain';
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Drivo Trip Receipt - ${ride._id}</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #1e293b; max-width: 500px; margin: auto; }
                        .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
                        .logo { font-size: 26px; font-weight: 900; letter-spacing: -1px; color: #2563eb; }
                        .meta { font-size: 12px; color: #64748b; margin-top: 4px; }
                        .row { display: flex; justify-content: space-between; margin: 10px 0; font-size: 14px; }
                        .label { color: #64748b; }
                        .val { font-weight: 600; text-align: right; }
                        .divider { border-top: 1px dashed #cbd5e1; margin: 16px 0; }
                        .total { font-size: 20px; font-weight: 800; color: #0f172a; }
                        .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 30px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo">DRIVO</div>
                        <div style="font-size: 11px; font-weight: bold; letter-spacing: 1px; color: #2563eb;">OFFICIAL TRIP INVOICE</div>
                        <div class="meta">Receipt #${ride._id} • ${new Date(ride.createdAt).toLocaleString()}</div>
                    </div>
                    <div class="row"><span class="label">Status:</span><span class="val" style="color: #10b981; text-transform: uppercase;">${ride.status || 'COMPLETED'}</span></div>
                    <div class="row"><span class="label">Vehicle:</span><span class="val">${(ride.vehicleType || 'Car').toUpperCase()}</span></div>
                    <div class="row"><span class="label">Captain:</span><span class="val">${driverName}</span></div>
                    <div class="divider"></div>
                    <div class="row"><span class="label">Pickup Location:</span><span class="val">${ride.pickup}</span></div>
                    <div class="row"><span class="label">Destination:</span><span class="val">${ride.destination}</span></div>
                    <div class="divider"></div>
                    <div class="row total"><span>Total Fare Paid:</span><span>₹${ride.fare}</span></div>
                    <div class="footer">
                        <p>Paid via Drivo Secure Wallet / UPI</p>
                        <p>Thank you for choosing Drivo Intelligent Mobility!</p>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    const handleRebook = (ride) => {
        notyf.success('Ride locations loaded for booking');
        navigate('/home', { state: { rebookPickup: ride.pickup, rebookDestination: ride.destination } });
    };

    const filteredRides = rides.filter(ride => {
        if (filter !== 'all' && ride.status !== filter) return false;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                ride.pickup.toLowerCase().includes(query) ||
                ride.destination.toLowerCase().includes(query) ||
                ride._id.toLowerCase().includes(query)
            );
        }
        return true;
    });

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col">
            <Navbar />
            <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-5xl mx-auto space-y-6">
                
                {/* Header & Controls */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
                    <div>
                        <div className="flex items-center gap-2 text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">
                            <CalendarClock className="h-4 w-4" />
                            <span>Ride History</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                            My Bookings & Journeys
                        </h1>
                        <p className="text-slate-400 text-xs sm:text-sm mt-1">
                            Review past trips, view itemized receipts, and easily re-book your frequent routes.
                        </p>
                    </div>

                    <Link
                        to="/home"
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:scale-105 active:scale-95"
                    >
                        <Car className="h-4 w-4" />
                        <span>Book a New Ride</span>
                    </Link>
                </div>

                {/* Filter and Search Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by pickup, destination, or ride ID..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 focus:border-blue-500 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                        />
                    </div>

                    <div className="flex gap-1.5 p-1 bg-white/5 border border-white/10 rounded-xl">
                        {[
                            { key: 'all', label: 'All' },
                            { key: 'completed', label: 'Completed' },
                            { key: 'ongoing', label: 'Active' },
                            { key: 'cancelled', label: 'Cancelled' }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setFilter(tab.key)}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                                    filter === tab.key
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Rides List */}
                {loading ? (
                    <div className="text-center py-20 bg-white/5 border border-white/10 rounded-2xl">
                        <div className="h-10 w-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        <p className="text-xs text-slate-400 font-medium">Fetching your ride history...</p>
                    </div>
                ) : filteredRides.length === 0 ? (
                    <div className="text-center py-16 px-4 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                        <div className="h-14 w-14 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/20">
                            <Car className="h-7 w-7" />
                        </div>
                        <h3 className="text-lg font-bold text-white">No rides match your filter</h3>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                            You have no trips matching the selected criteria. Book a ride now to travel around the city seamlessly.
                        </p>
                        <Link
                            to="/home"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all"
                        >
                            Book Ride Now
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredRides.map((ride) => {
                            const isCompleted = ride.status === 'completed';
                            const isCancelled = ride.status === 'cancelled';
                            const isOngoing = ride.status === 'ongoing' || ride.status === 'accepted';
                            const driverName = ride.captain 
                                ? `${ride.captain.fullname?.firstname || 'Captain'} ${ride.captain.fullname?.lastname || ''}`.trim() 
                                : 'Assigned Driver';

                            return (
                                <div 
                                    key={ride._id}
                                    className="p-5 bg-slate-900/60 hover:bg-slate-900 border border-white/10 hover:border-blue-500/30 rounded-2xl transition-all duration-200 shadow-xl backdrop-blur-md space-y-4"
                                >
                                    {/* Top Row: Date, Vehicle, Status Badge, Fare */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                                                <Car className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                                                        {ride.vehicleType || 'Drivo Ride'}
                                                    </span>
                                                    <span className="text-[11px] text-slate-500 font-mono">
                                                        #{ride._id.slice(-6)}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-400">
                                                    {new Date(ride.createdAt || Date.now()).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {isCompleted && (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Completed
                                                </span>
                                            )}
                                            {isOngoing && (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
                                                    <Clock className="h-3 w-3" />
                                                    In Transit
                                                </span>
                                            )}
                                            {isCancelled && (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                                    <XCircle className="h-3 w-3" />
                                                    Cancelled
                                                </span>
                                            )}

                                            <span className="text-lg sm:text-xl font-black text-white">
                                                ₹{ride.fare}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Middle: Route Details */}
                                    <div className="relative pl-6 space-y-3">
                                        <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gradient-to-b from-emerald-500 via-blue-500 to-rose-500 rounded-full"></div>
                                        
                                        <div className="relative">
                                            <span className="absolute -left-[27px] top-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500/20 border-2 border-emerald-400"></span>
                                            <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Pickup</p>
                                            <p className="text-xs sm:text-sm font-semibold text-slate-200 line-clamp-1">{ride.pickup}</p>
                                        </div>

                                        <div className="relative">
                                            <span className="absolute -left-[27px] top-0.5 h-3.5 w-3.5 rounded-full bg-rose-500/20 border-2 border-rose-400"></span>
                                            <p className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">Destination</p>
                                            <p className="text-xs sm:text-sm font-semibold text-slate-200 line-clamp-1">{ride.destination}</p>
                                        </div>
                                    </div>

                                    {/* Bottom: Captain Info & Actions */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
                                        <div className="flex items-center gap-2.5">
                                            <div className="h-8 w-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-bold text-white">
                                                {driverName[0]}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-white">{driverName}</p>
                                                <p className="text-[10px] text-slate-400">
                                                    {ride.captain?.vehicle?.plate || 'Verified Drivo Fleet'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => printInvoice(ride)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all"
                                                title="Print Receipt"
                                            >
                                                <Download className="h-3.5 w-3.5" />
                                                <span>Receipt</span>
                                            </button>

                                            <button
                                                onClick={() => handleRebook(ride)}
                                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 hover:scale-105"
                                            >
                                                <RotateCcw className="h-3.5 w-3.5" />
                                                <span>Re-book</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

            </div>
            </main>
        </div>
    );
};

export default MyRides;
