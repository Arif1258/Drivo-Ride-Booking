import React from 'react';
import { User, Clock, ChevronRight } from 'lucide-react';

const VehiclePanel = (props) => {
    return (
        <div>
            {/* Pull Bar */}
            <div className='w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6 cursor-pointer' onClick={() => props.setVehiclePanel(false)}></div>
            
            <h3 className='text-2xl font-black text-gray-900 tracking-tight mb-5'>Choose a Ride</h3>
            
            <div className='space-y-3'>
                {/* DrivoGo (Car) Option */}
                <div 
                    onClick={() => {
                        props.setConfirmRidePanel(true);
                        props.selectVehicle('car');
                    }} 
                    className='flex border border-gray-100 hover:border-black active:border-black rounded-2xl w-full p-4 items-center justify-between cursor-pointer transition-all hover:scale-[1.01] hover:shadow-sm bg-gray-50/50'
                >
                    <div className='flex items-center gap-4'>
                        <img className='h-12 w-16 object-contain' src="https://swyft.pl/wp-content/uploads/2023/05/how-many-people-can-a-uberx-take.jpg" alt="Car" />
                        <div>
                            <h4 className='font-bold text-sm text-gray-800 flex items-center gap-1.5'>
                                DrivoGo 
                                <span className='inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-semibold'>
                                    <User className='h-3 w-3' /> 4
                                </span>
                            </h4>
                            <h5 className='font-semibold text-xs text-blue-600 flex items-center gap-1 mt-0.5'><Clock className='h-3 w-3' /> 2 mins away</h5>
                            <p className='font-medium text-[11px] text-gray-550 mt-0.5'>Affordable, compact rides</p>
                        </div>
                    </div>
                    <div className='text-right flex items-center gap-2'>
                        <h2 className='text-lg font-black text-gray-950'>₹{props.fare.car}</h2>
                        <ChevronRight className='h-4 w-4 text-gray-400' />
                    </div>
                </div>

                {/* Moto Option */}
                <div 
                    onClick={() => {
                        props.setConfirmRidePanel(true);
                        props.selectVehicle('moto');
                    }} 
                    className='flex border border-gray-100 hover:border-black active:border-black rounded-2xl w-full p-4 items-center justify-between cursor-pointer transition-all hover:scale-[1.01] hover:shadow-sm bg-gray-50/50'
                >
                    <div className='flex items-center gap-4'>
                        <img className='h-12 w-16 object-contain' src="/Uber_Moto.webp" alt="Moto" />
                        <div>
                            <h4 className='font-bold text-sm text-gray-800 flex items-center gap-1.5'>
                                DrivoMoto 
                                <span className='inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-semibold'>
                                    <User className='h-3 w-3' /> 1
                                </span>
                            </h4>
                            <h5 className='font-semibold text-xs text-blue-600 flex items-center gap-1 mt-0.5'><Clock className='h-3 w-3' /> 3 mins away</h5>
                            <p className='font-medium text-[11px] text-gray-550 mt-0.5'>Affordable motorcycle rides</p>
                        </div>
                    </div>
                    <div className='text-right flex items-center gap-2'>
                        <h2 className='text-lg font-black text-gray-950'>₹{props.fare.moto}</h2>
                        <ChevronRight className='h-4 w-4 text-gray-400' />
                    </div>
                </div>

                {/* Auto Option */}
                <div 
                    onClick={() => {
                        props.setConfirmRidePanel(true);
                        props.selectVehicle('auto');
                    }} 
                    className='flex border border-gray-100 hover:border-black active:border-black rounded-2xl w-full p-4 items-center justify-between cursor-pointer transition-all hover:scale-[1.01] hover:shadow-sm bg-gray-50/50'
                >
                    <div className='flex items-center gap-4'>
                        <img className='h-12 w-16 object-contain' src="/Uber_Auto.png" alt="Auto" />
                        <div>
                            <h4 className='font-bold text-sm text-gray-800 flex items-center gap-1.5'>
                                DrivoAuto 
                                <span className='inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-semibold'>
                                    <User className='h-3 w-3' /> 3
                                </span>
                            </h4>
                            <h5 className='font-semibold text-xs text-blue-600 flex items-center gap-1 mt-0.5'><Clock className='h-3 w-3' /> 3 mins away</h5>
                            <p className='font-medium text-[11px] text-gray-550 mt-0.5'>Affordable local auto rides</p>
                        </div>
                    </div>
                    <div className='text-right flex items-center gap-2'>
                        <h2 className='text-lg font-black text-gray-950'>₹{props.fare.auto}</h2>
                        <ChevronRight className='h-4 w-4 text-gray-400' />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VehiclePanel;