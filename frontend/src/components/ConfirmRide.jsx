import React, { useEffect, useRef } from 'react';
import { MapPin, Navigation, Coins, X, ShieldCheck, ArrowRight } from 'lucide-react';

const ConfirmRide = ({
    createRide,
    pickup,
    destination,
    fare,
    vehicleType = 'car',
    setConfirmRidePanel,
    setVehicleFound,
    isOpen = true
}) => {
    const modalRef = useRef(null);

    // Keyboard support: Escape key closes modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setConfirmRidePanel(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setConfirmRidePanel]);

    const vehicleImages = {
        car: 'https://swyft.pl/wp-content/uploads/2023/05/how-many-people-can-a-uberx-take.jpg',
        motorcycle: '/Uber_Moto.webp',
        moto: '/Uber_Moto.webp',
        auto: '/Uber_Auto.png'
    };

    const vehicleLabels = {
        car: 'Drivo Premier',
        motorcycle: 'Drivo Moto Fast',
        moto: 'Drivo Moto Fast',
        auto: 'Drivo Auto Rickshaw'
    };

    const displayImage = vehicleImages[vehicleType] || vehicleImages.car;
    const displayLabel = vehicleLabels[vehicleType] || 'Drivo Ride';
    const fareAmount = fare && vehicleType && fare[vehicleType] !== undefined ? fare[vehicleType] : null;

    const handleConfirm = () => {
        setVehicleFound(true);
        setConfirmRidePanel(false);
        createRide();
    };

    return (
        <div 
            className='fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300'
            onClick={(e) => {
                // Click outside closes modal
                if (modalRef.current && !modalRef.current.contains(e.target)) {
                    setConfirmRidePanel(false);
                }
            }}
            role='dialog'
            aria-modal='true'
            aria-labelledby='confirm-ride-heading'
        >
            <div 
                ref={modalRef}
                className='bg-white text-slate-900 w-full sm:max-w-lg max-h-[90dvh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100 animate-in fade-in slide-in-from-bottom-6 sm:slide-in-from-bottom-2 duration-200'
            >
                {/* Mobile Pull Bar */}
                <div 
                    className='sm:hidden w-12 h-1 bg-slate-300 rounded-full mx-auto mt-3 cursor-pointer'
                    onClick={() => setConfirmRidePanel(false)}
                    aria-label="Dismiss sheet"
                ></div>

                {/* Header (Fixed / Non-scrolling) */}
                <div className='flex items-center justify-between px-5 pt-4 sm:pt-5 pb-3 border-b border-slate-100 flex-shrink-0'>
                    <div className='flex items-center gap-2.5'>
                        <div className='h-9 w-9 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-sm shadow-md'>
                            D
                        </div>
                        <div>
                            <h3 id='confirm-ride-heading' className='text-lg sm:text-xl font-black text-gray-900 tracking-tight leading-tight'>
                                Confirm your Ride
                            </h3>
                            <span className='text-[11px] font-semibold text-indigo-600'>
                                {displayLabel}
                            </span>
                        </div>
                    </div>
                    <button
                        type='button'
                        onClick={() => setConfirmRidePanel(false)}
                        className='h-8 w-8 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 rounded-full flex items-center justify-center transition-colors'
                        aria-label="Close modal"
                    >
                        <X className='h-4 w-4' />
                    </button>
                </div>

                {/* Scrollable Content Body */}
                <div className='flex-1 overflow-y-auto min-h-0 px-5 py-4 space-y-4 text-left'>
                    {/* Vehicle Hero Card */}
                    <div className='bg-gradient-to-tr from-slate-50 to-indigo-50/40 border border-slate-100 rounded-2xl p-4 flex items-center justify-between'>
                        <div>
                            <span className='text-[10px] font-bold uppercase tracking-wider text-slate-500 block'>Selected Service</span>
                            <div className='text-base font-extrabold text-slate-900'>{displayLabel}</div>
                            <div className='text-xs text-slate-500 mt-0.5'>Instant AI driver dispatch</div>
                        </div>
                        <img 
                            className='h-16 w-24 object-contain drop-shadow-md' 
                            src={displayImage} 
                            alt={displayLabel} 
                        />
                    </div>

                    {/* Route Details */}
                    <div className='space-y-2.5 bg-slate-50/70 border border-slate-100 rounded-2xl p-3.5'>
                        <div className='flex items-start gap-3'>
                            <div className='h-7 w-7 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5'>
                                <MapPin className='h-3.5 w-3.5' />
                            </div>
                            <div className='min-w-0 flex-1'>
                                <span className='text-[10px] font-bold text-slate-400 uppercase tracking-wider block'>Pickup Point</span>
                                <p className='text-xs sm:text-sm font-semibold text-slate-800 break-words mt-0.5'>
                                    {pickup || 'Pickup location not specified'}
                                </p>
                            </div>
                        </div>

                        <div className='border-t border-slate-200/60 my-1'></div>

                        <div className='flex items-start gap-3'>
                            <div className='h-7 w-7 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5'>
                                <Navigation className='h-3.5 w-3.5' />
                            </div>
                            <div className='min-w-0 flex-1'>
                                <span className='text-[10px] font-bold text-slate-400 uppercase tracking-wider block'>Destination</span>
                                <p className='text-xs sm:text-sm font-semibold text-slate-800 break-words mt-0.5'>
                                    {destination || 'Destination not specified'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Fare Summary Card */}
                    <div className='bg-amber-50/60 border border-amber-200/70 rounded-2xl p-3.5'>
                        <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-2'>
                                <div className='h-7 w-7 bg-amber-500/20 text-amber-700 rounded-lg flex items-center justify-center'>
                                    <Coins className='h-4 w-4' />
                                </div>
                                <div>
                                    <span className='text-[10px] font-bold text-amber-900 uppercase tracking-wider block'>Total Fare</span>
                                    <span className='text-[11px] text-amber-800'>Cash / UPI after trip completion</span>
                                </div>
                            </div>
                            <div className='text-right'>
                                <div className='text-xl sm:text-2xl font-black text-slate-900'>
                                    {fareAmount !== null ? `₹${fareAmount}` : '—'}
                                </div>
                                <span className='text-[9px] font-bold bg-amber-200/70 text-amber-900 px-1.5 py-0.5 rounded'>
                                    Locked Estimate
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Transparent Smart Match AI Assurance */}
                    <div className='bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-950 flex items-start gap-2.5'>
                        <ShieldCheck className='h-4 w-4 text-indigo-600 flex-shrink-0 mt-0.5' />
                        <div className='space-y-0.5'>
                            <div className='font-bold text-indigo-950 text-xs'>Smart AI Dispatch Active</div>
                            <p className='text-[11px] text-indigo-800/80 leading-relaxed'>
                                Intelligently matching top captain by proximity, arrival ETA, rating, and vehicle fit.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Fixed Footer with Actions (Always Visible and Accessible) */}
                <div 
                    className='p-4 sm:p-5 border-t border-slate-100 bg-white flex-shrink-0 flex items-center gap-3'
                    style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))' }}
                >
                    <button
                        type='button'
                        onClick={() => setConfirmRidePanel(false)}
                        className='py-3.5 px-5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition-all border border-slate-200/80'
                    >
                        Cancel
                    </button>
                    <button
                        type='button'
                        onClick={handleConfirm}
                        className='flex-1 py-3.5 px-6 bg-black hover:bg-slate-900 active:scale-[0.99] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xl shadow-slate-950/20 transition-all flex items-center justify-center gap-2 group'
                    >
                        <span>Confirm Ride</span>
                        <ArrowRight className='h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform' />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmRide;