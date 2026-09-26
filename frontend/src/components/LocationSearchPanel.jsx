import React from 'react';
import { MapPin } from 'lucide-react';

const LocationSearchPanel = ({ suggestions, setVehiclePanel, setPanelOpen, setPickup, setDestination, activeField }) => {

    const handleSuggestionClick = (suggestion) => {
        if (activeField === 'pickup') {
            setPickup(suggestion);
        } else if (activeField === 'destination') {
            setDestination(suggestion);
        }
    };

    return (
        <div className='p-4 space-y-2.5'>
            {(!suggestions || suggestions.length === 0) ? (
                <div className='text-center py-6 text-xs text-gray-400 font-semibold uppercase tracking-wider'>
                    Start typing to see address suggestions...
                </div>
            ) : (
                suggestions.map((elem, idx) => (
                    <div 
                        key={idx} 
                        onClick={() => handleSuggestionClick(elem)} 
                        className='flex gap-3.5 border border-slate-200/80 hover:border-slate-800 active:border-slate-900 rounded-xl p-3.5 items-center cursor-pointer transition-all hover:bg-slate-50'
                    >
                        <div className='h-8 w-8 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center flex-shrink-0'>
                            <MapPin className='h-4 w-4 text-slate-600' />
                        </div>
                        <h4 className='font-semibold text-sm text-slate-800 line-clamp-1'>{elem}</h4>
                    </div>
                ))
            )}
        </div>
    );
};

export default LocationSearchPanel;