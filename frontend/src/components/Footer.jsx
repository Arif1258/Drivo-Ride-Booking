import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
    Car, 
    Shield, 
    Sparkles, 
    Bot, 
    Navigation, 
    Tag, 
    HelpCircle, 
    CreditCard, 
    ArrowUpRight, 
    CheckCircle2, 
    Heart,
    PhoneCall,
    Mail,
    MapPin,
    Globe
} from 'lucide-react';
import SupportAssistantModal from './SupportAssistantModal';

const Footer = () => {
    const [supportOpen, setSupportOpen] = useState(false);
    const token = localStorage.getItem('token');
    const isAuthenticated = Boolean(token);

    return (
        <>
            <footer className="w-full bg-slate-950 text-slate-400 border-t border-white/10 relative overflow-hidden z-10 selection:bg-blue-600 selection:text-white">
                {/* Subtle Ambient Background Glows */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-[140px] pointer-events-none" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
                    {/* Top Row: Brand & Quick Value Proposition */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pb-12 border-b border-white/10">
                        
                        {/* Brand Column (Col 1-4) */}
                        <div className="lg:col-span-4 space-y-4">
                            <Link 
                                to={isAuthenticated ? '/home' : '/'} 
                                className="inline-flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-2xl"
                                aria-label="Drivo Home"
                            >
                                <div className="h-11 w-11 bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 ring-2 ring-white/10">
                                    <span className="font-black text-2xl tracking-tighter text-white">D</span>
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-2xl font-black tracking-tight text-white">
                                            Drivo
                                        </span>
                                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                    </div>
                                    <span className="text-[10px] text-blue-400 font-bold -mt-0.5 tracking-wider uppercase">
                                        Intelligent Urban Mobility
                                    </span>
                                </div>
                            </Link>

                            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm">
                                Next-generation intelligent ride-hailing powered by multi-factor AI driver matching, dynamic telemetry, upfront transparent pricing, and 24/7 context-aware assistance.
                            </p>

                            {/* System Status Pill */}
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span>All Systems Live & Operational</span>
                            </div>

                            {/* Contact Mini Line */}
                            <div className="pt-2 space-y-1.5 text-xs text-slate-400">
                                <div className="flex items-center gap-2">
                                    <Mail className="h-3.5 w-3.5 text-blue-400" />
                                    <a href="mailto:support@drivo.com" className="hover:text-white transition-colors">support@drivo.com</a>
                                </div>
                                <div className="flex items-center gap-2">
                                    <PhoneCall className="h-3.5 w-3.5 text-indigo-400" />
                                    <span>24/7 Helpline: 1800-DRIVO-HELP</span>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Columns (Col 5-12) */}
                        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
                            
                            {/* 1. Services */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-black uppercase tracking-wider text-white">Services</h4>
                                <ul className="space-y-2 text-xs">
                                    <li>
                                        <Link to={isAuthenticated ? '/home' : '/login'} className="hover:text-white transition-colors flex items-center gap-1 group">
                                            <span>Drivo Go (Car)</span>
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to={isAuthenticated ? '/home' : '/login'} className="hover:text-white transition-colors flex items-center gap-1 group">
                                            <span>Drivo Moto (Bike)</span>
                                            <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/20 text-blue-400 font-bold">Fast</span>
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to={isAuthenticated ? '/home' : '/login'} className="hover:text-white transition-colors flex items-center gap-1 group">
                                            <span>Drivo Auto (Rickshaw)</span>
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to="/captain-login" className="hover:text-emerald-400 transition-colors flex items-center gap-1 group">
                                            <span>Drive with Drivo</span>
                                            <ArrowUpRight className="h-3 w-3 text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to="/offers" className="hover:text-white transition-colors">Airport Transfers</Link>
                                    </li>
                                </ul>
                            </div>

                            {/* 2. Book a Ride */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-black uppercase tracking-wider text-white">Book a Ride</h4>
                                <ul className="space-y-2 text-xs">
                                    <li>
                                        <Link to={isAuthenticated ? '/home' : '/login'} className="hover:text-white transition-colors flex items-center gap-1">
                                            <Car className="h-3 w-3 text-blue-400" />
                                            <span>Book Online</span>
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to={isAuthenticated ? '/my-rides' : '/login'} className="hover:text-white transition-colors">
                                            <span>My Bookings</span>
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to={isAuthenticated ? '/track-ride' : '/login'} className="hover:text-white transition-colors flex items-center gap-1">
                                            <Navigation className="h-3 w-3 text-emerald-400" />
                                            <span>Track Live Trip</span>
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to="/offers" className="hover:text-white transition-colors flex items-center gap-1">
                                            <Tag className="h-3 w-3 text-amber-400" />
                                            <span>Offers & Coupons</span>
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to={isAuthenticated ? '/payments' : '/login'} className="hover:text-white transition-colors flex items-center gap-1">
                                            <CreditCard className="h-3 w-3 text-violet-400" />
                                            <span>Payment Methods</span>
                                        </Link>
                                    </li>
                                </ul>
                            </div>

                            {/* 3. About & Platform */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-black uppercase tracking-wider text-white">Company</h4>
                                <ul className="space-y-2 text-xs">
                                    <li>
                                        <Link to="/" className="hover:text-white transition-colors">About Drivo</Link>
                                    </li>
                                    <li>
                                        <button onClick={() => setSupportOpen(true)} className="hover:text-white transition-colors flex items-center gap-1 text-left">
                                            <Sparkles className="h-3 w-3 text-indigo-400" />
                                            <span>AI Dispatch Tech</span>
                                        </button>
                                    </li>
                                    <li>
                                        <Link to="/support" className="hover:text-white transition-colors">Safety Standards</Link>
                                    </li>
                                    <li>
                                        <Link to="/captain-signup" className="hover:text-white transition-colors">Captain Onboarding</Link>
                                    </li>
                                    <li>
                                        <Link to="/support" className="hover:text-white transition-colors">Contact Us</Link>
                                    </li>
                                </ul>
                            </div>

                            {/* 4. Help & Legal */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-black uppercase tracking-wider text-white">Help & Legal</h4>
                                <ul className="space-y-2 text-xs">
                                    <li>
                                        <Link to="/support" className="hover:text-white transition-colors flex items-center gap-1">
                                            <HelpCircle className="h-3 w-3 text-blue-400" />
                                            <span>Help & Support</span>
                                        </Link>
                                    </li>
                                    <li>
                                        <button 
                                            onClick={() => setSupportOpen(true)} 
                                            className="hover:text-indigo-300 transition-colors flex items-center gap-1 text-left"
                                        >
                                            <Bot className="h-3 w-3 text-indigo-400" />
                                            <span>Drivo AI Copilot</span>
                                        </button>
                                    </li>
                                    <li>
                                        <Link to="/support" className="hover:text-white transition-colors">Privacy Policy</Link>
                                    </li>
                                    <li>
                                        <Link to="/support" className="hover:text-white transition-colors">Terms & Conditions</Link>
                                    </li>
                                    <li>
                                        <Link to="/support" className="hover:text-white transition-colors">Cancellation Policy</Link>
                                    </li>
                                </ul>
                            </div>

                        </div>
                    </div>

                    {/* Middle Row: Social Media Links & Security Guarantee */}
                    <div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/5">
                        
                        {/* Social Media Links */}
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-300">Connect:</span>
                            
                            {/* Twitter / X */}
                            <a 
                                href="https://twitter.com" 
                                target="_blank" 
                                rel="noreferrer" 
                                className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 hover:text-white border border-white/10 flex items-center justify-center transition-colors text-slate-400"
                                aria-label="Twitter / X"
                            >
                                <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                </svg>
                            </a>

                            {/* GitHub */}
                            <a 
                                href="https://github.com" 
                                target="_blank" 
                                rel="noreferrer" 
                                className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 hover:text-white border border-white/10 flex items-center justify-center transition-colors text-slate-400"
                                aria-label="GitHub"
                            >
                                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                                </svg>
                            </a>

                            {/* LinkedIn */}
                            <a 
                                href="https://linkedin.com" 
                                target="_blank" 
                                rel="noreferrer" 
                                className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 hover:text-white border border-white/10 flex items-center justify-center transition-colors text-slate-400"
                                aria-label="LinkedIn"
                            >
                                <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                                </svg>
                            </a>

                            {/* Instagram */}
                            <a 
                                href="https://instagram.com" 
                                target="_blank" 
                                rel="noreferrer" 
                                className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 hover:text-white border border-white/10 flex items-center justify-center transition-colors text-slate-400"
                                aria-label="Instagram"
                            >
                                <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                </svg>
                            </a>
                        </div>

                        {/* Security Trust Badges */}
                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1.5">
                                <Shield className="h-3.5 w-3.5 text-blue-400" />
                                <span>256-bit SSL Encrypted</span>
                            </span>
                            <span className="hidden sm:inline-block h-3 w-px bg-white/10" />
                            <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                <span>100% Verified Drivers</span>
                            </span>
                            <span className="hidden sm:inline-block h-3 w-px bg-white/10" />
                            <span className="flex items-center gap-1.5">
                                <Globe className="h-3.5 w-3.5 text-indigo-400" />
                                <span>India (INR ₹)</span>
                            </span>
                        </div>

                    </div>

                    {/* Bottom Copyright Row */}
                    <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
                        <p>© {new Date().getFullYear()} Drivo Inc. All rights reserved. Intelligent Urban Mobility.</p>
                        
                        <div className="flex items-center gap-6">
                            <Link to="/support" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
                            <Link to="/support" className="hover:text-slate-300 transition-colors">Terms of Service</Link>
                            <Link to="/support" className="hover:text-slate-300 transition-colors">Safety Guidelines</Link>
                        </div>
                    </div>

                </div>
            </footer>

            {/* Support Assistant Modal Triggered from Footer */}
            <SupportAssistantModal
                isOpen={supportOpen}
                onClose={() => setSupportOpen(false)}
                userType="user"
            />
        </>
    );
};

export default Footer;
