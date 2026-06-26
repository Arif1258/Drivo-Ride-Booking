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
import { LogOut, Radio, Award } from 'lucide-react';

const CaptainHome = () => {
    const [ridePopupPanel, setRidePopupPanel] = useState(false);
    const [confirmRidePopupPanel, setConfirmRidePopupPanel] = useState(false);

    const ridePopupPanelRef = useRef(null);
    const confirmRidePopupPanelRef = useRef(null);
    const mapContainerRef = useRef(null);
    const mapHeightRef = useRef(60);
    const touchStartYRef = useRef(null);
    const [ride, setRide] = useState(null);

    const { socket } = useContext(SocketContext);
    const { captain } = useContext(CaptainDataContext);

    useEffect(() => {
        console.log("Captain connected");
        socket.emit('join', {
            userId: captain._id,
            userType: 'captain'
        });
        const updateLocation = () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(async position => {
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
                });
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

        return () => {
            socket.off('new-ride');
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
            {/* Top Bar Status Controls */}
            <div className='fixed p-6 top-0 flex items-center justify-between w-screen z-25 pointer-events-none'>
                <div className='flex items-center gap-3 pointer-events-auto'>
                    <div className='h-10 w-10 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20'>
                        <span className='font-black text-xl'>D</span>
                    </div>
                    <div className='px-3 py-1.5 bg-slate-900/80 backdrop-blur border border-white/10 rounded-full flex items-center gap-2 shadow-lg'>
                        <span className='h-2 w-2 rounded-full bg-emerald-500 animate-pulse'></span>
                        <span className='text-[10px] font-bold uppercase tracking-wider text-emerald-400'>Online</span>
                    </div>
                </div>

                <Link to='/captain/logout' className='h-11 w-11 bg-slate-900/80 backdrop-blur border border-white/10 rounded-full flex items-center justify-center hover:scale-105 transition-all text-red-400 pointer-events-auto shadow-lg' title="Logout">
                    <LogOut className='h-5 w-5' />
                </Link>
            </div>

            {/* Live Map */}
            <div ref={mapContainerRef} style={{ height: '60vh' }} className='w-screen z-10'>
                <LiveTracking ride={ride} />
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
        </div>
    );
};

export default CaptainHome;