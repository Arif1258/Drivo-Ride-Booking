import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
    Car, 
    CalendarClock, 
    Navigation, 
    Wallet, 
    Tag, 
    Bell, 
    HelpCircle, 
    User, 
    Settings, 
    LogOut, 
    Menu, 
    X, 
    ChevronDown, 
    Sparkles, 
    Bot, 
    ShieldCheck, 
    CreditCard, 
    ArrowRight,
    CheckCircle2
} from 'lucide-react';
import { UserDataContext } from '../context/UserContext';
import SupportAssistantModal from './SupportAssistantModal';
import axios from 'axios';
import { notyf } from '../utils/notyf';

const Navbar = () => {
    const { user, setUser } = useContext(UserDataContext);
    const location = useLocation();
    const navigate = useNavigate();

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [supportModalOpen, setSupportModalOpen] = useState(false);

    const profileRef = useRef(null);
    const notificationsRef = useRef(null);

    // Determine auth state
    const token = localStorage.getItem('token');
    const isAuthenticated = Boolean(token);

    // Notifications state
    const [notifications, setNotifications] = useState([
        {
            id: 1,
            title: 'Welcome to Drivo!',
            desc: 'Get flat 50% off on your first 3 rides with code DRIVO50.',
            time: 'Just now',
            unread: true,
            type: 'promo'
        },
        {
            id: 2,
            title: 'AI Smart Dispatch Active',
            desc: 'Real-time telemetry & safety monitoring enabled for your account.',
            time: '2 hours ago',
            unread: true,
            type: 'system'
        },
        {
            id: 3,
            title: 'Trip Completed',
            desc: 'Your last journey was completed safely. Receipt is available.',
            time: 'Yesterday',
            unread: false,
            type: 'ride'
        }
    ]);

    const unreadCount = notifications.filter(n => n.unread).length;

    // Close popovers on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setProfileDropdownOpen(false);
            }
            if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
                setNotificationsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close mobile menu & dropdowns on route change
    useEffect(() => {
        setMobileMenuOpen(false);
        setProfileDropdownOpen(false);
        setNotificationsOpen(false);
    }, [location.pathname]);

    // Handle logout
    const handleLogout = async () => {
        try {
            const currentToken = localStorage.getItem('token');
            if (currentToken) {
                await axios.get(`${import.meta.env.VITE_BASE_URL}/users/logout`, {
                    headers: { Authorization: `Bearer ${currentToken}` },
                    timeout: 4000
                }).catch(() => {});
            }
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('drivo_user');
            setUser({
                email: '',
                fullName: { firstName: '', lastName: '' }
            });
            notyf.success('Logged out successfully');
            setProfileDropdownOpen(false);
            setMobileMenuOpen(false);
            navigate('/login');
        }
    };

    const markAllNotificationsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    };

    // User display name helper
    const getDisplayName = () => {
        if (user?.fullname?.firstname) {
            return `${user.fullname.firstname} ${user.fullname.lastname || ''}`.trim();
        }
        if (user?.fullName?.firstName) {
            return `${user.fullName.firstName} ${user.fullName.lastName || ''}`.trim();
        }
        if (user?.email) {
            return user.email.split('@')[0];
        }
        return 'Rider';
    };

    const getInitial = () => {
        const name = getDisplayName();
        return (name[0] || 'U').toUpperCase();
    };

    // Active route check helper
    const isActive = (path) => {
        if (path === '/home') {
            return location.pathname === '/home' || location.pathname === '/book-ride';
        }
        if (path === '/my-rides') {
            return location.pathname === '/my-rides' || location.pathname === '/bookings';
        }
        if (path === '/') {
            return location.pathname === '/';
        }
        return location.pathname.startsWith(path);
    };

    // Navigation links for Authenticated Users (Clean, concise, no duplicate "Home")
    const authNavLinks = [
        { name: 'Book a Ride', path: '/home', icon: Car },
        { name: 'My Rides', path: '/my-rides', icon: CalendarClock },
        { name: 'Track Ride', path: '/track-ride', icon: Navigation, pulse: true },
        { name: 'Payments', path: '/payments', icon: Wallet },
        { name: 'Offers', path: '/offers', icon: Tag, badge: '50%' },
        { name: 'Support', path: '/support', icon: HelpCircle },
    ];

    // Navigation links for Guest Users
    const guestNavLinks = [
        { name: 'Ride', path: '/', icon: Car },
        { name: 'Offers', path: '/offers', icon: Tag, badge: 'Deals' },
        { name: 'Support', path: '/support', icon: HelpCircle },
    ];

    const currentLinks = isAuthenticated ? authNavLinks : guestNavLinks;

    return (
        <>
            <header className="sticky top-0 z-50 w-full bg-slate-950/95 backdrop-blur-xl border-b border-white/10 text-white shadow-lg shadow-black/20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4">
                        
                        {/* 1. Brand Logo */}
                        <div className="flex items-center shrink-0">
                            <Link 
                                to={isAuthenticated ? '/home' : '/'} 
                                className="group flex items-center gap-2.5 sm:gap-3 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-2xl"
                                aria-label="Drivo Home"
                            >
                                <div className="h-9 w-9 sm:h-11 sm:w-11 bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 ring-2 ring-white/10 group-hover:scale-105 group-hover:shadow-blue-500/40 transition-all duration-300">
                                    <span className="font-black text-lg sm:text-2xl tracking-tighter text-white">D</span>
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-lg sm:text-2xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                                            Drivo
                                        </span>
                                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                    </div>
                                    <span className="text-[9px] sm:text-[10px] text-blue-400 font-bold -mt-0.5 sm:-mt-1 tracking-wider uppercase hidden xs:block">
                                        Intelligent Mobility
                                    </span>
                                </div>
                            </Link>
                        </div>

                        {/* 2. Desktop Navigation Menu */}
                        <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5">
                            {currentLinks.map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item.path);
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.path}
                                        className={`relative px-3 py-2 rounded-xl text-xs xl:text-sm font-semibold flex items-center gap-1.5 xl:gap-2 transition-all duration-200 whitespace-nowrap ${
                                            active
                                                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm shadow-blue-500/10'
                                                : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                                        }`}
                                    >
                                        <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-blue-400' : 'text-slate-400'}`} />
                                        <span>{item.name}</span>

                                        {/* Pulse indicator for live tracking */}
                                        {item.pulse && (
                                            <span className="relative flex h-2 w-2 shrink-0">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                            </span>
                                        )}

                                        {/* Badge for offers or promotions */}
                                        {item.badge && (
                                            <span className="px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm shrink-0">
                                                {item.badge}
                                            </span>
                                        )}

                                        {/* Active bottom accent bar */}
                                        {active && (
                                            <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" />
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* 3. Right Action Bar */}
                        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                            
                            {/* Drivo AI Copilot Quick Launcher Button */}
                            <button
                                onClick={() => setSupportModalOpen(true)}
                                className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30 text-blue-300 border border-blue-500/30 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-sm whitespace-nowrap h-9 sm:h-10"
                                title="Open Drivo AI Assistant"
                            >
                                <Bot className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                                <span>Drivo AI</span>
                                <Sparkles className="h-3 w-3 text-indigo-400 shrink-0" />
                            </button>

                            {/* Logged In Elements */}
                            {isAuthenticated ? (
                                <>
                                    {/* Notifications Bell Dropdown */}
                                    <div className="relative" ref={notificationsRef}>
                                        <button
                                            onClick={() => {
                                                setNotificationsOpen(prev => !prev);
                                                setProfileDropdownOpen(false);
                                            }}
                                            className={`relative h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center border transition-all ${
                                                notificationsOpen 
                                                    ? 'bg-blue-600/20 border-blue-500/40 text-blue-400' 
                                                    : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                                            }`}
                                            title="Notifications"
                                            aria-label="Notifications"
                                        >
                                            <Bell className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                                            {unreadCount > 0 && (
                                                <span className="absolute -top-1 -right-1 h-4.5 w-4.5 min-w-[18px] px-1 bg-gradient-to-tr from-rose-500 to-pink-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center ring-2 ring-slate-950 animate-pulse">
                                                    {unreadCount}
                                                </span>
                                            )}
                                        </button>

                                        {/* Notifications Menu Popover */}
                                        {notificationsOpen && (
                                            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900/98 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/60 py-3 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                                                <div className="px-4 py-2 flex items-center justify-between border-b border-white/10">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-white">Notifications</span>
                                                        {unreadCount > 0 && (
                                                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                                                {unreadCount} new
                                                            </span>
                                                        )}
                                                    </div>
                                                    {unreadCount > 0 && (
                                                        <button 
                                                            onClick={markAllNotificationsRead}
                                                            className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                                                        >
                                                            Mark all read
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
                                                    {notifications.map((item) => (
                                                        <div 
                                                            key={item.id} 
                                                            className={`p-3.5 hover:bg-white/5 transition-colors cursor-pointer flex gap-3 ${
                                                                item.unread ? 'bg-blue-600/5' : ''
                                                            }`}
                                                        >
                                                            <div className="mt-0.5 shrink-0">
                                                                {item.type === 'promo' ? (
                                                                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                                                                        <Tag className="h-4 w-4" />
                                                                    </div>
                                                                ) : item.type === 'ride' ? (
                                                                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                                                                        <Car className="h-4 w-4" />
                                                                    </div>
                                                                ) : (
                                                                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                                                                        <ShieldCheck className="h-4 w-4" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between">
                                                                    <p className="text-xs font-bold text-white truncate">{item.title}</p>
                                                                    <span className="text-[10px] text-slate-400 shrink-0 ml-2">{item.time}</span>
                                                                </div>
                                                                <p className="text-xs text-slate-400 mt-0.5 leading-snug line-clamp-2">{item.desc}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="p-2 border-t border-white/10 text-center bg-slate-950/40">
                                                    <Link 
                                                        to="/notifications" 
                                                        className="text-xs font-semibold text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 py-1"
                                                    >
                                                        <span>View all notifications</span>
                                                        <ArrowRight className="h-3 w-3" />
                                                    </Link>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* User Profile Button & Dropdown */}
                                    <div className="relative" ref={profileRef}>
                                        <button
                                            onClick={() => {
                                                setProfileDropdownOpen(prev => !prev);
                                                setNotificationsOpen(false);
                                            }}
                                            className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-left focus:outline-none h-9 sm:h-10"
                                            aria-label="User Profile Menu"
                                        >
                                            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 ring-1 ring-white/20 shrink-0">
                                                {getInitial()}
                                            </div>
                                            <div className="hidden sm:block min-w-0">
                                                <span className="block text-xs font-bold text-white max-w-[90px] truncate leading-tight">
                                                    {getDisplayName()}
                                                </span>
                                                <span className="block text-[10px] text-slate-400 font-medium">
                                                    Rider
                                                </span>
                                            </div>
                                            <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 hidden sm:block shrink-0 ${
                                                profileDropdownOpen ? 'rotate-180 text-blue-400' : ''
                                            }`} />
                                        </button>

                                        {/* Profile Dropdown Popover */}
                                        {profileDropdownOpen && (
                                            <div className="absolute right-0 mt-2 w-64 bg-slate-900/98 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/60 py-2 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                                                
                                                {/* User Info Header */}
                                                <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-blue-500/25 shrink-0">
                                                            {getInitial()}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-white truncate">
                                                                {getDisplayName()}
                                                            </p>
                                                            <p className="text-xs text-slate-400 truncate">
                                                                {user?.email || 'Verified Rider'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="mt-2.5 flex items-center gap-2">
                                                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                            ★ 4.9 Rating
                                                        </span>
                                                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                            Verified
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Dropdown Items */}
                                                <div className="py-1 text-xs">
                                                    <Link
                                                        to="/profile"
                                                        className="flex items-center gap-2.5 px-4 py-2.5 text-slate-300 hover:text-white hover:bg-white/5 transition-colors font-medium"
                                                    >
                                                        <User className="h-4 w-4 text-blue-400 shrink-0" />
                                                        <span>My Profile</span>
                                                    </Link>

                                                    <Link
                                                        to="/my-rides"
                                                        className="flex items-center gap-2.5 px-4 py-2.5 text-slate-300 hover:text-white hover:bg-white/5 transition-colors font-medium"
                                                    >
                                                        <Car className="h-4 w-4 text-indigo-400 shrink-0" />
                                                        <span>My Rides</span>
                                                    </Link>

                                                    <Link
                                                        to="/payments"
                                                        className="flex items-center gap-2.5 px-4 py-2.5 text-slate-300 hover:text-white hover:bg-white/5 transition-colors font-medium"
                                                    >
                                                        <CreditCard className="h-4 w-4 text-emerald-400 shrink-0" />
                                                        <span>Payment Methods</span>
                                                    </Link>

                                                    <Link
                                                        to="/settings"
                                                        className="flex items-center gap-2.5 px-4 py-2.5 text-slate-300 hover:text-white hover:bg-white/5 transition-colors font-medium"
                                                    >
                                                        <Settings className="h-4 w-4 text-amber-400 shrink-0" />
                                                        <span>Settings</span>
                                                    </Link>
                                                </div>

                                                <div className="border-t border-white/10 pt-1 mt-1">
                                                    <button
                                                        onClick={handleLogout}
                                                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-xs font-semibold"
                                                    >
                                                        <LogOut className="h-4 w-4 text-rose-400 shrink-0" />
                                                        <span>Logout</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                /* Logged Out Guest Buttons */
                                <div className="flex items-center gap-2">
                                    <Link
                                        to="/login"
                                        className="text-xs font-semibold text-slate-300 hover:text-white px-3 sm:px-3.5 py-2 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all whitespace-nowrap h-9 sm:h-10 flex items-center"
                                    >
                                        Log In
                                    </Link>
                                    <Link
                                        to="/signup"
                                        className="text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-indigo-500 px-3.5 sm:px-4 py-2 rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:scale-105 active:scale-95 whitespace-nowrap h-9 sm:h-10 flex items-center"
                                    >
                                        Sign Up
                                    </Link>
                                    <Link
                                        to="/captain-login"
                                        className="hidden sm:inline-flex text-xs font-semibold text-emerald-400 hover:text-emerald-300 px-3 py-2 rounded-xl border border-emerald-500/20 hover:bg-emerald-500/10 transition-all whitespace-nowrap h-9 sm:h-10 items-center"
                                    >
                                        Drive with Drivo
                                    </Link>
                                </div>
                            )}

                            {/* Mobile Hamburger Menu Button */}
                            <button
                                onClick={() => setMobileMenuOpen(prev => !prev)}
                                className="lg:hidden h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center hover:bg-white/10 transition-all focus:outline-none shrink-0"
                                aria-label="Toggle Navigation Menu"
                            >
                                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                            </button>

                        </div>

                    </div>
                </div>

                {/* Mobile Drawer / Slide-Down Menu */}
                {mobileMenuOpen && (
                    <div className="lg:hidden border-t border-white/10 bg-slate-950/98 backdrop-blur-2xl px-4 pt-3 pb-6 space-y-4 max-h-[calc(100vh-4rem)] overflow-y-auto animate-in slide-in-from-top-3 duration-200">
                        
                        {/* If Authenticated: Mobile User Card */}
                        {isAuthenticated && (
                            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-md shadow-blue-500/20 shrink-0">
                                        {getInitial()}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-sm font-bold text-white truncate">{getDisplayName()}</h4>
                                        <p className="text-xs text-slate-400 truncate">{user?.email || 'Verified Rider'}</p>
                                    </div>
                                </div>
                                <span className="px-2 py-1 text-[10px] font-bold rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                                    ★ 4.9
                                </span>
                            </div>
                        )}

                        {/* Navigation Links List */}
                        <div className="space-y-1">
                            {currentLinks.map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item.path);
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.path}
                                        className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                                            active
                                                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                                                : 'text-slate-300 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-blue-400' : 'text-slate-400'}`} />
                                            <span>{item.name}</span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {item.pulse && (
                                                <span className="relative flex h-2.5 w-2.5 shrink-0">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                                </span>
                                            )}
                                            {item.badge && (
                                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-gradient-to-r from-amber-500 to-orange-500 text-white shrink-0">
                                                    {item.badge}
                                                </span>
                                            )}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Authenticated Profile Sub-items on Mobile */}
                        {isAuthenticated && (
                            <div className="pt-2 border-t border-white/10 space-y-1">
                                <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                                    Account & Preferences
                                </span>
                                <Link
                                    to="/profile"
                                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5"
                                >
                                    <User className="h-4 w-4 text-blue-400 shrink-0" />
                                    <span>My Profile</span>
                                </Link>
                                <Link
                                    to="/settings"
                                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5"
                                >
                                    <Settings className="h-4 w-4 text-amber-400 shrink-0" />
                                    <span>Settings</span>
                                </Link>
                                <button
                                    onClick={() => setSupportModalOpen(true)}
                                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-indigo-300 hover:bg-indigo-500/10"
                                >
                                    <div className="flex items-center gap-3">
                                        <Bot className="h-4 w-4 text-indigo-400 shrink-0" />
                                        <span>Drivo AI Copilot</span>
                                    </div>
                                    <Sparkles className="h-4 w-4 text-indigo-400 shrink-0" />
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold text-rose-400 hover:bg-rose-500/10"
                                >
                                    <LogOut className="h-4 w-4 text-rose-400 shrink-0" />
                                    <span>Logout</span>
                                </button>
                            </div>
                        )}

                        {/* Logged Out Guest CTA Buttons on Mobile */}
                        {!isAuthenticated && (
                            <div className="pt-3 border-t border-white/10 space-y-2">
                                <Link
                                    to="/signup"
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white font-bold text-sm shadow-lg shadow-blue-500/25"
                                >
                                    <span>Create Free Account</span>
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                                <Link
                                    to="/login"
                                    className="w-full flex items-center justify-center py-2.5 rounded-xl border border-white/15 text-slate-200 font-semibold text-sm hover:bg-white/5"
                                >
                                    Log In
                                </Link>
                                <Link
                                    to="/captain-login"
                                    className="w-full flex items-center justify-center py-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                                >
                                    Become a Drivo Captain
                                </Link>
                            </div>
                        )}

                    </div>
                )}
            </header>

            {/* Drivo AI Support Assistant Modal */}
            <SupportAssistantModal
                isOpen={supportModalOpen}
                onClose={() => setSupportModalOpen(false)}
                userType="user"
            />
        </>
    );
};

export default Navbar;
