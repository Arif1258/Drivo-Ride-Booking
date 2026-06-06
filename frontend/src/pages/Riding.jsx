import React, { useState, useEffect, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SocketContext } from '../context/SocketContext';
import LiveTracking from '../components/LiveTracking';
import axios from 'axios';

const Riding = () => {
    const location = useLocation();
    const { ride: initialRide } = location.state || {};
    const { socket } = useContext(SocketContext);
    const navigate = useNavigate();

    const [ride, setRide] = useState(initialRide);
    const [showPayment, setShowPayment] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('card');
    const [paymentStatus, setPaymentStatus] = useState('idle'); // 'idle' | 'processing' | 'success' | 'failed'
    const [paymentDetails, setPaymentDetails] = useState(null);
    const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '' });
    const [upiId, setUpiId] = useState('');

    useEffect(() => {
        socket.on("ride-ended", (data) => {
            console.log("Ride ended event received from socket:", data);
            // Update ride data status to payment-pending
            setRide(prev => ({ ...prev, status: 'payment-pending' }));
            setShowPayment(true);
        });

        return () => {
            socket.off("ride-ended");
        };
    }, [socket]);

    const handlePayment = async () => {
        if (paymentMethod === 'card' && (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvv)) {
            alert('Please fill all card details');
            return;
        }
        if (paymentMethod === 'upi' && !upiId.includes('@')) {
            alert('Please enter a valid UPI ID');
            return;
        }

        setPaymentStatus('processing');
        
        try {
            // Simulated network delay for premium feel
            await new Promise(resolve => setTimeout(resolve, 2000));

            const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/payments/process`, {
                rideId: ride._id,
                paymentMethod
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.status === 200) {
                setPaymentDetails(response.data);
                setPaymentStatus('success');
            } else {
                setPaymentStatus('failed');
            }
        } catch (error) {
            console.error('Payment processing failed:', error);
            setPaymentStatus('failed');
        }
    };

    const downloadReceipt = () => {
        window.print();
    };

    return (
        <div className='h-screen relative font-sans text-gray-900 bg-gray-50 print:bg-white'>
            <div className='print:hidden'>
                <Link to='/home' className='fixed right-4 top-4 h-12 w-12 bg-white/90 backdrop-blur shadow-lg flex items-center justify-center rounded-full z-50 hover:scale-105 transition-all'>
                    <i className="text-xl font-semibold ri-home-5-line"></i>
                </Link>
            </div>

            {/* Top Half: Live Map (hidden on print) */}
            <div className='h-1/2 print:hidden'>
                <LiveTracking ride={ride} />
            </div>

            {/* Bottom Half: Ride Details & Payment Triggers */}
            <div className='h-1/2 p-6 bg-white rounded-t-3xl shadow-2xl relative flex flex-col justify-between print:hidden'>
                <div>
                    <div className='flex items-center justify-between border-b pb-4'>
                        <img 
                            className='h-14 object-contain' 
                            src={ride?.captain.vehicle.vehicleType === 'motorcycle' || ride?.captain.vehicle.vehicleType === 'moto' ? '/Uber_Moto.webp' : ride?.captain.vehicle.vehicleType === 'auto' ? '/Uber_Auto.png' : 'https://swyft.pl/wp-content/uploads/2023/05/how-many-people-can-a-uberx-take.jpg'} 
                            alt={ride?.captain.vehicle.vehicleType} 
                        />
                        <div className='text-right'>
                            <h2 className='text-lg font-bold capitalize text-gray-800'>{ride?.captain.fullname.firstname}</h2>
                            <h4 className='text-xl font-extrabold text-blue-600 -mt-1'>{ride?.captain.vehicle.plate}</h4>
                            <p className='text-xs text-gray-500 capitalize'>{ride?.captain.vehicle.color} • {ride?.captain.vehicle.vehicleType}</p>
                        </div>
                    </div>

                    <div className='mt-6 space-y-4'>
                        <div className='flex items-center gap-4'>
                            <div className='h-10 w-10 bg-blue-550/10 text-blue-600 rounded-full flex items-center justify-center'>
                                <i className="text-lg ri-map-pin-2-fill"></i>
                            </div>
                            <div>
                                <h3 className='text-sm font-semibold text-gray-500'>Destination</h3>
                                <p className='text-sm font-medium text-gray-800 line-clamp-1'>{ride?.destination}</p>
                            </div>
                        </div>
                        <div className='flex items-center gap-4'>
                            <div className='h-10 w-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center'>
                                <i className="text-lg ri-currency-line"></i>
                            </div>
                            <div>
                                <h3 className='text-sm font-semibold text-gray-500'>Ride Fare</h3>
                                <p className='text-lg font-bold text-green-600'>₹{ride?.fare}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className='pt-4'>
                    <button 
                        onClick={() => setShowPayment(true)} 
                        className='w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2'
                    >
                        <i className="ri-wallet-3-line"></i> Make a Payment
                    </button>
                </div>
            </div>

            {/* Payment Modal Overlay */}
            {showPayment && (
                <div className='absolute inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-end justify-center transition-all animate-fade-in print:bg-white print:p-0'>
                    <div className='bg-white w-full max-w-md rounded-t-3xl p-6 shadow-2xl flex flex-col max-h-[90%] overflow-y-auto print:shadow-none print:max-h-full print:p-0'>
                        {/* Pull Bar */}
                        <div className='w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6 print:hidden'></div>

                        {paymentStatus === 'idle' && (
                            <>
                                <div className='flex justify-between items-center mb-6 print:hidden'>
                                    <h3 className='text-2xl font-black text-gray-900'>Select Payment</h3>
                                    <button onClick={() => setShowPayment(false)} className='text-gray-400 hover:text-gray-600'>
                                        <i className="text-2xl ri-close-line"></i>
                                    </button>
                                </div>

                                <div className='space-y-3 print:hidden'>
                                    {[
                                        { id: 'card', label: 'Credit/Debit Card', icon: 'ri-bank-card-line' },
                                        { id: 'upi', label: 'UPI / GooglePay / PhonePe', icon: 'ri-smartphone-line' },
                                        { id: 'wallet', label: 'Drivo Wallet', icon: 'ri-wallet-line' },
                                        { id: 'netbanking', label: 'Net Banking', icon: 'ri-bank-line' },
                                        { id: 'cash', label: 'Cash Payment', icon: 'ri-coins-line' }
                                    ].map(method => (
                                        <label 
                                            key={method.id} 
                                            className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === method.id ? 'border-blue-600 bg-blue-50/50 shadow-sm' : 'border-gray-100 hover:border-gray-200'}`}
                                        >
                                            <div className='flex items-center gap-3'>
                                                <i className={`text-xl ${method.icon} ${paymentMethod === method.id ? 'text-blue-600' : 'text-gray-400'}`}></i>
                                                <span className='font-semibold text-gray-800'>{method.label}</span>
                                            </div>
                                            <input 
                                                type="radio" 
                                                name="paymentMethod" 
                                                checked={paymentMethod === method.id}
                                                onChange={() => setPaymentMethod(method.id)}
                                                className='h-5 w-5 text-blue-600 focus:ring-blue-500'
                                            />
                                        </label>
                                    ))}
                                </div>

                                {/* Dynamic Fields */}
                                <div className='mt-6 print:hidden'>
                                    {paymentMethod === 'card' && (
                                        <div className='space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100'>
                                            <input 
                                                type="text" 
                                                placeholder="Card Number" 
                                                value={cardDetails.number}
                                                onChange={e => setCardDetails(prev => ({ ...prev, number: e.target.value }))}
                                                className='w-full p-3 bg-white border border-gray-200 rounded-lg text-sm font-mono'
                                            />
                                            <div className='grid grid-cols-2 gap-3'>
                                                <input 
                                                    type="text" 
                                                    placeholder="MM/YY" 
                                                    value={cardDetails.expiry}
                                                    onChange={e => setCardDetails(prev => ({ ...prev, expiry: e.target.value }))}
                                                    className='p-3 bg-white border border-gray-200 rounded-lg text-sm font-mono text-center'
                                                />
                                                <input 
                                                    type="password" 
                                                    placeholder="CVV" 
                                                    maxLength="3"
                                                    value={cardDetails.cvv}
                                                    onChange={e => setCardDetails(prev => ({ ...prev, cvv: e.target.value }))}
                                                    className='p-3 bg-white border border-gray-200 rounded-lg text-sm font-mono text-center'
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {paymentMethod === 'upi' && (
                                        <div className='bg-gray-50 p-4 rounded-xl border border-gray-100'>
                                            <input 
                                                type="text" 
                                                placeholder="example@upi" 
                                                value={upiId}
                                                onChange={e => setUpiId(e.target.value)}
                                                className='w-full p-3 bg-white border border-gray-200 rounded-lg text-sm font-mono'
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className='mt-6 pt-4 border-t print:hidden'>
                                    <div className='flex justify-between items-center mb-4'>
                                        <span className='text-gray-500 font-medium'>Total Amount</span>
                                        <span className='text-2xl font-black text-gray-950'>₹{ride?.fare}</span>
                                    </div>
                                    <button 
                                        onClick={handlePayment}
                                        className='w-full py-4 bg-black hover:bg-slate-900 text-white font-bold rounded-xl transition-all'
                                    >
                                        Pay Now
                                    </button>
                                </div>
                            </>
                        )}

                        {paymentStatus === 'processing' && (
                            <div className='py-12 flex flex-col items-center justify-center space-y-4 print:hidden'>
                                <div className='h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin'></div>
                                <h3 className='text-xl font-bold text-gray-800'>Processing Payment...</h3>
                                <p className='text-sm text-gray-500'>Please do not close or reload this page</p>
                            </div>
                        )}

                        {paymentStatus === 'success' && paymentDetails && (
                            <div className='py-6 flex flex-col justify-between h-full'>
                                {/* Header */}
                                <div className='text-center space-y-2 mb-6 print:hidden'>
                                    <div className='h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl'>
                                        <i className="ri-checkbox-circle-fill"></i>
                                    </div>
                                    <h3 className='text-2xl font-black text-gray-900'>Payment Success!</h3>
                                    <p className='text-sm text-gray-500'>Thank you for riding with Drivo</p>
                                </div>

                                {/* Receipt Sheet */}
                                <div className='bg-gray-50 p-6 rounded-2xl border border-dashed border-gray-200 font-mono text-sm space-y-4 print:bg-white print:border-none print:p-0'>
                                    <div className='text-center pb-4 border-b border-gray-200'>
                                        <h2 className='text-lg font-black tracking-widest'>DRIVO INVOICE</h2>
                                        <p className='text-xs text-gray-400 mt-1'>{new Date(paymentDetails.createdAt).toLocaleString()}</p>
                                    </div>

                                    <div className='space-y-2 pb-4 border-b border-gray-200'>
                                        <div className='flex justify-between'>
                                            <span className='text-gray-400'>Payment ID:</span>
                                            <span className='text-gray-800 font-semibold'>{paymentDetails.paymentId}</span>
                                        </div>
                                        <div className='flex justify-between'>
                                            <span className='text-gray-400'>Transaction ID:</span>
                                            <span className='text-gray-800 font-semibold'>{paymentDetails.transactionId}</span>
                                        </div>
                                        <div className='flex justify-between'>
                                            <span className='text-gray-400'>Method:</span>
                                            <span className='text-gray-800 font-semibold capitalize'>{paymentDetails.paymentMethod}</span>
                                        </div>
                                    </div>

                                    <div className='space-y-2 pb-4 border-b border-gray-200'>
                                        <div className='flex justify-between'>
                                            <span className='text-gray-400'>Fare:</span>
                                            <span className='text-gray-800 font-semibold'>₹{paymentDetails.amount}</span>
                                        </div>
                                        <div className='flex justify-between'>
                                            <span className='text-gray-400'>Tax / Fees (0%):</span>
                                            <span className='text-gray-800 font-semibold'>₹0</span>
                                        </div>
                                    </div>

                                    <div className='flex justify-between text-base font-black pt-2'>
                                        <span>PAID AMOUNT</span>
                                        <span className='text-green-600'>₹{paymentDetails.amount}</span>
                                    </div>
                                </div>

                                {/* Controls */}
                                <div className='mt-8 space-y-3 print:hidden'>
                                    <button 
                                        onClick={downloadReceipt}
                                        className='w-full py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded-xl flex items-center justify-center gap-2'
                                    >
                                        <i className="ri-printer-line"></i> Print Receipt
                                    </button>
                                    <button 
                                        onClick={() => navigate('/home')}
                                        className='w-full py-4 bg-black hover:bg-slate-900 text-white font-bold rounded-xl transition-all'
                                    >
                                        Back to Home
                                    </button>
                                </div>
                            </div>
                        )}

                        {paymentStatus === 'failed' && (
                            <div className='py-12 text-center space-y-6 print:hidden'>
                                <div className='h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-3xl animate-bounce'>
                                    <i className="ri-error-warning-fill"></i>
                                </div>
                                <div className='space-y-2'>
                                    <h3 className='text-2xl font-black text-gray-900'>Payment Failed</h3>
                                    <p className='text-sm text-gray-500'>There was an error processing your transaction. Please try another method.</p>
                                </div>
                                <button 
                                    onClick={() => setPaymentStatus('idle')}
                                    className='w-full py-4 bg-black hover:bg-slate-900 text-white font-bold rounded-xl transition-all'
                                >
                                    Try Again
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Riding;