import React, { useRef, useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import CaptainDetails from '../components/CaptainDetails';
import RidePopUp from '../components/RidePopUp';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import ConfirmRidePopUp from '../components/ConfirmRidePopUp';
import { SocketContext } from '../context/SocketContext';
import { CaptainDataContext } from '../context/CapatainContext';
import axios from 'axios';
import LiveTracking from '../components/LiveTracking';
import SupportAssistantModal from '../components/SupportAssistantModal';
import { LogOut, Radio, Award, TrendingUp, Compass, Bot, Sparkles, X, MapPin, ChevronRight } from 'lucide-react';

const CaptainHome = () => {
    const [ridePopupPanel, setRidePopupPanel] = useState(false);
    const [confirmRidePopupPanel, setConfirmRidePopupPanel] = useState(false);
    const [repositionAdvice, setRepositionAdvice] = useState(null);
    const [demandModalOpen, setDemandModalOpen] = useState(false);
    const [allZones, setAllZones] = useState([]);
    const [demandHotspots, setDemandHotspots] = useState([]);
    const [supportOpen, setSupportOpen] = useState(false);
    const [dismissReposition, setDismissReposition] = useState(false);

    const ridePopupPanelRef = useRef(null);
    const confirmRidePopupPanelRef = useRef(null);
    const mapContainerRef = useRef(null);
    const mapHeightRef = useRef(60);
    const touchStartYRef = useRef(null);
    const [ride, setRide] = useState(null);

    const { socket } = useContext(SocketContext);
    const { captain } = useContext(CaptainDataContext);
    const [captainStatus, setCaptainStatus] = useState(captain?.status || 'active');

    const toggleStatus = async () => {
        try {
            const res = await axios.post(`${import.meta.env.VITE_BASE_URL}/captains/toggle-status`, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('captain-token')}` }
            });
            if (res.data?.captain) {
                setCaptainStatus(res.data.captain.status);
            }
        } catch (err) {
            console.error("Error toggling status:", err.message);
        }
    };

    const handleRepositionNavigate = async (zone) => {
        if (!zone?.center?.ltd || !zone?.center?.lng) {
            alert('Location details unavailable for this zone.');
            return;
        }
        try {
            const loc = {
                ltd: zone.center.ltd,
                lng: zone.center.lng
            };
            socket.emit('update-location-captain', {
                userId: captain._id,
                location: loc
            });
            await axios.post(`${import.meta.env.VITE_BASE_URL}/captains/update-location`, {
                location: loc
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('captain-token')}` }
            });
            alert(`🧭 Navigation activated toward ${zone.name || zone.area || 'selected zone'}! Location updated.`);
            setDismissReposition(true);
        } catch (err) {
            console.error("Reposition error:", err.message);
        }
    };

    useEffect(() => {
        console.log("Captain connected");
        socket.emit('join', {
            userId: captain._id,
            userType: 'captain'
        });
        const updateLocation = () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async position => {
                        const loc = {
                            ltd: position.coords.latitude,
                            lng: position.coords.longitude
                        };
                        socket.emit('update-location-captain', {
                            userId: captain._id,
                            location: loc
                        });
                        try {
                            await axios.post(`${import.meta.env.VITE_BASE_URL}/captains/update-location`, {
                                location: loc
                            }, {
                                headers: { Authorization: `Bearer ${localStorage.getItem('captain-token')}` }
                            });
                        } catch (err) {
                            console.log("REST location update error:", err.message);
                        }
                    },
                    error => {
                        if (error.code === error.PERMISSION_DENIED) {
                            console.warn("Location permission denied by captain.");
                        } else {
                            console.debug("Temporary location acquisition:", error.message);
                        }
                    },
                    { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 }
                );
            }
        };

        const locationInterval = setInterval(updateLocation, 10000);
        updateLocation();

        const handleReconnect = () => {
            console.log('🔄 Socket reconnected, re-joining as captain');
            socket.emit('join', {
                userId: captain._id,
                userType: 'captain'
            });
            updateLocation();
        };
        socket.on('connect', handleReconnect);

        return () => {
            clearInterval(locationInterval);
            socket.off('connect', handleReconnect);
        };
    }, [captain, socket]);

    useEffect(() => {
        socket.on('new-ride', (data) => {
            console.log("Captain received event new-ride", data);
            setRide(data);
            setRidePopupPanel(true);
            console.log("Captain dashboard updated");
        });

        socket.on('ride-cancelled', (data) => {
            console.log("Captain received ride-cancelled event:", data);
            alert(data?.message || 'Ride was cancelled.');
            setRidePopupPanel(false);
            setConfirmRidePopupPanel(false);
            setRide(null);
        });

        return () => {
            socket.off('new-ride');
            socket.off('ride-cancelled');
        };
    }, [socket]);

    useEffect(() => {
        let intervalId;

        const pollPendingRides = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/rides/pending-rides`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('captain-token')}` }
                });
                if (response.data && response.data.length > 0) {
                    if (!ridePopupPanel && !confirmRidePopupPanel) {
                        console.log("Polling found pending rides:", response.data);
                        setRide(response.data[0]);
                        setRidePopupPanel(true);
                    }
                }
            } catch (err) {
                console.log("Pending rides polling error:", err.message);
            }
        };

        intervalId = setInterval(pollPendingRides, 3000);
        pollPendingRides();

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [captain, ridePopupPanel, confirmRidePopupPanel]);

    // Fetch AI Repositioning Advice and Demand Zones
    useEffect(() => {
        const fetchAIData = async () => {
            const token = localStorage.getItem('captain-token');
            if (!token) return;

            try {
                const [repositionRes, zonesRes, hotspotsRes] = await Promise.allSettled([
                    axios.get(`${import.meta.env.VITE_BASE_URL}/api/ai/driver-reposition`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get(`${import.meta.env.VITE_BASE_URL}/api/ai/demand-zones`),
                    axios.get(`${import.meta.env.VITE_BASE_URL}/api/ai/demand-hotspots`)
                ]);

                if (repositionRes.status === 'fulfilled') {
                    setRepositionAdvice(repositionRes.value.data);
                }
                if (zonesRes.status === 'fulfilled') {
                    setAllZones(zonesRes.value.data);
                }
                if (hotspotsRes.status === 'fulfilled' && Array.isArray(hotspotsRes.value.data)) {
                    setDemandHotspots(hotspotsRes.value.data);
                }
            } catch (err) {
                console.log('AI data fetch error:', err.message);
            }
        };

        fetchAIData();
        const aiInterval = setInterval(fetchAIData, 45000); // refresh every 45s

        // Listen for real-time demand surge broadcast
        socket.on('high-demand-alert', (alertData) => {
            console.log('📢 Received high-demand-alert:', alertData);
            fetchAIData();
        });

        return () => {
            clearInterval(aiInterval);
            socket.off('high-demand-alert');
        };
    }, [captain, socket]);

    async function confirmRide() {
        await axios.post(`${import.meta.env.VITE_BASE_URL}/rides/confirm`, {
            rideId: ride._id,
            captainId: captain._id,
        }, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('captain-token')}`
            }
        });

        setRidePopupPanel(false);
        setConfirmRidePopupPanel(true);
    }

    useGSAP(function () {
        if (ridePopupPanel) {
            gsap.to(ridePopupPanelRef.current, { transform: 'translateY(0)' });
        } else {
            gsap.to(ridePopupPanelRef.current, { transform: 'translateY(100%)' });
        }
    }, [ridePopupPanel]);

    useGSAP(function () {
        if (confirmRidePopupPanel) {
            gsap.to(confirmRidePopupPanelRef.current, { transform: 'translateY(0)' });
        } else {
            gsap.to(confirmRidePopupPanelRef.current, { transform: 'translateY(100%)' });
        }
    }, [confirmRidePopupPanel]);

    const handleWheelOnPanel = (e) => {
        const newHeight = Math.min(85, Math.max(20, mapHeightRef.current - e.deltaY * 0.05));
        mapHeightRef.current = newHeight;
        gsap.to(mapContainerRef.current, {
            height: `${newHeight}vh`,
            duration: 0.3,
            ease: 'power2.out'
        });
    };

    const handleTouchStart = (e) => {
        touchStartYRef.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
        if (touchStartYRef.current === null) return;
        const deltaY = touchStartYRef.current - e.touches[0].clientY;
        touchStartYRef.current = e.touches[0].clientY;
        const newHeight = Math.min(85, Math.max(20, mapHeightRef.current - deltaY * 0.15));
        mapHeightRef.current = newHeight;
        gsap.to(mapContainerRef.current, {
            height: `${newHeight}vh`,
            duration: 0.2,
            ease: 'power2.out'
        });
    };

    const handleTouchEnd = () => {
        touchStartYRef.current = null;
    };

    return (
        <div className='h-screen relative overflow-hidden font-sans bg-slate-950 text-white'>
            {/* Top Bar Status & AI Controls */}
            <div className='fixed p-4 sm:p-6 top-0 flex items-center justify-between w-screen z-25 pointer-events-none'>
                <div className='flex items-center gap-2 sm:gap-3 pointer-events-auto'>
                    <div className='h-10 w-10 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20'>
                        <span className='font-black text-xl text-white'>D</span>
                    </div>
                    <span className='hidden sm:inline font-bold text-xs tracking-tight text-white/90 bg-slate-900/80 px-2.5 py-1 rounded-full border border-white/10'>
                        Drivo Captain
                    </span>
                    <button
                        onClick={toggleStatus}
                        className={`px-3 py-1.5 backdrop-blur border rounded-full flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
                            captainStatus === 'active'
                            ? 'bg-emerald-950/80 border-emerald-500/40 hover:bg-emerald-900/80'
                            : 'bg-slate-900/80 border-slate-700 hover:bg-slate-800'
                        }`}
                        title="Click to toggle Online/Offline"
                    >
                        <span className={`h-2 w-2 rounded-full ${captainStatus === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${captainStatus === 'active' ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {captainStatus === 'active' ? 'Online' : 'Offline'}
                        </span>
                    </button>
                </div>

                <div className='flex items-center gap-2 pointer-events-auto'>
                    {/* Demand Heatmap Zones Button */}
                    <button
                        onClick={() => setDemandModalOpen(true)}
                        className='h-10 px-3 bg-slate-900/90 backdrop-blur border border-white/10 rounded-full flex items-center gap-1.5 text-amber-400 hover:scale-105 transition-all shadow-lg text-xs font-bold'
                        title="Citywide Demand Hotspots"
                    >
                        <TrendingUp className='h-4 w-4 text-amber-400' />
                        <span className='hidden sm:inline'>Demand Zones</span>
                    </button>

                    {/* AI Support Assistant Button */}
                    <button
                        onClick={() => setSupportOpen(true)}
                        className='h-10 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center gap-1.5 text-white hover:scale-105 transition-all shadow-lg shadow-blue-500/20 text-xs font-bold'
                        title="AI Support Assistant"
                    >
                        <Bot className='h-4 w-4' />
                        <span className='hidden sm:inline'>AI Support</span>
                    </button>

                    <Link to='/captain/logout' className='h-10 w-10 bg-slate-900/80 backdrop-blur border border-white/10 rounded-full flex items-center justify-center hover:scale-105 transition-all text-red-400 shadow-lg' title="Logout">
                        <LogOut className='h-4 w-4' />
                    </Link>
                </div>
            </div>

            {/* Live Map */}
            <div ref={mapContainerRef} style={{ height: '60vh' }} className='w-screen z-10 relative'>
                <LiveTracking ride={ride} hotspots={demandHotspots} />

                {/* AI Smart Repositioning Floating Card */}
                {repositionAdvice?.recommendedZone && !dismissReposition && (
                    <div className='absolute bottom-3 left-4 right-4 z-20 pointer-events-auto'>
                        <div className='bg-slate-900/95 backdrop-blur-md border border-amber-500/30 p-3 sm:p-3.5 rounded-2xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3'>
                            <div className='flex items-center gap-3'>
                                <div className='h-9 w-9 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0'>
                                    <Compass className='h-5 w-5 animate-spin-slow' />
                                </div>
                                <div>
                                    <div className='flex items-center gap-2'>
                                        <span className='text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider'>
                                            AI Repositioning
                                        </span>
                                        <span className='text-[11px] text-emerald-400 font-bold'>
                                            +{repositionAdvice?.recommendedZone?.probabilityBoostPercent || 25}% Ride Probability
                                        </span>
                                    </div>
                                    <p className='text-xs font-semibold text-slate-200 mt-1 line-clamp-1'>
                                        {repositionAdvice.message || 'High demand zone nearby.'}
                                    </p>
                                </div>
                            </div>
                            <div className='flex items-center gap-2 self-end sm:self-center'>
                                <button
                                    onClick={() => handleRepositionNavigate(repositionAdvice.recommendedZone)}
                                    className='px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition-all'
                                >
                                    Reposition Now
                                </button>
                                <button
                                    onClick={() => setDismissReposition(true)}
                                    className='h-7 w-7 bg-slate-800 hover:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors'
                                    title="Dismiss"
                                >
                                    <X className='h-3.5 w-3.5' />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Driver Details Sheet */}
            <div
                onWheel={handleWheelOnPanel}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className='bg-white text-slate-900 rounded-t-3xl shadow-2xl relative z-20 flex flex-col'
                style={{ height: 'calc(100vh - 60vh)' }}
            >
                {/* Pull Bar */}
                <div className='w-12 h-1 bg-gray-200 rounded-full mx-auto mt-4 cursor-grab'></div>
                
                <div className='p-6 flex-1 overflow-y-auto'>
                    <CaptainDetails />
                </div>
            </div>

            {/* Slide up Popups */}
            <div ref={ridePopupPanelRef} className='fixed w-full z-40 bottom-0 translate-y-full bg-white text-slate-900 px-6 py-8 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto'>
                <RidePopUp
                    ride={ride}
                    setRidePopupPanel={setRidePopupPanel}
                    setConfirmRidePopupPanel={setConfirmRidePopupPanel}
                    confirmRide={confirmRide}
                />
            </div>
            
            <div ref={confirmRidePopupPanelRef} className='fixed w-full h-screen z-40 bottom-0 translate-y-full bg-white text-slate-900 px-6 py-8 rounded-t-3xl shadow-2xl overflow-y-auto'>
                <ConfirmRidePopUp
                    ride={ride}
                    setConfirmRidePopupPanel={setConfirmRidePopupPanel} 
                    setRidePopupPanel={setRidePopupPanel} 
                />
            </div>

            {/* AI Demand Zones Modal */}
            {demandModalOpen && (
                <div className='fixed inset-0 z-[500] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4'>
                    <div className='bg-slate-900 text-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-800 flex flex-col max-h-[80vh]'>
                        <div className='flex items-center justify-between border-b border-slate-800 pb-4 mb-4'>
                            <div className='flex items-center gap-3'>
                                <div className='h-10 w-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center'>
                                    <TrendingUp className='h-5 w-5' />
                                </div>
                                <div>
                                    <h3 className='text-lg font-bold'>Citywide Demand Hotspots</h3>
                                    <p className='text-xs text-slate-400'>Real-time demand vs active driver supply</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setDemandModalOpen(false)}
                                className='h-8 w-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300'
                            >
                                <X className='h-4 w-4' />
                            </button>
                        </div>

                        <div className='space-y-3 overflow-y-auto pr-1 flex-1'>
                            {allZones.map((zone) => (
                                <div
                                    key={zone.zoneId}
                                    className='bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between hover:border-slate-700 transition-all'
                                >
                                    <div>
                                        <div className='flex items-center gap-2'>
                                            <h4 className='font-bold text-sm text-slate-200'>{zone.area}</h4>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                zone.predictedDemand === 'SURGE' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                                zone.predictedDemand === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                                zone.predictedDemand === 'MEDIUM' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                                'bg-slate-800 text-slate-400'
                                            }`}>
                                                {zone.predictedDemand}
                                            </span>
                                        </div>
                                        <p className='text-xs text-slate-400 mt-1'>
                                            Expected: <strong>{zone.expectedRides} rides</strong> • Active drivers: <strong>{zone.availableDrivers}</strong>
                                        </p>
                                    </div>
                                    <div className='text-right'>
                                        <span className='text-sm font-black text-amber-400'>{zone.demandSupplyRatio}x</span>
                                        <span className='text-[10px] text-slate-500 block'>Demand/Supply</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className='mt-4 pt-3 border-t border-slate-800 text-center'>
                            <p className='text-[11px] text-slate-500'>
                                Predictions recalculate dynamically every 45s based on live trip velocity.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating AI Assistant Trigger (Bottom-Right Corner) */}
            <button
                onClick={() => setSupportOpen(true)}
                className='fixed bottom-6 right-6 z-40 h-14 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-full shadow-2xl shadow-emerald-500/40 flex items-center gap-2.5 hover:scale-105 active:scale-95 transition-all group ring-4 ring-slate-900/90'
                aria-label="Open Drivo Captain AI Copilot"
            >
                <div className='relative'>
                    <Bot className='h-6 w-6 text-white group-hover:rotate-12 transition-transform' />
                    <span className='absolute -top-1 -right-1 h-3 w-3 bg-cyan-300 rounded-full border-2 border-emerald-600 animate-pulse'></span>
                </div>
                <div className='text-left hidden sm:block pr-1'>
                    <div className='text-xs font-black tracking-tight leading-none'>Drivo Copilot</div>
                    <div className='text-[10px] text-emerald-200 font-medium leading-tight'>Driver AI & Shift Stats</div>
                </div>
            </button>

            {/* AI Customer Support Assistant Modal */}
            <SupportAssistantModal
                isOpen={supportOpen}
                onClose={() => setSupportOpen(false)}
                userType="captain"
            />
        </div>
    );
};

export default CaptainHome;