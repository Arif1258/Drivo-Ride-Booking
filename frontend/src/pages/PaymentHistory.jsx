import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const PaymentHistory = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/payments/user-history`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });
                if (response.status === 200) {
                    setHistory(response.data);
                }
            } catch (error) {
                console.error('Error fetching payment history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    const printInvoice = (payment) => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Invoice - ${payment.paymentId}</title>
                    <style>
                        body { font-family: monospace; padding: 20px; text-align: left; }
                        hr { border-top: 1px dashed #000; }
                        .flex { display: flex; justify-content: space-between; }
                    </style>
                </head>
                <body>
                    <h2 style="text-align: center;">DRIVO INVOICE</h2>
                    <p style="text-align: center;">Date: ${new Date(payment.createdAt).toLocaleString()}</p>
                    <hr />
                    <div class="flex"><p>Payment ID:</p><p>${payment.paymentId}</p></div>
                    <div class="flex"><p>Transaction ID:</p><p>${payment.transactionId}</p></div>
                    <div class="flex"><p>Method:</p><p>${payment.paymentMethod.toUpperCase()}</p></div>
                    <div class="flex"><p>From Pickup:</p><p>${payment.rideId?.pickup}</p></div>
                    <div class="flex"><p>To Destination:</p><p>${payment.rideId?.destination}</p></div>
                    <hr />
                    <div class="flex"><h3>TOTAL AMOUNT:</h3><h3>₹${payment.amount}</h3></div>
                    <hr />
                    <p style="text-align: center; margin-top: 40px;">Thank you for riding with Drivo!</p>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    if (loading) {
        return (
            <div className='h-screen w-screen flex flex-col justify-center items-center bg-gray-50'>
                <div className='h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4'></div>
                <p className='text-sm text-gray-500'>Loading transactions...</p>
            </div>
        );
    }

    return (
        <div className='min-h-screen bg-gray-50 p-6'>
            {/* Header */}
            <div className='flex justify-between items-center mb-8 max-w-md mx-auto'>
                <Link to='/home' className='h-10 w-10 bg-white border shadow-sm rounded-full flex items-center justify-center hover:bg-gray-50 transition-all'>
                    <i className="text-lg ri-arrow-left-line"></i>
                </Link>
                <h1 className='text-xl font-bold text-gray-900'>My Payments</h1>
                <div className='h-10 w-10 bg-white border shadow-sm rounded-full flex items-center justify-center'>
                    <i className="text-lg ri-bank-card-line text-blue-600"></i>
                </div>
            </div>

            <div className='max-w-md mx-auto space-y-4'>
                {history.length === 0 ? (
                    <div className='text-center py-12 bg-white rounded-xl border border-gray-150 text-gray-400 text-sm'>
                        No transaction records found.
                    </div>
                ) : (
                    history.map(item => (
                        <div key={item._id} className='bg-white border p-4 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3'>
                            <div className='flex items-center justify-between'>
                                <div>
                                    <span className='text-xs text-gray-400 font-mono'>{item.paymentId}</span>
                                    <h4 className='text-sm font-bold text-gray-800 capitalize line-clamp-1 mt-0.5'>{item.rideId?.destination || 'Destination'}</h4>
                                </div>
                                <span className='text-lg font-black text-gray-950'>₹{item.amount}</span>
                            </div>

                            <div className='flex justify-between items-center border-t pt-3 text-xs text-gray-500'>
                                <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                <div className='flex items-center gap-2'>
                                    <span className='capitalize font-medium'>{item.paymentMethod}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${item.paymentStatus === 'successful' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                        {item.paymentStatus}
                                    </span>
                                </div>
                            </div>

                            <button 
                                onClick={() => printInvoice(item)}
                                className='w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5'
                            >
                                <i className="ri-printer-line"></i> Print Receipt
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default PaymentHistory;
