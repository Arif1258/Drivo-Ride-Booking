import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const AdminAnalytics = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/payments/stats`);
                if (response.status === 200) {
                    setStats(response.data);
                }
            } catch (error) {
                console.error('Error fetching admin statistics:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className='h-screen w-screen flex flex-col justify-center items-center bg-slate-900 text-white'>
                <div className='h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4'></div>
                <p className='text-sm text-gray-400'>Loading analytics details...</p>
            </div>
        );
    }

    return (
        <div className='min-h-screen bg-slate-950 text-white p-6'>
            {/* Header */}
            <div className='flex justify-between items-center mb-8 max-w-4xl mx-auto'>
                <Link to='/home' className='h-10 w-10 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center hover:bg-slate-800 transition-all'>
                    <i className="text-lg ri-arrow-left-line"></i>
                </Link>
                <h1 className='text-xl font-bold tracking-tight'>Admin Analytics</h1>
                <div className='h-10 w-10 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center'>
                    <i className="text-lg ri-pie-chart-line text-indigo-400"></i>
                </div>
            </div>

            <div className='max-w-4xl mx-auto space-y-6'>
                {/* Stats Summary Cards */}
                <div className='grid grid-cols-1 sm:grid-cols-4 gap-4'>
                    <div className='bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden'>
                        <span className='text-xs text-slate-500 font-semibold block uppercase'>Total Revenue</span>
                        <span className='text-3xl font-black mt-2 block text-green-400'>₹{stats?.totalRevenue.toLocaleString() || 0}</span>
                    </div>
                    <div className='bg-slate-900 border border-slate-800 p-5 rounded-2xl'>
                        <span className='text-xs text-slate-500 font-semibold block uppercase'>Completed Payments</span>
                        <span className='text-3xl font-black mt-2 block text-blue-400'>{stats?.successfulCount || 0}</span>
                    </div>
                    <div className='bg-slate-900 border border-slate-800 p-5 rounded-2xl'>
                        <span className='text-xs text-slate-500 font-semibold block uppercase'>Failed Payments</span>
                        <span className='text-3xl font-black mt-2 block text-red-400'>{stats?.failedCount || 0}</span>
                    </div>
                    <div className='bg-slate-900 border border-slate-800 p-5 rounded-2xl'>
                        <span className='text-xs text-slate-500 font-semibold block uppercase'>Active Rides</span>
                        <span className='text-3xl font-black mt-2 block text-yellow-400'>{stats?.activeRides || 0}</span>
                    </div>
                </div>

                {/* Daily Revenue Trend */}
                <div className='bg-slate-900 border border-slate-800 p-6 rounded-2xl'>
                    <h3 className='text-lg font-bold mb-6 text-slate-200'>7-Day Revenue Trend</h3>
                    {stats?.dailyStats?.length === 0 ? (
                        <div className='text-center py-12 text-slate-500 text-sm'>
                            No revenue records found for the last 7 days.
                        </div>
                    ) : (
                        <div className='space-y-4'>
                            {stats?.dailyStats?.map(day => (
                                <div key={day._id} className='flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800'>
                                    <span className='text-sm font-semibold text-slate-300'>{day._id}</span>
                                    <div className='flex items-center gap-6'>
                                        <span className='text-xs text-slate-500'>{day.trips} Trips</span>
                                        <span className='text-sm font-bold text-green-400'>₹{day.revenue.toLocaleString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminAnalytics;
