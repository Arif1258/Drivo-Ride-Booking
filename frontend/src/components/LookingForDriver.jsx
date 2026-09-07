import React from 'react';
import { MapPin, Navigation, Coins } from 'lucide-react';

const LookingForDriver = (props) => {
    return (
        <div>
            {/* Pull Bar */}
            <div className='w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6 cursor-pointer' onClick={() => props.setVehicleFound(false)}></div>
            
            {/* Pulsing Searching Animation with AI Indicator */}
            <div className='flex flex-col items-center justify-center py-3'>
                <div className='relative flex items-center justify-center mb-4'>
                    <div className='absolute h-16 w-16 bg-indigo-500/20 rounded-full animate-ping'></div>
                    <div className='h-12 w-12 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 text-white font-bold text-lg relative z-10'>
                        🤖
                    </div>
                </div>
                <h3 className='text-xl font-black text-gray-900 tracking-tight text-center'>AI Driver-Rider Matching</h3>
                <p className='text-xs text-gray-500 mt-1 text-center'>Intelligently ranking captains by proximity, rating, and acceptance</p>

                {/* AI Matching Criteria Pill */}
                <div className='mt-3 flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full text-[11px] font-semibold text-indigo-700'>
                    <span className='h-2 w-2 rounded-full bg-indigo-500 animate-pulse'></span>
                    <span>Scoring candidates: ETA • Proximity • Reliability</span>
                </div>
            </div>

            <div className='flex gap-4 justify-between flex-col items-center mt-4'>
                <div className='w-full space-y-4 border-t pt-4'>
                    <div className='flex items-start gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors'>
                        <div className='h-8 w-8 bg-emerald-550/10 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5'>
                            <MapPin className='h-4 w-4' />
                        </div>
                        <div>
                            <h3 className='text-xs font-semibold text-gray-400 uppercase tracking-wider'>Pickup</h3>
                            <p className='text-sm font-semibold text-gray-800 mt-0.5'>{props.pickup}</p>
                        </div>
                    </div>
                    
                    <div className='flex items-start gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors'>
                        <div className='h-8 w-8 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5'>
                            <Navigation className='h-4 w-4' />
                        </div>
                        <div>
                            <h3 className='text-xs font-semibold text-gray-400 uppercase tracking-wider'>Destination</h3>
                            <p className='text-sm font-semibold text-gray-800 mt-0.5'>{props.destination}</p>
                        </div>
                    </div>
                    
                    <div className='flex items-start gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors'>
                        <div className='h-8 w-8 bg-yellow-550/10 text-yellow-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5'>
                            <Coins className='h-4 w-4' />
                        </div>
                        <div>
                            <h3 className='text-xs font-semibold text-gray-400 uppercase tracking-wider'>Estimated Fare</h3>
                            <p className='text-base font-extrabold text-slate-900 mt-0.5'>₹{props.fare[props.vehicleType]}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LookingForDriver;