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
import { useNavigate, Link } from 'react-router-dom';
import LiveTracking from '../components/LiveTracking';
import { MapPin, Navigation, ArrowLeft, History, PieChart, LogOut } from 'lucide-react';

const Home = () => {
    const [pickup, setPickup] = useState('');
    const [destination, setDestination] = useState('');
    const [panelOpen, setPanelOpen] = useState(false);
    const vehiclePanelRef = useRef(null);
    const confirmRidePanelRef = useRef(null);
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
    const { socket } = useContext(SocketContext);
    const { user } = useContext(UserDataContext);

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

        return () => {
            socket.off('ride-confirmed');
            socket.off('ride-started');
        };
    }, [socket, navigate]);

    useEffect(() => {
        let intervalId;

        const pollActiveRide = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/rides/active-ride`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                if (response.data) {
                    const activeRide = response.data;
                    console.log("Polling active ride:", activeRide.status);

                    if (activeRide.status === 'accepted') {
                        setVehicleFound(false);
                        setWaitingForDriver(true);
                        setRide(activeRide);
                    } else if (activeRide.status === 'ongoing') {
                        setWaitingForDriver(false);
                        navigate('/riding', { state: { ride: activeRide } });
                    }
                }
            } catch (err) {
                console.log("Active ride polling error/status:", err.message);
            }
        };

        if (vehicleFound || waitingForDriver) {
            intervalId = setInterval(pollActiveRide, 3000);
            pollActiveRide();
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
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
        if (confirmRidePanel) {
            gsap.to(confirmRidePanelRef.current, { transform: 'translateY(0)' });
        } else {
            gsap.to(confirmRidePanelRef.current, { transform: 'translateY(100%)' });
        }
    }, [confirmRidePanel]);

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

            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/rides/get-fare`, {
                params: { pickup, destination },
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            setFare(response.data);
        } catch (error) {
            console.error('Error finding trip:', error);
            alert(error.response?.data?.message || 'Failed to fetch fare options.');
            setVehiclePanel(false);
            setPanelOpen(true);
        }
    }

    async function createRide() {
        try {
            await axios.post(`${import.meta.env.VITE_BASE_URL}/rides/create`, {
                pickup,
                destination,
                vehicleType
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
        } catch (error) {
            console.error('Error creating ride:', error);
            alert(error.response?.data?.message || 'Failed to request ride.');
            setVehicleFound(false);
            setConfirmRidePanel(true);
        }
    }

    return (
        <div className='h-screen relative overflow-hidden font-sans bg-slate-550'>
            {/* Header: Brand & Navigation */}
            <div className='absolute left-6 top-6 z-25 flex items-center gap-3 pointer-events-none'>
                <div className='h-10 w-10 bg-black text-white rounded-xl flex items-center justify-center shadow-lg pointer-events-auto'>
                    <span className='font-black text-xl'>D</span>
                </div>
            </div>

            <div className='absolute right-6 top-6 z-25 flex gap-2 print:hidden'>
                <Link to='/payments' className='h-11 w-11 bg-white/90 backdrop-blur shadow-lg flex items-center justify-center rounded-full hover:scale-105 transition-all text-slate-800' title="Payment History">
                    <History className='h-5 w-5' />
                </Link>
                <Link to='/admin-analytics' className='h-11 w-11 bg-white/90 backdrop-blur shadow-lg flex items-center justify-center rounded-full hover:scale-105 transition-all text-slate-800' title="Admin Analytics">
                    <PieChart className='h-5 w-5' />
                </Link>
                <Link to='/user/logout' className='h-11 w-11 bg-white/90 backdrop-blur shadow-lg flex items-center justify-center rounded-full hover:scale-105 transition-all text-red-600' title="Logout">
                    <LogOut className='h-5 w-5' />
                </Link>
            </div>

            {/* Live Map */}
            <div ref={mapContainerRef} style={{ height: '100vh' }} className='w-screen z-10'>
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

            <div ref={confirmRidePanelRef} className='fixed w-full z-30 bottom-0 translate-y-full bg-white px-6 py-8 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto'>
                <ConfirmRide
                    createRide={createRide}
                    pickup={pickup}
                    destination={destination}
                    fare={fare}
                    vehicleType={vehicleType}
                    setConfirmRidePanel={setConfirmRidePanel} 
                    setVehicleFound={setVehicleFound} 
                />
            </div>

            <div ref={vehicleFoundRef} className='fixed w-full z-30 bottom-0 translate-y-full bg-white px-6 py-8 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto'>
                <LookingForDriver
                    createRide={createRide}
                    pickup={pickup}
                    destination={destination}
                    fare={fare}
                    vehicleType={vehicleType}
                    setVehicleFound={setVehicleFound} 
                />
            </div>

            <div ref={waitingForDriverRef} className='fixed w-full z-30 bottom-0 bg-white px-6 py-8 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto'>
                <WaitingForDriver
                    ride={ride}
                    setVehicleFound={setVehicleFound}
                    setWaitingForDriver={setWaitingForDriver}
                    waitingForDriver={waitingForDriver} 
                />
            </div>
        </div>
    );
};

export default Home;