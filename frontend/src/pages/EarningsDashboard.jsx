import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const EarningsDashboard = () => {
    const [history, setHistory] = useState([]);
    const [insights, setInsights] = useState(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        trips: 0,
        average: 0
    });

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('captain-token');
            try {
                const [historyRes, insightsRes] = await Promise.allSettled([
                    axios.get(`${import.meta.env.VITE_BASE_URL}/payments/captain-history`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get(`${import.meta.env.VITE_BASE_URL}/api/ai/driver-insights`, {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                ]);

                if (historyRes.status === 'fulfilled' && historyRes.value.status === 200) {
                    setHistory(historyRes.value.data);
                    const total = historyRes.value.data.reduce((acc, curr) => acc + curr.amount, 0);
                    const trips = historyRes.value.data.length;
                    const average = trips > 0 ? Math.round(total / trips) : 0;
                    setStats({ total, trips, average });
                }

                if (insightsRes.status === 'fulfilled' && insightsRes.value.status === 200) {
                    setInsights(insightsRes.value.data);
                }
            } catch (error) {
                console.error('Error fetching earnings history & insights:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
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
            <div className='grid grid-cols-2 gap-4 mb-6'>
                <div className='bg-gray-900 border border-gray-800 p-4 rounded-xl'>
                    <span className='text-xs text-gray-500 font-semibold block uppercase'>Completed Trips</span>
                    <span className='text-2xl font-bold mt-1 block'>{stats.trips}</span>
                </div>
                <div className='bg-gray-900 border border-gray-800 p-4 rounded-xl'>
                    <span className='text-xs text-gray-500 font-semibold block uppercase'>Average Per Trip</span>
                    <span className='text-2xl font-bold mt-1 block'>₹{stats.average}</span>
                </div>
            </div>

            {/* AI Performance & Coaching Insights */}
            {insights && (
                <div className='bg-slate-900 border border-slate-800 p-5 rounded-2xl mb-8 space-y-4 shadow-lg'>
                    <div className='flex items-center justify-between border-b border-slate-800 pb-3'>
                        <div className='flex items-center gap-2.5'>
                            <div className='h-8 w-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center'>
                                <i className="ri-brain-line text-lg"></i>
                            </div>
                            <h3 className='font-bold text-base text-slate-100'>AI Performance & Coaching</h3>
                        </div>
                        <span className='text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-full'>
                            Live Analytics
                        </span>
                    </div>

                    {/* Quick Metric Pills */}
                    <div className='grid grid-cols-3 gap-2.5 py-1'>
                        <div className='bg-slate-950/60 border border-slate-800 p-3 rounded-xl text-center'>
                            <span className='text-[10px] text-slate-500 uppercase font-semibold block'>Acceptance</span>
                            <span className='text-base font-bold text-emerald-400 mt-0.5 block'>{insights.metrics?.acceptanceRate}%</span>
                        </div>
                        <div className='bg-slate-950/60 border border-slate-800 p-3 rounded-xl text-center'>
                            <span className='text-[10px] text-slate-500 uppercase font-semibold block'>Cancellation</span>
                            <span className='text-base font-bold text-slate-200 mt-0.5 block'>{insights.metrics?.cancellationRate}%</span>
                        </div>
                        <div className='bg-slate-950/60 border border-slate-800 p-3 rounded-xl text-center'>
                            <span className='text-[10px] text-slate-500 uppercase font-semibold block'>Peak Window</span>
                            <span className='text-xs font-bold text-amber-400 mt-1 block'>{insights.metrics?.peakEarningWindow}</span>
                        </div>
                    </div>

                    {/* AI Dynamic Coaching Statements */}
                    <div className='space-y-2.5 pt-1'>
                        {insights.insights?.map((item, idx) => (
                            <div key={idx} className='p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 flex items-start gap-3'>
                                <div className='h-7 w-7 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5 text-blue-400'>
                                    <i className={`${item.icon} text-sm`}></i>
                                </div>
                                <div>
                                    <h4 className='text-xs font-bold text-slate-200'>{item.headline}</h4>
                                    <p className='text-xs text-slate-400 mt-0.5 leading-relaxed'>{item.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

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
