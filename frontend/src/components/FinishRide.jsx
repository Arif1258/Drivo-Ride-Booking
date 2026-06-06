import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Coins } from 'lucide-react';

const FinishRide = (props) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    async function endRide() {
        setLoading(true);
        try {
            const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/rides/end-ride`, {
                rideId: props.ride._id
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('captain-token')}`
                }
            });

            if (response.status === 200) {
                navigate('/captain-home');
            }
        } catch (error) {
            console.error('Error ending ride:', error);
            alert(error.response?.data?.message || 'Failed to finish ride. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            {/* Pull Bar */}
            <div className='w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6 cursor-pointer' onClick={() => props.setFinishRidePanel(false)}></div>
            
            <h3 className='text-2xl font-black text-gray-900 tracking-tight mb-5'>Finish this Ride</h3>
            
            <div className='flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-2xl mb-6'>
                <div className='flex items-center gap-3 '>
                    <img className='h-12 w-12 rounded-full object-cover border border-yellow-300 shadow' src="https://i.pinimg.com/236x/af/26/28/af26280b0ca305be47df0b799ed1b12b.jpg" alt="Passenger" />
                    <div>
                        <h2 className='text-base font-bold text-gray-800 capitalize'>{props.ride?.user.fullname.firstname}</h2>
                        <span className='text-[10px] bg-yellow-600 text-white font-bold uppercase px-2 py-0.5 rounded'>Passenger</span>
                    </div>
                </div>
                <div className='text-right'>
                    <h5 className='text-lg font-black text-yellow-700'>2.2 KM</h5>
                </div>
            </div>

            <div className='flex gap-2 justify-between flex-col items-center'>
                <div className='w-full space-y-4 border-b pb-6'>
                    <div className='flex items-start gap-4 p-2 hover:bg-gray-50 rounded-xl transition-colors'>
                        <div className='h-8 w-8 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5'>
                            <MapPin className='h-4 w-4' />
                        </div>
                        <div>
                            <h3 className='text-xs font-semibold text-gray-400 uppercase tracking-wider'>Pickup</h3>
                            <p className='text-sm font-semibold text-gray-800 mt-0.5'>{props.ride?.pickup}</p>
                        </div>
                    </div>
                    
                    <div className='flex items-start gap-4 p-2 hover:bg-gray-50 rounded-xl transition-colors'>
                        <div className='h-8 w-8 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5'>
                            <Navigation className='h-4 w-4' />
                        </div>
                        <div>
                            <h3 className='text-xs font-semibold text-gray-400 uppercase tracking-wider'>Destination</h3>
                            <p className='text-sm font-semibold text-gray-800 mt-0.5'>{props.ride?.destination}</p>
                        </div>
                    </div>
                    
                    <div className='flex items-start gap-4 p-2 hover:bg-gray-50 rounded-xl transition-colors'>
                        <div className='h-8 w-8 bg-yellow-550/10 text-yellow-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5'>
                            <Coins className='h-4 w-4' />
                        </div>
                        <div>
                            <h3 className='text-xs font-semibold text-gray-400 uppercase tracking-wider'>Payout Earnings</h3>
                            <p className='text-base font-extrabold text-slate-900 mt-0.5'>₹{props.ride?.fare}</p>
                        </div>
                    </div>
                </div>

                <div className='mt-6 w-full'>
                    <button
                        onClick={endRide}
                        disabled={loading}
                        className='w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50'
                    >
                        {loading ? (
                            <div className='h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                        ) : (
                            'Finish Trip & Request Payment'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FinishRide;