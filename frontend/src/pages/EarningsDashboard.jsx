import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const EarningsDashboard = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        trips: 0,
        average: 0
    });

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/payments/captain-history`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('captain-token')}`
                    }
                });
                if (response.status === 200) {
                    setHistory(response.data);
                    
                    // Aggregate Statistics
                    const total = response.data.reduce((acc, curr) => acc + curr.amount, 0);
                    const trips = response.data.length;
                    const average = trips > 0 ? Math.round(total / trips) : 0;
                    
                    setStats({ total, trips, average });
                }
            } catch (error) {
                console.error('Error fetching earnings history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    if (loading) {
        return (
            <div className='h-screen w-screen flex flex-col justify-center items-center bg-gray-950 text-white'>
                <div className='h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4'></div>
                <p className='text-sm text-gray-400'>Loading earnings details...</p>
            </div>
        );
    }

    return (
        <div className='min-h-screen bg-gray-950 text-white p-6'>
            {/* Header */}
            <div className='flex justify-between items-center mb-8'>
                <Link to='/captain-home' className='h-10 w-10 bg-gray-900 border border-gray-800 rounded-full flex items-center justify-center hover:bg-gray-800 transition-all'>
                    <i className="text-lg ri-arrow-left-line"></i>
                </Link>
                <h1 className='text-xl font-bold tracking-tight'>Earnings Dashboard</h1>
                <div className='h-10 w-10 bg-gray-900 border border-gray-800 rounded-full flex items-center justify-center'>
                    <i className="text-lg ri-exchange-funds-line text-blue-400"></i>
                </div>
            </div>

            {/* Total Balance Card */}
            <div className='bg-gradient-to-br from-blue-700 via-indigo-800 to-purple-900 p-6 rounded-2xl shadow-xl shadow-blue-900/20 mb-6 relative overflow-hidden'>
                <div className='absolute right-0 bottom-0 translate-y-6 translate-x-6 text-white/5 text-9xl font-black font-mono pointer-events-none'>
                    ₹
                </div>
                <span className='text-xs text-blue-200 uppercase tracking-widest font-semibold'>Total Net Earnings</span>
                <h2 className='text-4xl font-black mt-2'>₹{stats.total.toLocaleString()}</h2>
                <div className='flex justify-between items-center mt-6 pt-4 border-t border-white/10 text-xs text-blue-100'>
                    <span>Direct Deposit Enabled</span>
                    <span>Updated just now</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className='grid grid-cols-2 gap-4 mb-8'>
                <div className='bg-gray-900 border border-gray-800 p-4 rounded-xl'>
                    <span className='text-xs text-gray-500 font-semibold block uppercase'>Completed Trips</span>
                    <span className='text-2xl font-bold mt-1 block'>{stats.trips}</span>
                </div>
                <div className='bg-gray-900 border border-gray-800 p-4 rounded-xl'>
                    <span className='text-xs text-gray-500 font-semibold block uppercase'>Average Per Trip</span>
                    <span className='text-2xl font-bold mt-1 block'>₹{stats.average}</span>
                </div>
            </div>

            {/* History List */}
            <div>
                <h3 className='text-lg font-bold mb-4 text-gray-300'>Trip-wise Earnings</h3>
                {history.length === 0 ? (
                    <div className='text-center py-12 bg-gray-900/50 rounded-xl border border-gray-800 text-gray-500 text-sm'>
                        No completed trips yet. Start accepting rides!
                    </div>
                ) : (
                    <div className='space-y-3'>
                        {history.map(item => (
                            <div key={item._id} className='bg-gray-900 border border-gray-800 p-4 rounded-xl flex items-center justify-between hover:border-gray-700 transition-all'>
                                <div className='flex items-center gap-3'>
                                    <div className='h-10 w-10 bg-green-500/10 text-green-400 rounded-lg flex items-center justify-center'>
                                        <i className="text-lg ri-arrow-right-up-line"></i>
                                    </div>
                                    <div>
                                        <h4 className='text-sm font-semibold capitalize text-gray-200'>{item.rideId?.destination || 'Destination'}</h4>
                                        <p className='text-xs text-gray-500 mt-0.5'>{new Date(item.createdAt).toLocaleDateString()} • {item.paymentMethod.toUpperCase()}</p>
                                    </div>
                                </div>
                                <div className='text-right'>
                                    <span className='text-base font-bold text-green-400'>+₹{item.amount}</span>
                                    <span className='text-[10px] text-gray-500 block capitalize mt-0.5'>{item.paymentStatus}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EarningsDashboard;
