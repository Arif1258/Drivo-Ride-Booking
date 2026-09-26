import React from 'react';
import { User, Clock, ChevronRight, X, ShieldCheck, Zap } from 'lucide-react';

const VehiclePanel = ({
    selectVehicle,
    fare = {},
    setConfirmRidePanel,
    setVehiclePanel,
    pickup = '',
    destination = ''
}) => {
    const vehicles = [
        {
            key: 'car',
            name: 'Drivo Go',
            subtitle: 'Affordable, compact rides',
            capacity: 4,
            eta: '2 mins away',
            image: 'https://swyft.pl/wp-content/uploads/2023/05/how-many-people-can-a-uberx-take.jpg',
            tag: 'Popular'
        },
        {
            key: 'moto',
            name: 'Drivo Moto',
            subtitle: 'Fast motorcycle rides',
            capacity: 1,
            eta: '1-3 mins away',
            image: '/Uber_Moto.webp',
            tag: 'Fastest'
        },
        {
            key: 'auto',
            name: 'Drivo Auto',
            subtitle: 'Affordable local auto rides',
            capacity: 3,
            eta: '3 mins away',
            image: '/Uber_Auto.png',
            tag: 'Value'
        }
    ];

    const handleSelect = (vehicleKey) => {
        selectVehicle(vehicleKey);
        setVehiclePanel(false);
        setConfirmRidePanel(true);
    };

    return (
        <div className="flex flex-col h-full max-h-full text-slate-900 select-none">
            {/* Top Pull Bar */}
            <div 
                className="w-12 h-1 bg-slate-200 hover:bg-slate-300 rounded-full mx-auto mb-3 cursor-pointer shrink-0 transition-colors" 
                onClick={() => setVehiclePanel(false)}
                title="Dismiss"
            />

            {/* Header: Title and Close button */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                <div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
                        Choose a Ride
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                        All fares are upfront & transparent
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setVehiclePanel(false)}
                    className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors shrink-0"
                    aria-label="Close ride selection"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Vehicle Options List (Scrollable if height is constrained) */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-2.5 sm:space-y-3 py-3 pr-0.5">
                {vehicles.map((v) => {
                    const price = fare && fare[v.key] !== undefined ? fare[v.key] : null;
                    return (
                        <div
                            key={v.key}
                            onClick={() => handleSelect(v.key)}
                            className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 hover:border-blue-600 bg-slate-50/70 hover:bg-blue-50/30 transition-all cursor-pointer group active:scale-[0.99] shadow-xs hover:shadow-md"
                        >
                            {/* Left Side: Vehicle Image & Description */}
                            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                                <div className="h-12 w-14 sm:h-14 sm:w-16 shrink-0 flex items-center justify-center bg-white rounded-xl p-1 border border-slate-100 shadow-xs">
                                    <img 
                                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform" 
                                        src={v.image} 
                                        alt={v.name}
                                        onError={(e) => {
                                            // Fallback for missing images
                                            e.currentTarget.src = '/Uber_Moto.webp';
                                        }}
                                    />
                                </div>
                                
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <h4 className="font-bold text-sm sm:text-base text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                                            {v.name}
                                        </h4>
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-slate-200/80 text-slate-700 rounded text-[10px] font-bold shrink-0">
                                            <User className="h-2.5 w-2.5" /> {v.capacity}
                                        </span>
                                        {v.tag && (
                                            <span className="hidden xs:inline-block px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded text-[9px] font-bold shrink-0">
                                                {v.tag}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-blue-600 mt-0.5">
                                        <Clock className="h-3 w-3 shrink-0" />
                                        <span>{v.eta}</span>
                                    </div>

                                    <p className="text-[11px] sm:text-xs text-slate-500 truncate mt-0.5 font-normal">
                                        {v.subtitle}
                                    </p>
                                </div>
                            </div>

                            {/* Right Side: Fare Amount (₹) & Selection Arrow */}
                            <div className="shrink-0 flex items-center gap-2 sm:gap-2.5 pl-3 text-right">
                                <div className="flex flex-col items-end">
                                    {price !== null ? (
                                        <span className="text-base sm:text-lg font-black text-slate-950 whitespace-nowrap tracking-tight">
                                            ₹{price}
                                        </span>
                                    ) : (
                                        <div className="h-5 w-12 bg-slate-200 animate-pulse rounded" />
                                    )}
                                    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">
                                        Estimate
                                    </span>
                                </div>

                                <div className="h-7 w-7 rounded-lg bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-400 flex items-center justify-center transition-colors shrink-0">
                                    <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Bottom Info Strip */}
            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
                <span className="flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Smart AI Fare Guarantee</span>
                </span>
                <span className="font-semibold text-slate-600">
                    Cash / UPI Accepted
                </span>
            </div>
        </div>
    );
};

export default VehiclePanel;