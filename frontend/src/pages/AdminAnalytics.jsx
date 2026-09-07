import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { SocketContext } from '../context/SocketContext';
import {
    ArrowLeft,
    TrendingUp,
    ShieldAlert,
    Users,
    Activity,
    DollarSign,
    RefreshCw,
    Sparkles,
    AlertTriangle,
    CheckCircle2,
    MapPin,
    Car,
    Clock,
    Flame
} from 'lucide-react';

const AdminAnalytics = () => {
    const [stats, setStats] = useState(null);
    const [aiData, setAiData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('demand'); // 'demand' | 'anomalies' | 'drivers' | 'insights' | 'revenue'
    const [reviewModalRide, setReviewModalRide] = useState(null);
    const [liveAlerts, setLiveAlerts] = useState([]);

    const { socket } = useContext(SocketContext);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const [statsRes, aiRes] = await Promise.allSettled([
                axios.get(`${import.meta.env.VITE_BASE_URL}/payments/stats`),
                axios.get(`${import.meta.env.VITE_BASE_URL}/api/ai/admin-dashboard`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                })
            ]);

            if (statsRes.status === 'fulfilled') {
                setStats(statsRes.value.data);
            }
            if (aiRes.status === 'fulfilled') {
                setAiData(aiRes.value.data);
            }
        } catch (error) {
            console.error('Error fetching admin statistics:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();

        // Join admin socket room
        if (socket) {
            socket.emit('join', {
                userId: 'admin_dashboard',
                userType: 'admin'
            });

            const handleHighRisk = (alertData) => {
                console.log('🚨 Live High-Risk Ride detected by socket:', alertData);
                setLiveAlerts(prev => [alertData, ...prev.slice(0, 4)]);
                fetchAllData();
            };

            socket.on('high-risk-ride', handleHighRisk);

            return () => {
                socket.off('high-risk-ride', handleHighRisk);
            };
        }
    }, [socket]);

    if (loading && !stats && !aiData) {
        return (
            <div className='h-screen w-screen flex flex-col justify-center items-center bg-slate-950 text-white'>
                <div className='h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4'></div>
                <p className='text-sm text-slate-400 font-medium'>Loading AI Operational Command Center...</p>
            </div>
        );
    }

    const demandZones = aiData?.demandZones || [];
    const flaggedRides = aiData?.flaggedRides || [];
    const topCaptains = aiData?.topCaptains || [];
    const operationalInsights = aiData?.operationalInsights || [];
    const summary = aiData?.summary || {};

    return (
        <div className='min-h-screen bg-slate-950 text-white p-4 sm:p-8 font-sans'>
            {/* Top Navigation Bar */}
            <div className='max-w-6xl mx-auto flex items-center justify-between mb-8'>
                <div className='flex items-center gap-4'>
                    <Link
                        to='/home'
                        className='h-11 w-11 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center hover:bg-slate-800 transition-all text-slate-300 hover:text-white shadow-lg'
                    >
                        <ArrowLeft className='h-5 w-5' />
                    </Link>
                    <div>
                        <div className='flex items-center gap-2.5'>
                            <h1 className='text-xl sm:text-2xl font-black tracking-tight text-white'>
                                Drivo AI Command Center
                            </h1>
                            <span className='hidden sm:inline-flex items-center gap-1 text-[11px] bg-emerald-500/20 text-emerald-400 font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30'>
                                <span className='h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse'></span>
                                Real-Time AI Active
                            </span>
                        </div>
                        <p className='text-xs text-slate-400 mt-0.5'>
                            Predictive dispatch, fraud detection, and demand forecasting
                        </p>
                    </div>
                </div>

                <div className='flex items-center gap-3'>
                    <button
                        onClick={fetchAllData}
                        className='h-10 px-3.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl flex items-center gap-2 text-xs font-semibold text-slate-300 transition-all shadow-md'
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span className='hidden sm:inline'>Refresh</span>
                    </button>
                    <div className='h-10 w-10 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-xl flex items-center justify-center shadow-lg'>
                        <Sparkles className='h-5 w-5' />
                    </div>
                </div>
            </div>

            <div className='max-w-6xl mx-auto space-y-6'>
                {/* Real-time Alert Banner (if high-risk detected) */}
                {liveAlerts.length > 0 && (
                    <div className='bg-red-950/70 border border-red-500/40 p-4 rounded-2xl shadow-xl flex items-center justify-between animate-fade-in'>
                        <div className='flex items-center gap-3'>
                            <div className='h-9 w-9 bg-red-500/20 text-red-400 rounded-xl flex items-center justify-center flex-shrink-0'>
                                <ShieldAlert className='h-5 w-5 animate-pulse' />
                            </div>
                            <div>
                                <h4 className='text-sm font-bold text-red-300'>Live High-Risk Anomaly Detected</h4>
                                <p className='text-xs text-red-400 mt-0.5'>
                                    Ride {liveAlerts[0].rideId?.toString().slice(-6)} flagged with Risk Score {liveAlerts[0].riskScore}/100.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setActiveTab('anomalies');
                                setLiveAlerts([]);
                            }}
                            className='text-xs font-bold bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg shadow-sm transition-all'
                        >
                            View Flagged
                        </button>
                    </div>
                )}

                {/* Key AI & Operational Metrics Grid */}
                <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4'>
                    <div className='bg-slate-900/90 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden shadow-lg'>
                        <div className='flex items-center justify-between text-slate-400 text-xs font-semibold'>
                            <span>Active Rides</span>
                            <Activity className='h-4 w-4 text-emerald-400' />
                        </div>
                        <span className='text-3xl font-black mt-2 block text-white'>
                            {summary.activeRides ?? stats?.activeRides ?? 0}
                        </span>
                        <span className='text-[10px] text-slate-500 mt-1 block'>Real-time in progress</span>
                    </div>

                    <div className='bg-slate-900/90 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden shadow-lg'>
                        <div className='flex items-center justify-between text-slate-400 text-xs font-semibold'>
                            <span>Demand / Supply</span>
                            <Flame className='h-4 w-4 text-amber-400' />
                        </div>
                        <span className='text-3xl font-black mt-2 block text-amber-400'>
                            {summary.overallSupplyDemandRatio || 1.4}x
                        </span>
                        <span className='text-[10px] text-slate-500 mt-1 block'>
                            {summary.totalExpectedRides || 110} expected / {summary.activeCaptains || 8} captains
                        </span>
                    </div>

                    <div className='bg-slate-900/90 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden shadow-lg'>
                        <div className='flex items-center justify-between text-slate-400 text-xs font-semibold'>
                            <span>Anomaly Flags</span>
                            <ShieldAlert className='h-4 w-4 text-red-400' />
                        </div>
                        <span className='text-3xl font-black mt-2 block text-red-400'>
                            {flaggedRides.length}
                        </span>
                        <span className='text-[10px] text-slate-500 mt-1 block'>
                            {summary.highRiskFlaggedCount || 0} high-priority
                        </span>
                    </div>

                    <div className='bg-slate-900/90 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden shadow-lg'>
                        <div className='flex items-center justify-between text-slate-400 text-xs font-semibold'>
                            <span>Total Revenue</span>
                            <DollarSign className='h-4 w-4 text-green-400' />
                        </div>
                        <span className='text-3xl font-black mt-2 block text-green-400'>
                            ₹{(stats?.totalRevenue || 0).toLocaleString()}
                        </span>
                        <span className='text-[10px] text-slate-500 mt-1 block'>
                            {stats?.successfulCount || 0} completed rides
                        </span>
                    </div>
                </div>

                {/* Tab Controls */}
                <div className='flex border-b border-slate-800 gap-2 sm:gap-4 overflow-x-auto no-scrollbar'>
                    {[
                        { id: 'demand', label: 'AI Demand Forecast', icon: TrendingUp },
                        { id: 'anomalies', label: `Fraud & Risk (${flaggedRides.length})`, icon: ShieldAlert },
                        { id: 'drivers', label: 'Captain Performance', icon: Users },
                        { id: 'insights', label: 'Operational Insights', icon: Sparkles },
                        { id: 'revenue', label: 'Revenue Trends', icon: DollarSign }
                    ].map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 pb-3 px-2 text-xs sm:text-sm font-bold border-b-2 transition-all flex-shrink-0 ${
                                    activeTab === tab.id
                                        ? 'border-blue-500 text-blue-400'
                                        : 'border-transparent text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <Icon className='h-4 w-4' />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab 1: AI Demand Forecast */}
                {activeTab === 'demand' && (
                    <div className='space-y-4'>
                        <div className='flex items-center justify-between'>
                            <h3 className='text-base font-bold text-slate-200'>
                                Sector-wise Ride Demand & Supply Heatmap
                            </h3>
                            <span className='text-xs text-slate-500'>
                                Updated dynamically for Kharagpur Metropolitan Zone
                            </span>
                        </div>

                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                            {demandZones.map(zone => (
                                <div
                                    key={zone.zoneId}
                                    className='bg-slate-900/80 border border-slate-800 p-5 rounded-2xl hover:border-slate-700 transition-all space-y-3'
                                >
                                    <div className='flex items-center justify-between'>
                                        <div className='flex items-center gap-2.5'>
                                            <div className='h-8 w-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center'>
                                                <MapPin className='h-4 w-4 text-blue-400' />
                                            </div>
                                            <div>
                                                <h4 className='font-bold text-sm text-slate-100'>{zone.area}</h4>
                                                <span className='text-[10px] text-slate-500'>{zone.time} • {zone.dayOfWeek}</span>
                                            </div>
                                        </div>
                                        <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${
                                            zone.predictedDemand === 'SURGE' ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                                            zone.predictedDemand === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                                            zone.predictedDemand === 'MEDIUM' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' :
                                            'bg-slate-800 text-slate-400'
                                        }`}>
                                            {zone.predictedDemand}
                                        </span>
                                    </div>

                                    <div className='grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-xl text-center'>
                                        <div>
                                            <span className='text-[10px] text-slate-500 uppercase font-semibold'>Expected</span>
                                            <span className='text-base font-bold text-slate-200 mt-0.5 block'>{zone.expectedRides} rides</span>
                                        </div>
                                        <div>
                                            <span className='text-[10px] text-slate-500 uppercase font-semibold'>Captains</span>
                                            <span className='text-base font-bold text-slate-200 mt-0.5 block'>{zone.availableDrivers}</span>
                                        </div>
                                        <div>
                                            <span className='text-[10px] text-slate-500 uppercase font-semibold'>Ratio</span>
                                            <span className='text-base font-bold text-amber-400 mt-0.5 block'>{zone.demandSupplyRatio}x</span>
                                        </div>
                                    </div>

                                    {zone.recommendedSurge > 1.0 && (
                                        <div className='flex items-center justify-between text-xs pt-1'>
                                            <span className='text-amber-400 font-semibold'>⚡ Recommended Surge Multiplier:</span>
                                            <span className='font-bold bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-md'>
                                                {zone.recommendedSurge}x
                                            </span>
                                        </div>
                                    )}

                                    <p className='text-[11px] text-slate-400 italic pt-1'>
                                        "{zone.explanation}"
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tab 2: AI Fraud & Anomaly Detection */}
                {activeTab === 'anomalies' && (
                    <div className='bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4'>
                        <div className='flex items-center justify-between'>
                            <div>
                                <h3 className='text-base font-bold text-slate-200'>Flagged Suspicious Activity</h3>
                                <p className='text-xs text-slate-400'>Rides analyzed by statistical anomaly rules (teleportation, duration, cancellations)</p>
                            </div>
                            <span className='text-xs text-slate-500 font-semibold'>No auto-ban policy enforced</span>
                        </div>

                        {flaggedRides.length === 0 ? (
                            <div className='text-center py-12 bg-slate-950 rounded-xl border border-slate-800 text-slate-500 text-sm'>
                                <CheckCircle2 className='h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80' />
                                No suspicious rides currently pending review. All systems normal.
                            </div>
                        ) : (
                            <div className='overflow-x-auto'>
                                <table className='w-full text-left text-xs'>
                                    <thead className='bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800'>
                                        <tr>
                                            <th className='p-3.5'>Ride ID</th>
                                            <th className='p-3.5'>Risk Score</th>
                                            <th className='p-3.5'>Risk Level</th>
                                            <th className='p-3.5'>Flagged Reasons</th>
                                            <th className='p-3.5'>Status</th>
                                            <th className='p-3.5 text-right'>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className='divide-y divide-slate-800/60'>
                                        {flaggedRides.map(log => (
                                            <tr key={log._id} className='hover:bg-slate-800/40 transition-colors'>
                                                <td className='p-3.5 font-mono text-slate-300'>
                                                    {log.rideId?._id?.toString().slice(-8) || log.rideId?.toString().slice(-8) || 'N/A'}
                                                </td>
                                                <td className='p-3.5'>
                                                    <span className='font-black text-sm text-slate-200'>{log.riskScore}/100</span>
                                                </td>
                                                <td className='p-3.5'>
                                                    <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                                                        log.riskLevel === 'HIGH' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                                        log.riskLevel === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                                        'bg-blue-500/20 text-blue-400'
                                                    }`}>
                                                        {log.riskLevel}
                                                    </span>
                                                </td>
                                                <td className='p-3.5 max-w-xs'>
                                                    <div className='flex flex-wrap gap-1'>
                                                        {log.reasons?.map((r, i) => (
                                                            <span key={i} className='bg-slate-950 text-slate-300 px-2 py-0.5 rounded text-[10px] border border-slate-800'>
                                                                {r.code || r.description}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className='p-3.5 text-slate-400 capitalize'>
                                                    {log.status.replace('_', ' ')}
                                                </td>
                                                <td className='p-3.5 text-right'>
                                                    <button
                                                        onClick={() => setReviewModalRide(log)}
                                                        className='px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg transition-all text-[11px]'
                                                    >
                                                        Inspect
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab 3: Captain Performance */}
                {activeTab === 'drivers' && (
                    <div className='bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4'>
                        <h3 className='text-base font-bold text-slate-200'>Captain Performance & Ranking Leaderboard</h3>
                        <div className='space-y-3'>
                            {topCaptains.length === 0 ? (
                                <div className='text-center py-8 text-slate-500 text-xs'>
                                    No registered captains found.
                                </div>
                            ) : (
                                topCaptains.map((c, index) => (
                                    <div
                                        key={c._id}
                                        className='p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-all'
                                    >
                                        <div className='flex items-center gap-3.5'>
                                            <span className='h-8 w-8 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-xs'>
                                                #{index + 1}
                                            </span>
                                            <div>
                                                <h4 className='font-bold text-sm text-slate-200 capitalize'>
                                                    {c.fullname?.firstname} {c.fullname?.lastname}
                                                </h4>
                                                <p className='text-xs text-slate-500 capitalize mt-0.5'>
                                                    {c.vehicle?.vehicleType} ({c.vehicle?.plate || 'Active'}) • Rating: <strong className='text-amber-400'>{c.rating || 4.8}★</strong>
                                                </p>
                                            </div>
                                        </div>
                                        <div className='flex items-center gap-6 text-right'>
                                            <div>
                                                <span className='text-[10px] text-slate-500 uppercase block font-semibold'>Acceptance</span>
                                                <span className='text-sm font-bold text-emerald-400'>{c.acceptanceRate || 95}%</span>
                                            </div>
                                            <div>
                                                <span className='text-[10px] text-slate-500 uppercase block font-semibold'>Cancellation</span>
                                                <span className='text-sm font-bold text-slate-300'>{c.cancellationRate || 3}%</span>
                                            </div>
                                            <div>
                                                <span className='text-[10px] text-slate-500 uppercase block font-semibold'>Trips</span>
                                                <span className='text-sm font-bold text-blue-400'>{c.totalRides || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Tab 4: AI Operational Insights */}
                {activeTab === 'insights' && (
                    <div className='bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4'>
                        <h3 className='text-base font-bold text-slate-200'>AI-Generated Operational Insights</h3>
                        <div className='space-y-3'>
                            {operationalInsights.map((insight, idx) => (
                                <div
                                    key={idx}
                                    className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                                        insight.severity === 'ALERT' ? 'bg-red-950/40 border-red-500/30' :
                                        insight.severity === 'WARNING' ? 'bg-amber-950/40 border-amber-500/30' :
                                        'bg-blue-950/40 border-blue-500/30'
                                    }`}
                                >
                                    <div className='mt-0.5'>
                                        {insight.severity === 'ALERT' && <ShieldAlert className='h-5 w-5 text-red-400' />}
                                        {insight.severity === 'WARNING' && <AlertTriangle className='h-5 w-5 text-amber-400' />}
                                        {insight.severity === 'INFO' && <Sparkles className='h-5 w-5 text-blue-400' />}
                                    </div>
                                    <div>
                                        <h4 className='text-sm font-bold text-slate-200'>{insight.title}</h4>
                                        <p className='text-xs text-slate-400 mt-1 leading-relaxed'>{insight.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tab 5: Revenue & Trends */}
                {activeTab === 'revenue' && (
                    <div className='bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4'>
                        <h3 className='text-base font-bold text-slate-200'>7-Day Platform Revenue Trend</h3>
                        {stats?.dailyStats?.length === 0 ? (
                            <div className='text-center py-12 text-slate-500 text-sm'>
                                No revenue records found for the last 7 days.
                            </div>
                        ) : (
                            <div className='space-y-3'>
                                {stats?.dailyStats?.map(day => (
                                    <div key={day._id} className='flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800'>
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
                )}
            </div>

            {/* Anomaly Review Modal */}
            {reviewModalRide && (
                <div className='fixed inset-0 z-[600] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4'>
                    <div className='bg-slate-900 border border-slate-800 text-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4'>
                        <div className='flex items-center justify-between border-b border-slate-800 pb-3'>
                            <div className='flex items-center gap-2'>
                                <ShieldAlert className='h-5 w-5 text-red-400' />
                                <h3 className='font-bold text-base'>Anomaly Risk Assessment</h3>
                            </div>
                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                reviewModalRide.riskLevel === 'HIGH' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                            }`}>
                                Score: {reviewModalRide.riskScore}/100
                            </span>
                        </div>

                        <div className='space-y-2 text-xs text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800'>
                            <p><strong>Ride ID:</strong> {reviewModalRide.rideId?._id || reviewModalRide.rideId}</p>
                            <p><strong>Passenger:</strong> {reviewModalRide.userId?.fullname?.firstname || 'User'}</p>
                            <p><strong>Evaluated Speed:</strong> {reviewModalRide.featuresSnapshot?.averageSpeedKmH || 'N/A'} km/h</p>
                            <p><strong>Trip Duration:</strong> {reviewModalRide.featuresSnapshot?.durationSeconds || 0}s</p>
                        </div>

                        <div>
                            <h4 className='text-xs font-bold text-slate-400 uppercase tracking-wider mb-2'>Triggered Reasons</h4>
                            <ul className='space-y-1.5 text-xs text-slate-300'>
                                {reviewModalRide.reasons?.map((r, i) => (
                                    <li key={i} className='p-2 bg-slate-950 rounded-lg border border-slate-800/80'>
                                        • {r.description}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className='pt-2 flex gap-3'>
                            <button
                                onClick={() => setReviewModalRide(null)}
                                className='flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-all'
                            >
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    alert('Ride marked as verified by administrator.');
                                    setReviewModalRide(null);
                                }}
                                className='flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all'
                            >
                                Mark as Cleared
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAnalytics;
