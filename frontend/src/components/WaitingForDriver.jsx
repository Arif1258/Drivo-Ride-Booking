import React from 'react';
import { MapPin, Navigation, Coins, KeyRound } from 'lucide-react';

const WaitingForDriver = (props) => {
  return (
    <div>
      {/* Pull Bar */}
      <div className='w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6 cursor-pointer' onClick={() => props.setWaitingForDriver(false)}></div>

      <div className='flex items-center justify-between border-b pb-4 mb-4'>
        <div className='flex items-center gap-3'>
          <img className='h-12 w-12 rounded-full object-cover border' src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRdlMd7stpWUCmjpfRjUsQ72xSWikidbgaI1w&s" alt="Driver" />
          <div>
            <h2 className='text-lg font-bold capitalize text-gray-800'>{props.ride?.captain.fullname.firstname}</h2>
            <p className='text-xs text-gray-500 capitalize'>{props.ride?.captain.vehicle.color} • {props.ride?.captain.vehicle.vehicleType}</p>
          </div>
        </div>
        <div className='text-right'>
          <h4 className='text-lg font-extrabold text-blue-600'>{props.ride?.captain.vehicle.plate}</h4>
          <span className='inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-50 text-yellow-600 rounded-full text-xs font-bold border border-yellow-500/20 shadow-sm mt-1'>
            <KeyRound className='h-3.5 w-3.5' /> OTP: {props.ride?.otp}
          </span>
        </div>
      </div>

      <div className='flex gap-2 justify-between flex-col items-center'>
        <div className='w-full space-y-4'>
          <div className='flex items-start gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors'>
            <div className='h-8 w-8 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5'>
              <MapPin className='h-4 w-4' />
            </div>
            <div>
              <h3 className='text-xs font-semibold text-gray-400 uppercase tracking-wider'>Pickup Location</h3>
              <p className='text-sm font-semibold text-gray-800 mt-0.5'>{props.ride?.pickup}</p>
            </div>
          </div>
          
          <div className='flex items-start gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors'>
            <div className='h-8 w-8 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5'>
              <Navigation className='h-4 w-4' />
            </div>
            <div>
              <h3 className='text-xs font-semibold text-gray-400 uppercase tracking-wider'>Destination Location</h3>
              <p className='text-sm font-semibold text-gray-800 mt-0.5'>{props.ride?.destination}</p>
            </div>
          </div>
          
          <div className='flex items-start gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors'>
            <div className='h-8 w-8 bg-yellow-550/10 text-yellow-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5'>
              <Coins className='h-4 w-4' />
            </div>
            <div>
              <h3 className='text-xs font-semibold text-gray-400 uppercase tracking-wider'>Ride Fare</h3>
              <p className='text-lg font-black text-gray-950 mt-0.5'>₹{props.ride?.fare}</p>
              <p className='text-[10px] text-gray-500 font-semibold'>Collect via Cash or Digital Wallet once completed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaitingForDriver;