import React from 'react';
import { MapPin, Navigation, Coins, KeyRound, ShieldCheck, UserCheck, Loader2 } from 'lucide-react';

const WaitingForDriver = (props) => {
  const captain = props.ride?.captain;
  const hasCaptain = Boolean(captain && captain.fullname);
  const captainName = hasCaptain 
    ? `${captain.fullname.firstname || ''} ${captain.fullname.lastname || ''}`.trim()
    : 'Matching Captain...';

  return (
    <div>
      {/* Pull Bar */}
      <div 
        className='w-12 h-1 bg-gray-200 rounded-full mx-auto mb-5 cursor-pointer' 
        onClick={() => props.setWaitingForDriver ? props.setWaitingForDriver(false) : null}
      ></div>

      {/* Header with Driver Details & OTP */}
      <div className='flex items-center justify-between border-b pb-4 mb-4'>
        <div className='flex items-center gap-3'>
          <div className='relative'>
            <img 
              className='h-12 w-12 rounded-full object-cover border-2 border-indigo-100 shadow-sm' 
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRdlMd7stpWUCmjpfRjUsQ72xSWikidbgaI1w&s" 
              alt="Driver avatar" 
            />
            {hasCaptain && (
              <span className='absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow'>
                <UserCheck className='h-3 w-3' />
              </span>
            )}
          </div>
          <div>
            <div className='flex items-center gap-2'>
              <h2 className='text-lg font-bold capitalize text-gray-800'>
                {captainName}
              </h2>
              {hasCaptain && (
                <span className='text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded'>
                  ⭐ {captain.rating || 4.8}
                </span>
              )}
            </div>

            {hasCaptain ? (
              <p className='text-xs text-gray-500 capitalize'>
                {captain.vehicle?.color || ''} {captain.vehicle?.color ? '•' : ''} {captain.vehicle?.vehicleType || props.ride?.vehicleType || 'Ride'}
              </p>
            ) : (
              <div className='flex items-center gap-1.5 text-xs text-indigo-600 font-semibold mt-0.5'>
                <Loader2 className='h-3 w-3 animate-spin' />
                <span>Assigning best rated driver...</span>
              </div>
            )}

            {props.ride?.matchFactors?.totalScore && (
              <span className='inline-block text-[10px] text-indigo-700 bg-indigo-50 font-bold px-2 py-0.5 rounded-full border border-indigo-100 mt-1'>
                Smart Match Score: {props.ride.matchFactors.totalScore}/100
              </span>
            )}
          </div>
        </div>

        <div className='text-right'>
          <h4 className='text-lg font-extrabold text-blue-600 tracking-tight'>
            {hasCaptain ? (captain.vehicle?.plate || 'Assigned') : 'Nearby'}
          </h4>
          <span className='inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-black border border-amber-500/30 shadow-sm mt-1'>
            <KeyRound className='h-3.5 w-3.5 text-amber-600' /> OTP: {props.ride?.otp || '------'}
          </span>
        </div>
      </div>

      {/* Prominent OTP Security Banner */}
      <div className='bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-amber-500/30 rounded-2xl p-3 mb-4 flex items-center justify-between'>
        <div className='flex items-center gap-2.5'>
          <div className='h-9 w-9 bg-amber-500/20 text-amber-700 rounded-xl flex items-center justify-center font-bold'>
            <ShieldCheck className='h-5 w-5' />
          </div>
          <div>
            <div className='text-xs font-bold text-amber-950'>Your Trip OTP for Captain Verification</div>
            <div className='text-[11px] text-amber-800/80'>Provide this code only when sitting inside the vehicle</div>
          </div>
        </div>
        <div className='text-xl font-black text-amber-900 tracking-widest font-mono bg-white px-3 py-1 rounded-xl border border-amber-200 shadow-sm'>
          {props.ride?.otp || '------'}
        </div>
      </div>

      {/* Route & Pricing Details */}
      <div className='flex gap-2 justify-between flex-col items-center'>
        <div className='w-full space-y-3'>
          <div className='flex items-start gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors'>
            <div className='h-8 w-8 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5'>
              <MapPin className='h-4 w-4' />
            </div>
            <div>
              <h3 className='text-xs font-semibold text-gray-400 uppercase tracking-wider'>Pickup Location</h3>
              <p className='text-sm font-semibold text-gray-800 mt-0.5'>{props.ride?.pickup || 'Pickup location'}</p>
            </div>
          </div>
          
          <div className='flex items-start gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors'>
            <div className='h-8 w-8 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5'>
              <Navigation className='h-4 w-4' />
            </div>
            <div>
              <h3 className='text-xs font-semibold text-gray-400 uppercase tracking-wider'>Destination Location</h3>
              <p className='text-sm font-semibold text-gray-800 mt-0.5'>{props.ride?.destination || 'Destination location'}</p>
            </div>
          </div>
          
          <div className='flex items-start gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors'>
            <div className='h-8 w-8 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5'>
              <Coins className='h-4 w-4' />
            </div>
            <div>
              <h3 className='text-xs font-semibold text-gray-400 uppercase tracking-wider'>Ride Fare</h3>
              <p className='text-lg font-black text-gray-950 mt-0.5'>₹{props.ride?.fare || '—'}</p>
              <p className='text-[10px] text-gray-500 font-semibold'>Collect via Cash or Digital Wallet once completed</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            if (props.cancelRide) {
              props.cancelRide();
            } else if (props.setWaitingForDriver) {
              props.setWaitingForDriver(false);
            }
          }}
          className='w-full mt-4 py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl border border-rose-200 transition-all text-sm'
        >
          Cancel Ride
        </button>
      </div>
    </div>
  );
};

export default WaitingForDriver;