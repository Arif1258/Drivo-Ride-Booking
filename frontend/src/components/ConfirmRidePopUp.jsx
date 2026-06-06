import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MapPin, Navigation, Coins, ShieldAlert } from 'lucide-react';

const ConfirmRidePopUp = (props) => {
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const submitHandler = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/rides/start-ride`, {
                rideId: props.ride._id,
                otp: otp
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('captain-token')}`
                }
            });

            if (response.status === 200) {
                props.setConfirmRidePopupPanel(false);
                props.setRidePopupPanel(false);
                navigate('/captain-riding', { state: { ride: response.data || props.ride } });
            }
        } catch (error) {
            console.error('Error starting ride:', error);
            alert(error.response?.data?.message || 'Failed to start ride. Please check the OTP and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {/* Pull Bar */}
            <div className='w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6 cursor-pointer' onClick={() => {
                props.setConfirmRidePopupPanel(false);
                props.setRidePopupPanel(false);
            }}></div>
            
            <h3 className='text-2xl font-black text-gray-900 tracking-tight mb-5'>Confirm & Start Trip</h3>
            
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
                            <h3 className='text-xs font-semibold text-gray-400 uppercase tracking-wider'>Ride Fare</h3>
                            <p className='text-base font-extrabold text-slate-900 mt-0.5'>₹{props.ride?.fare}</p>
                        </div>
                    </div>
                </div>

                <div className='mt-6 w-full'>
                    <form onSubmit={submitHandler} className='space-y-4'>
                        <div>
                            <label className='text-xs text-gray-400 font-bold uppercase tracking-wider block mb-1.5'>Passenger OTP</label>
                            <input 
                                value={otp} 
                                onChange={(e) => setOtp(e.target.value)} 
                                type="text" 
                                className='w-full px-6 py-4 font-mono text-center text-2xl tracking-widest bg-gray-50 border border-gray-250 rounded-xl focus:border-black focus:bg-white transition-all outline-none font-bold placeholder:text-sm placeholder:tracking-normal placeholder:font-sans' 
                                placeholder='Enter 6-digit OTP' 
                                required
                            />
                        </div>

                        <div className='space-y-2 pt-2'>
                            <button 
                                type="submit" 
                                disabled={loading}
                                className='w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2'
                            >
                                {loading ? (
                                    <div className='h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                                ) : (
                                    'Start Ride'
                                )}
                            </button>
                            <button 
                                type="button"
                                onClick={() => {
                                    props.setConfirmRidePopupPanel(false);
                                    props.setRidePopupPanel(false);
                                }} 
                                className='w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition-all'
                            >
                                Cancel Request
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ConfirmRidePopUp;