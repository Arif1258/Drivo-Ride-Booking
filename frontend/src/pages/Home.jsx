import React, { useEffect, useRef, useState, useContext } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import axios from 'axios';
import 'remixicon/fonts/remixicon.css';
import LocationSearchPanel from '../components/LocationSearchPanel';
import VehiclePanel from '../components/VehiclePanel';
import ConfirmRide from '../components/ConfirmRide';
import LookingForDriver from '../components/LookingForDriver';
import WaitingForDriver from '../components/WaitingForDriver';
import { SocketContext } from '../context/SocketContext';
import { UserDataContext } from '../context/UserContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import LiveTracking from '../components/LiveTracking';
import SupportAssistantModal from '../components/SupportAssistantModal';
import Navbar from '../components/Navbar';
import { MapPin, Navigation, ArrowLeft, History, PieChart, LogOut, Bot, Sparkles } from 'lucide-react';

const Home = () => {
    const [pickup, setPickup] = useState('');
    const [destination, setDestination] = useState('');
    const [panelOpen, setPanelOpen] = useState(false);
    const [supportOpen, setSupportOpen] = useState(false);
    const [aiEtaInfo, setAiEtaInfo] = useState(null);
    const vehiclePanelRef = useRef(null);
    const vehicleFoundRef = useRef(null);
    const waitingForDriverRef = useRef(null);
    const panelRef = useRef(null);
    const panelCloseRef = useRef(null);
    const mapContainerRef = useRef(null);
    const [vehiclePanel, setVehiclePanel] = useState(false);
    const [confirmRidePanel, setConfirmRidePanel] = useState(false);
    const [vehicleFound, setVehicleFound] = useState(false);
    const [waitingForDriver, setWaitingForDriver] = useState(false);
    const [pickupSuggestions, setPickupSuggestions] = useState([]);
    const [destinationSuggestions, setDestinationSuggestions] = useState([]);
    const [activeField, setActiveField] = useState(null);
    const [fare, setFare] = useState({});
    const [vehicleType, setVehicleType] = useState(null);
    const [ride, setRide] = useState(null);
    const mapHeightRef = useRef(100);
    const touchStartYRef = useRef(null);

    const navigate = useNavigate();
    const location = useLocation();
    const { socket } = useContext(SocketContext);
    const { user } = useContext(UserDataContext);

    // Auto-prefill if rebooked from My Rides history
    useEffect(() => {
        if (location.state?.rebookPickup) {
            setPickup(location.state.rebookPickup);
            setDestination(location.state.rebookDestination || '');
            setPanelOpen(true);
        }
    }, [location.state]);

    useEffect(() => {
        console.log('🔌 User joining socket - userId:', user._id);
        socket.emit("join", { userType: "user", userId: user._id });

        const handleReconnect = () => {
            socket.emit("join", { userType: "user", userId: user._id });
        };
        socket.on('connect', handleReconnect);

        return () => {
            socket.off('connect', handleReconnect);
        };
    }, [user, socket]);

    useEffect(() => {
        socket.on('ride-confirmed', confirmedRide => {
            console.log('✅ RIDE CONFIRMED received!', confirmedRide);
            setVehicleFound(false);
            setWaitingForDriver(true);
            setRide(confirmedRide);
        });

        socket.on('ride-started', startedRide => {
            setWaitingForDriver(false);
            navigate('/riding', { state: { ride: startedRide } });
        });

        socket.on('ride-cancelled', (data) => {
            alert(data?.message || 'Ride was cancelled.');
            setWaitingForDriver(false);
            setVehicleFound(false);
            setRide(null);
        });

        return () => {
            socket.off('ride-confirmed');
            socket.off('ride-started');
            socket.off('ride-cancelled');
        };
    }, [socket, navigate]);

    // 1. Initial check on mount: Restore active ride across page reloads
    useEffect(() => {
        let isMounted = true;
        const checkInitialActiveRide = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            try {
                const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/rides/active-ride`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!isMounted) return;

                if (response.data && response.data._id) {
                    const activeRide = response.data;
                    console.log("Active ride sync on mount:", activeRide.status, activeRide._id);
                    setRide(activeRide);

                    if (activeRide.pickup) setPickup(activeRide.pickup);
                    if (activeRide.destination) setDestination(activeRide.destination);
                    if (activeRide.vehicleType) setVehicleType(activeRide.vehicleType);

                    if (activeRide.status === 'pending') {
                        setVehiclePanel(false);
                        setConfirmRidePanel(false);
                        setVehicleFound(true);
                        setWaitingForDriver(false);
                    } else if (activeRide.status === 'accepted') {
                        setVehiclePanel(false);
                        setConfirmRidePanel(false);
                        setVehicleFound(false);
                        setWaitingForDriver(true);
                    } else if (activeRide.status === 'ongoing') {
                        setWaitingForDriver(false);
                        setVehicleFound(false);
                        navigate('/riding', { state: { ride: activeRide } });
                    }
                }
            } catch (err) {
                // 404 means no active ride in progress
                if (err.response?.status !== 404) {
                    console.log("Active ride check on mount:", err.message);
                }
            }
        };

        checkInitialActiveRide();
        return () => { isMounted = false; };
    }, [navigate]);

    // 2. Periodic polling: Only poll while actively searching or waiting for driver
    useEffect(() => {
        if (!vehicleFound && !waitingForDriver) return;

        let isMounted = true;
        const pollRide = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            try {
                const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/rides/active-ride`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!isMounted) return;

                if (response.data && response.data._id) {
                    const activeRide = response.data;
                    setRide(activeRide);

                    if (activeRide.status === 'accepted') {
                        setVehicleFound(false);
                        setWaitingForDriver(true);
                    } else if (activeRide.status === 'ongoing') {
                        setWaitingForDriver(false);
                        setVehicleFound(false);
                        navigate('/riding', { state: { ride: activeRide } });
                    }
                }
            } catch (err) {
                if (err.response?.status === 404) {
                    setVehicleFound(false);
                    setWaitingForDriver(false);
                    setRide(null);
                }
            }
        };

        const intervalId = setInterval(pollRide, 3000);
        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [vehicleFound, waitingForDriver, navigate]);

    const handlePickupChange = async (e) => {
        setPickup(e.target.value);
        try {
            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/maps/get-suggestions`, {
                params: { input: e.target.value },
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setPickupSuggestions(response.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDestinationChange = async (e) => {
        setDestination(e.target.value);
        try {
            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/maps/get-suggestions`, {
                params: { input: e.target.value },
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setDestinationSuggestions(response.data);
        } catch (err) {
            console.error(err);
        }
    };

    useGSAP(function () {
        if (panelOpen) {
            gsap.to(panelRef.current, { height: '70%', padding: 24 });
            gsap.to(panelCloseRef.current, { opacity: 1 });
        } else {
            gsap.to(panelRef.current, { height: '0%', padding: 0 });
            gsap.to(panelCloseRef.current, { opacity: 0 });
        }
    }, [panelOpen]);

    useGSAP(function () {
        if (vehiclePanel) {
            gsap.to(vehiclePanelRef.current, { transform: 'translateY(0)' });
        } else {
            gsap.to(vehiclePanelRef.current, { transform: 'translateY(100%)' });
        }
    }, [vehiclePanel]);


    useGSAP(function () {
        if (vehicleFound) {
            gsap.to(vehicleFoundRef.current, { transform: 'translateY(0)' });
        } else {
            gsap.to(vehicleFoundRef.current, { transform: 'translateY(100%)' });
        }
    }, [vehicleFound]);

    useGSAP(function () {
        if (waitingForDriver) {
            gsap.to(waitingForDriverRef.current, { transform: 'translateY(0)' });
        } else {
            gsap.to(waitingForDriverRef.current, { transform: 'translateY(100%)' });
        }
    }, [waitingForDriver]);

    async function findTrip() {
        if (!pickup || !destination) {
            alert('Please fill in both pickup and destination locations.');
            return;
        }
        try {
            setVehiclePanel(true);
            setPanelOpen(false);

            const token = localStorage.getItem('token');
            const [fareRes, etaRes] = await Promise.allSettled([
                axios.get(`${import.meta.env.VITE_BASE_URL}/rides/get-fare`, {
                    params: { pickup, destination },
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.post(`${import.meta.env.VITE_BASE_URL}/api/ai/predict-eta`, {
                    pickup,
                    destination
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            if (fareRes.status === 'fulfilled') {
                setFare(fareRes.value.data);
            } else {
                throw new Error(fareRes.reason?.response?.data?.message || 'Failed to fetch fare options.');
            }

            if (etaRes.status === 'fulfilled') {
                setAiEtaInfo(etaRes.value.data);
            }
        } catch (error) {
            console.error('Error finding trip:', error);
            alert(error.response?.data?.message || error.message || 'Failed to fetch fare options.');
            setVehiclePanel(false);
            setPanelOpen(true);
        }
    }

    async function createRide() {
        try {
            const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/rides/create`, {
                pickup,
                destination,
                vehicleType
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.data) {
                setRide(response.data);
            }
        } catch (error) {
            console.error('Error creating ride:', error);
            alert(error.response?.data?.message || 'Failed to request ride.');
            setVehicleFound(false);
            setConfirmRidePanel(true);
        }
    }

    async function cancelRide(reason = 'User cancelled ride') {
        try {
            const token = localStorage.getItem('token');
            const targetRideId = ride?._id;
            if (targetRideId) {
                await axios.post(`${import.meta.env.VITE_BASE_URL}/rides/cancel`, {
                    rideId: targetRideId,
                    reason
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                try {
                    const activeRes = await axios.get(`${import.meta.env.VITE_BASE_URL}/rides/active-ride`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (activeRes.data?._id) {
                        await axios.post(`${import.meta.env.VITE_BASE_URL}/rides/cancel`, {
                            rideId: activeRes.data._id,
                            reason
                        }, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                    }
                } catch (e) {
                    // Ignore if no active ride
                }
            }
        } catch (error) {
            console.error('Error cancelling ride:', error);
        } finally {
            setWaitingForDriver(false);
            setVehicleFound(false);
            setConfirmRidePanel(false);
            setVehiclePanel(false);
            setRide(null);
        }
    }

    return (
        <div className='h-screen relative overflow-hidden font-sans bg-slate-950 flex flex-col'>
            {/* Header: Brand & Navigation */}
            <Navbar />

            {/* AI ETA Floating Badge */}
            {aiEtaInfo && (
                <div className='absolute top-20 left-6 z-25 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md text-white px-3.5 py-1.5 rounded-full border border-white/10 shadow-lg text-xs font-bold'>
                    <Sparkles className='h-3.5 w-3.5 text-blue-400' />
                    <span>AI ETA: <strong className='text-blue-400'>{aiEtaInfo.aiEtaMinutes} mins</strong></span>
                </div>
            )}

            {/* Live Map */}
            <div ref={mapContainerRef} className='flex-1 w-screen z-10 relative'>
                <LiveTracking pickup={pickup} destination={destination} ride={ride} />
            </div>

            {/* Slide up search sheets */}
            <div className='flex flex-col justify-end h-screen absolute top-0 w-full pointer-events-none z-20'>
                <div className='p-6 bg-white rounded-t-3xl shadow-2xl border-t border-slate-100 pointer-events-auto relative'>
                    
                    {/* Panel close button */}
                    <div ref={panelCloseRef} onClick={() => setPanelOpen(false)} className='absolute opacity-0 right-6 top-6 h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors'>
                        <ArrowLeft className='h-4 w-4 text-gray-600' />
                    </div>

                    <h4 className='text-2xl font-black text-gray-900 tracking-tight'>Request a Ride</h4>
                    
                    <form className='relative py-4 space-y-3' onSubmit={(e) => e.preventDefault()}>
                        {/* Connecting Line Decoration */}
                        <div className="absolute h-12 w-0.5 top-[38px] left-[22px] bg-slate-300 rounded-full"></div>
                        
                        {/* Pickup Input Group */}
                        <div className='relative'>
                            <span className='absolute inset-y-0 left-0 pl-4 flex items-center text-emerald-500'>
                                <MapPin className='h-5 w-5' />
                            </span>
                            <input
                                onClick={() => {
                                    setPanelOpen(true);
                                    setActiveField('pickup');
                                }}
                                value={pickup}
                                onChange={handlePickupChange}
                                className='w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-blue-500 focus:bg-white text-sm font-semibold placeholder:text-gray-400 transition-all outline-none'
                                type="text"
                                placeholder='Where should we pick you up?'
                            />
                        </div>

                        {/* Destination Input Group */}
                        <div className='relative'>
                            <span className='absolute inset-y-0 left-0 pl-4 flex items-center text-rose-500'>
                                <Navigation className='h-5 w-5' />
                            </span>
                            <input
                                onClick={() => {
                                    setPanelOpen(true);
                                    setActiveField('destination');
                                }}
                                value={destination}
                                onChange={handleDestinationChange}
                                className='w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-blue-500 focus:bg-white text-sm font-semibold placeholder:text-gray-400 transition-all outline-none'
                                type="text"
                                placeholder='Where is your destination?'
                            />
                        </div>

                        {/* Quick Destination Chips */}
                        <div className='flex items-center gap-1.5 overflow-x-auto pt-1 pb-2 no-scrollbar'>
                            <span className='text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0'>Quick:</span>
                            {['Railway Station', 'Airport Terminal', 'University Campus', 'City Center'].map((place, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                        setDestination(place);
                                        if (!pickup) setPickup('Current Location');
                                    }}
                                    className='shrink-0 text-xs font-medium px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-full border border-slate-200/80 transition-colors'
                                >
                                    {place}
                                </button>
                            ))}
                        </div>
                    </form>

                    <button
                        onClick={findTrip}
                        className='w-full py-4 bg-black hover:bg-slate-900 text-white font-bold rounded-xl shadow-lg transition-all text-sm tracking-wide'
                    >
                        Find Trip Options
                    </button>
                </div>

                {/* Suggestions List Panel */}
                <div ref={panelRef} className='bg-white h-0 pointer-events-auto border-t overflow-y-auto max-h-[60%]'>
                    <LocationSearchPanel
                        suggestions={activeField === 'pickup' ? pickupSuggestions : destinationSuggestions}
                        setPanelOpen={setPanelOpen}
                        setVehiclePanel={setVehiclePanel}
                        setPickup={setPickup}
                        setDestination={setDestination}
                        activeField={activeField}
                    />
                </div>
            </div>

            {/* Sliding overlays for booking steps */}
            <div ref={vehiclePanelRef} className='fixed w-full z-30 bottom-0 translate-y-full bg-white px-6 py-8 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto'>
                <VehiclePanel
                    selectVehicle={setVehicleType}
                    fare={fare} 
                    setConfirmRidePanel={setConfirmRidePanel} 
                    setVehiclePanel={setVehiclePanel} 
                />
            </div>

            {/* Responsive Confirm Ride Modal */}
            {confirmRidePanel && (
                <ConfirmRide
                    createRide={createRide}
                    pickup={pickup}
                    destination={destination}
                    fare={fare}
                    vehicleType={vehicleType}
                    setConfirmRidePanel={setConfirmRidePanel} 
                    setVehicleFound={setVehicleFound} 
                />
            )}

            <div ref={vehicleFoundRef} className='fixed w-full z-30 bottom-0 translate-y-full bg-white px-6 py-8 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto'>
                <LookingForDriver
                    ride={ride}
                    createRide={createRide}
                    cancelRide={cancelRide}
                    pickup={pickup}
                    destination={destination}
                    fare={fare}
                    vehicleType={vehicleType}
                    setVehicleFound={setVehicleFound} 
                />
            </div>

            <div ref={waitingForDriverRef} className='fixed w-full z-30 bottom-0 translate-y-full bg-white px-6 py-8 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto'>
                <WaitingForDriver
                    ride={ride}
                    cancelRide={cancelRide}
                    setVehicleFound={setVehicleFound}
                    setWaitingForDriver={setWaitingForDriver}
                    waitingForDriver={waitingForDriver} 
                />
            </div>

            {/* Floating AI Assistant Trigger (Bottom-Right Corner) */}
            <button
                onClick={() => setSupportOpen(true)}
                className='fixed bottom-6 right-6 z-40 h-14 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full shadow-2xl shadow-indigo-500/40 flex items-center gap-2.5 hover:scale-105 active:scale-95 transition-all group ring-4 ring-white/90'
                aria-label="Open Drivo AI Assistant"
            >
                <div className='relative'>
                    <Bot className='h-6 w-6 text-white group-hover:rotate-12 transition-transform' />
                    <span className='absolute -top-1 -right-1 h-3 w-3 bg-emerald-400 rounded-full border-2 border-indigo-600 animate-pulse'></span>
                </div>
                <div className='text-left hidden sm:block pr-1'>
                    <div className='text-xs font-black tracking-tight leading-none'>Drivo AI</div>
                    <div className='text-[10px] text-indigo-200 font-medium leading-tight'>Book & Track Live</div>
                </div>
            </button>

            {/* AI Customer Support Assistant Modal */}
            <SupportAssistantModal
                isOpen={supportOpen}
                onClose={() => setSupportOpen(false)}
                userType="user"
                onRideCreated={(newRide) => {
                    setRide(newRide);
                    if (newRide.pickup) setPickup(newRide.pickup);
                    if (newRide.destination) setDestination(newRide.destination);
                    if (newRide.vehicleType) setVehicleType(newRide.vehicleType);
                    setVehiclePanel(false);
                    setConfirmRidePanel(false);
                    setVehicleFound(true);
                    setWaitingForDriver(false);
                }}
                onRideCancelled={() => {
                    setRide(null);
                    setVehicleFound(false);
                    setWaitingForDriver(false);
                    setConfirmRidePanel(false);
                    setVehiclePanel(false);
                }}
            />
        </div>
    );
};

export default Home;