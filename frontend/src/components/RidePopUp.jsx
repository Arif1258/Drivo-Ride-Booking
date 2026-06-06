import React from 'react';
import { MapPin, Navigation, Coins } from 'lucide-react';

const RidePopUp = (props) => {
    return (
        <div>
            {/* Pull Bar */}
            <div className='w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6 cursor-pointer' onClick={() => props.setRidePopupPanel(false)}></div>
            
            <h3 className='text-2xl font-black text-gray-900 tracking-tight mb-5'>New Request Available!</h3>
            
            <div className='flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl mb-6'>
                <div className='flex items-center gap-3 '>
                    <img className='h-12 w-12 rounded-full object-cover border-2 border-white shadow' src="https://i.pinimg.com/236x/af/26/28/af26280b0ca305be47df0b799ed1b12b.jpg" alt="Passenger" />
                    <div>
                        <h2 className='text-base font-bold text-gray-800 capitalize'>{props.ride?.user.fullname.firstname} {props.ride?.user.fullname.lastname}</h2>
                        <span className='text-[10px] bg-blue-600 text-white font-bold uppercase px-2 py-0.5 rounded'>Passenger</span>
                    </div>
                </div>
                <div className='text-right'>
                    <h5 className='text-lg font-black text-blue-600'>2.2 KM</h5>
                    <span className='text-[10px] text-gray-500 font-semibold'>Distance to pickup</span>
                </div>
            </div>

            <div className='flex gap-4 justify-between flex-col items-center'>
                <div className='w-full space-y-4'>
                    <div className='flex items-start gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors'>
                        <div className='h-8 w-8 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5'>
                            <MapPin className='h-4 w-4' />
                        </div>
                        <div>
                            <h3 className='text-xs font-semibold text-gray-400 uppercase tracking-wider'>Pickup</h3>
                            <p className='text-sm font-semibold text-gray-800 mt-0.5'>{props.ride?.pickup}</p>
                        </div>
                    </div>
                    
                    <div className='flex items-start gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors'>
                        <div className='h-8 w-8 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5'>
                            <Navigation className='h-4 w-4' />
                        </div>
                        <div>
                            <h3 className='text-xs font-semibold text-gray-400 uppercase tracking-wider'>Destination</h3>
                            <p className='text-sm font-semibold text-gray-800 mt-0.5'>{props.ride?.destination}</p>
                        </div>
                    </div>
                    
                    <div className='flex items-start gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors'>
                        <div className='h-8 w-8 bg-yellow-550/10 text-yellow-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5'>
                            <Coins className='h-4 w-4' />
                        </div>
                        <div>
                            <h3 className='text-xs font-semibold text-gray-400 uppercase tracking-wider'>Payout</h3>
                            <p className='text-lg font-black text-gray-950 mt-0.5'>₹{props.ride?.fare}</p>
                        </div>
                    </div>
                </div>

                <div className='flex items-center gap-3 w-full mt-6'>
                    <button 
                        onClick={() => props.setRidePopupPanel(false)} 
                        className='flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all'
                    >
                        Ignore
                    </button>
                    <button 
                        onClick={props.confirmRide} 
                        className='flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-250'
                    >
                        Accept Ride
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RidePopUp;