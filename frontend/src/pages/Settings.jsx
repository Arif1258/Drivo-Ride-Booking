import React, { useState } from 'react';
import { 
    Settings as SettingsIcon, 
    Sliders, 
    Bell, 
    Shield, 
    VolumeX, 
    Thermometer, 
    Car, 
    Check, 
    Save, 
    Lock, 
    EyeOff 
} from 'lucide-react';
import { notyf } from '../utils/notyf';
import Navbar from '../components/Navbar';

const Settings = () => {
    // Ride Preferences
    const [quietRide, setQuietRide] = useState(true);
    const [temperature, setTemperature] = useState('cool');
    const [preferredVehicle, setPreferredVehicle] = useState('car');

    // Notifications
    const [tripSms, setTripSms] = useState(true);
    const [promoNotifications, setPromoNotifications] = useState(false);
    const [arrivalSound, setArrivalSound] = useState(true);

    // Security
    const [twoFactorAuth, setTwoFactorAuth] = useState(false);
    const [autoShareTrip, setAutoShareTrip] = useState(true);

    const handleSave = (e) => {
        e.preventDefault();
        notyf.success('Settings and preferences saved successfully');
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col">
            <Navbar />
            <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
                    <div>
                        <div className="flex items-center gap-2 text-xs text-amber-400 font-bold uppercase tracking-wider mb-1">
                            <SettingsIcon className="h-4 w-4" />
                            <span>Preferences & Controls</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                            Account Settings
                        </h1>
                        <p className="text-slate-400 text-xs sm:text-sm mt-1">
                            Customize your ride comfort preferences, security shields, and notification alerts.
                        </p>
                    </div>

                    <button
                        onClick={handleSave}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/20 transition-all hover:scale-105 active:scale-95"
                    >
                        <Save className="h-4 w-4" />
                        <span>Save Preferences</span>
                    </button>
                </div>

                <div className="space-y-6">

                    {/* Ride Comfort Preferences */}
                    <div className="p-6 bg-slate-900/60 border border-white/10 rounded-3xl backdrop-blur-xl space-y-5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                                <Sliders className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white">Trip Comfort Preferences</h3>
                                <p className="text-xs text-slate-400">These preferences are shared with your assigned captain automatically.</p>
                            </div>
                        </div>

                        {/* Quiet Ride Toggle */}
                        <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <VolumeX className="h-5 w-5 text-slate-400" />
                                <div>
                                    <h4 className="text-xs sm:text-sm font-bold text-white">Quiet Ride Mode</h4>
                                    <p className="text-xs text-slate-400">Notify the captain that you prefer minimal conversation during the trip.</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setQuietRide(!quietRide)}
                                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                                    quietRide ? 'bg-blue-600' : 'bg-slate-700'
                                }`}
                            >
                                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                    quietRide ? 'translate-x-6' : 'translate-x-0'
                                }`} />
                            </button>
                        </div>

                        {/* Temperature Selector */}
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold text-slate-300">
                                Cabin Temperature Preference
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { key: 'cool', label: '❄️ Cool AC', desc: '20°C - 22°C' },
                                    { key: 'mild', label: '🍃 Mild Climate', desc: '23°C - 25°C' },
                                    { key: 'warm', label: '☀️ Natural Air', desc: 'Windows Down' }
                                ].map(item => (
                                    <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => setTemperature(item.key)}
                                        className={`p-3 rounded-2xl border text-left transition-all ${
                                            temperature === item.key
                                                ? 'bg-blue-600/20 border-blue-500 text-white'
                                                : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <span className="block text-xs font-bold">{item.label}</span>
                                        <span className="block text-[10px] text-slate-400 mt-0.5">{item.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Notification Alerts */}
                    <div className="p-6 bg-slate-900/60 border border-white/10 rounded-3xl backdrop-blur-xl space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                                <Bell className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white">Notification Channels</h3>
                                <p className="text-xs text-slate-400">Control which alerts and trip telemetry pings you receive.</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-2xl">
                                <div>
                                    <h4 className="text-xs sm:text-sm font-semibold text-white">SMS Trip Alerts & OTPs</h4>
                                    <p className="text-[11px] text-slate-400">Receive departure OTP and ride safety link via SMS.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setTripSms(!tripSms)}
                                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                                        tripSms ? 'bg-blue-600' : 'bg-slate-700'
                                    }`}
                                >
                                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                        tripSms ? 'translate-x-6' : 'translate-x-0'
                                    }`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-2xl">
                                <div>
                                    <h4 className="text-xs sm:text-sm font-semibold text-white">Promotions & Vouchers</h4>
                                    <p className="text-[11px] text-slate-400">Receive discount coupons and weekend fare drops.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setPromoNotifications(!promoNotifications)}
                                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                                        promoNotifications ? 'bg-blue-600' : 'bg-slate-700'
                                    }`}
                                >
                                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                        promoNotifications ? 'translate-x-6' : 'translate-x-0'
                                    }`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Security & Privacy */}
                    <div className="p-6 bg-slate-900/60 border border-white/10 rounded-3xl backdrop-blur-xl space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                                <Shield className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white">Security & Trip Privacy</h3>
                                <p className="text-xs text-slate-400">Safeguard your account and ride telemetry.</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-2xl">
                                <div>
                                    <h4 className="text-xs sm:text-sm font-semibold text-white">Auto-Share Live Telemetry with Emergency Contact</h4>
                                    <p className="text-[11px] text-slate-400">Automatically broadcast GPS link when night trips start (after 10 PM).</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setAutoShareTrip(!autoShareTrip)}
                                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                                        autoShareTrip ? 'bg-emerald-600' : 'bg-slate-700'
                                    }`}
                                >
                                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                        autoShareTrip ? 'translate-x-6' : 'translate-x-0'
                                    }`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-2xl">
                                <div>
                                    <h4 className="text-xs sm:text-sm font-semibold text-white">Two-Factor Authentication (2FA)</h4>
                                    <p className="text-[11px] text-slate-400">Require an SMS OTP verification on every new login attempt.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setTwoFactorAuth(!twoFactorAuth)}
                                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                                        twoFactorAuth ? 'bg-blue-600' : 'bg-slate-700'
                                    }`}
                                >
                                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                        twoFactorAuth ? 'translate-x-6' : 'translate-x-0'
                                    }`} />
                                </button>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
            </main>
        </div>
    );
};

export default Settings;
