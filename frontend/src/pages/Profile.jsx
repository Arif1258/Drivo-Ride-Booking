import React, { useState, useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
    User, 
    Mail, 
    Phone, 
    MapPin, 
    Shield, 
    Star, 
    Car, 
    Calendar, 
    Check, 
    Edit2, 
    Save, 
    Camera 
} from 'lucide-react';
import { UserDataContext } from '../context/UserContext';
import { notyf } from '../utils/notyf';
import Navbar from '../components/Navbar';

const Profile = () => {
    const { user, setUser } = useContext(UserDataContext);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('+91 98300 12345');
    const [emergencyContact, setEmergencyContact] = useState('+91 98311 54321');
    const [homeAddress, setHomeAddress] = useState('Flat 4B, Greenwood Park, Kolkata');
    const [workAddress, setWorkAddress] = useState('DLF IT Park, Sector V, Salt Lake, Kolkata');
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (user?.fullname?.firstname) {
            setFirstName(user.fullname.firstname);
            setLastName(user.fullname.lastname || '');
        } else if (user?.fullName?.firstName) {
            setFirstName(user.fullName.firstName);
            setLastName(user.fullName.lastName || '');
        } else if (user?.email) {
            setFirstName(user.email.split('@')[0]);
        }
        if (user?.email) {
            setEmail(user.email);
        }
    }, [user]);

    const handleSave = (e) => {
        e.preventDefault();
        const updatedUser = {
            ...user,
            fullname: {
                firstname: firstName,
                lastname: lastName
            },
            email
        };
        setUser(updatedUser);
        localStorage.setItem('drivo_user', JSON.stringify(updatedUser));
        setIsEditing(false);
        notyf.success('Profile details updated successfully');
    };

    const initial = (firstName?.[0] || 'U').toUpperCase();

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col">
            <Navbar />
            <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
                    <div>
                        <div className="flex items-center gap-2 text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">
                            <User className="h-4 w-4" />
                            <span>Rider Account</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                            My Profile
                        </h1>
                        <p className="text-slate-400 text-xs sm:text-sm mt-1">
                            Manage your personal details, emergency safety numbers, and saved destination spots.
                        </p>
                    </div>

                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                            isEditing
                                ? 'bg-white/10 text-white hover:bg-white/20'
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                        }`}
                    >
                        {isEditing ? <Check className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                        <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
                    </button>
                </div>

                {/* Profile Overview Card */}
                <div className="p-6 bg-slate-900/60 border border-white/10 rounded-3xl backdrop-blur-xl shadow-xl flex flex-col sm:flex-row items-center gap-6">
                    <div className="relative">
                        <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-blue-500/25 ring-4 ring-white/10">
                            {initial}
                        </div>
                    </div>

                    <div className="flex-1 text-center sm:text-left space-y-1">
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                            <h2 className="text-xl sm:text-2xl font-black text-white">
                                {firstName} {lastName}
                            </h2>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                Verified Rider
                            </span>
                        </div>
                        <p className="text-xs text-slate-400">{email || 'rider@drivo.com'}</p>

                        <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs">
                            <span className="flex items-center gap-1 text-amber-400 font-bold bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20">
                                <Star className="h-3.5 w-3.5 fill-amber-400" />
                                4.9 Rating
                            </span>
                            <span className="flex items-center gap-1 text-slate-300 bg-white/5 px-2.5 py-1 rounded-lg">
                                <Car className="h-3.5 w-3.5 text-blue-400" />
                                48 Trips
                            </span>
                            <span className="flex items-center gap-1 text-slate-300 bg-white/5 px-2.5 py-1 rounded-lg">
                                <Shield className="h-3.5 w-3.5 text-emerald-400" />
                                Safety Shield Active
                            </span>
                        </div>
                    </div>
                </div>

                {/* Profile Edit Form */}
                <form onSubmit={handleSave} className="space-y-6">
                    
                    {/* Personal Information */}
                    <div className="p-6 bg-slate-900/60 border border-white/10 rounded-3xl backdrop-blur-xl space-y-4">
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <User className="h-4 w-4 text-blue-400" />
                            <span>Personal Information</span>
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">First Name</label>
                                <input
                                    type="text"
                                    disabled={!isEditing}
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Last Name</label>
                                <input
                                    type="text"
                                    disabled={!isEditing}
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    disabled={!isEditing}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                                <input
                                    type="text"
                                    disabled={!isEditing}
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Saved Places */}
                    <div className="p-6 bg-slate-900/60 border border-white/10 rounded-3xl backdrop-blur-xl space-y-4">
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-emerald-400" />
                            <span>Saved Frequent Locations</span>
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Home Address</label>
                                <input
                                    type="text"
                                    disabled={!isEditing}
                                    value={homeAddress}
                                    onChange={(e) => setHomeAddress(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Office / Work Address</label>
                                <input
                                    type="text"
                                    disabled={!isEditing}
                                    value={workAddress}
                                    onChange={(e) => setWorkAddress(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Emergency Contact */}
                    <div className="p-6 bg-slate-900/60 border border-white/10 rounded-3xl backdrop-blur-xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Shield className="h-4 w-4 text-rose-400" />
                                <span>Emergency Safety Contact</span>
                            </h3>
                            <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                                SOS Linked
                            </span>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                                Emergency Contact Phone Number (SMS Alert Triggered on SOS)
                            </label>
                            <input
                                type="text"
                                disabled={!isEditing}
                                value={emergencyContact}
                                onChange={(e) => setEmergencyContact(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-rose-500 disabled:opacity-70 disabled:cursor-not-allowed"
                            />
                        </div>
                    </div>

                    {isEditing && (
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="px-5 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-slate-300 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/25 flex items-center gap-2"
                            >
                                <Save className="h-4 w-4" />
                                <span>Save Changes</span>
                            </button>
                        </div>
                    )}
                </form>

            </div>
            </main>
        </div>
    );
};

export default Profile;
