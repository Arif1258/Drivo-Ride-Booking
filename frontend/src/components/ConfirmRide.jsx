import React from 'react';
import { MapPin, Navigation, Coins } from 'lucide-react';

const ConfirmRide = (props) => {
    return (
        <div>
            {/* Pull Bar */}
            <div className='w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6 cursor-pointer' onClick={() => props.setConfirmRidePanel(false)}></div>
            
            <h3 className='text-2xl font-black text-gray-900 tracking-tight mb-5'>Confirm your Ride</h3>

            <div className='flex gap-4 justify-between flex-col items-center'>
                <img className='h-24 object-contain animate-float' src={props.vehicleType === 'motorcycle' || props.vehicleType === 'moto' ? '/Uber_Moto.webp' : props.vehicleType === 'auto' ? '/Uber_Auto.png' : 'https://swyft.pl/wp-content/uploads/2023/05/how-many-people-can-a-uberx-take.jpg'} alt={props.vehicleType} />
                
                <div className='w-full mt-4 space-y-4'>
                    <div className='flex items-start gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors'>
                        <div className='h-8 w-8 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5'>
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
                            <h3 className='text-xs font-semibold text-gray-400 uppercase tracking-wider'>Fares & Method</h3>
                            <p className='text-base font-extrabold text-slate-900 mt-0.5'>₹{props.fare[props.vehicleType]}</p>
                            <p className='text-[10px] text-gray-500 font-semibold'>Direct Cash / Wallet billing options</p>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={() => {
                        props.setVehicleFound(true);
                        props.setConfirmRidePanel(false);
                        props.createRide();
                    }} 
                    className='w-full mt-6 bg-black hover:bg-slate-900 text-white font-bold py-4 rounded-xl transition-all shadow-lg'
                >
                    Confirm Booking
                </button>
            </div>
        </div>
    );
};

export default ConfirmRide;