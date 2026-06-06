import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CaptainDataContext } from '../context/CapatainContext';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Shield, ArrowRight, Car, ClipboardList } from 'lucide-react';
import axios from 'axios';
import { notyf } from '../utils/notyf';

const CaptainSignup = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [vehicleColor, setVehicleColor] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleCapacity, setVehicleCapacity] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { setCaptain } = React.useContext(CaptainDataContext);

  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);

    const captainData = {
      fullname: {
        firstname: firstName,
        lastname: lastName
      },
      email: email,
      password: password,
      vehicle: {
        color: vehicleColor,
        plate: vehiclePlate,
        capacity: Number(vehicleCapacity),
        vehicleType: vehicleType
      }
    };

    try {
      const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/captains/register`, captainData);

      if (response.status === 201) {
        const data = response.data;
        setCaptain(data.captain);
        localStorage.setItem('captain-token', data.token);
        notyf.success('Captain Signup Successful');
        navigate('/captain-home');
      }
    } catch (error) {
      const errMsg = error.response?.data?.message || 
                     error.response?.data?.errors?.[0]?.msg || 
                     'Captain Signup Failed';
      notyf.error(errMsg);
    } finally {
      setLoading(false);
    }

    setEmail('');
    setFirstName('');
    setLastName('');
    setPassword('');
    setVehicleColor('');
    setVehiclePlate('');
    setVehicleCapacity('');
    setVehicleType('');
  };

  return (
    <div className='min-h-screen bg-slate-950 text-white flex flex-col lg:flex-row relative overflow-hidden'>
      {/* Glow effects */}
      <div className='absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none'></div>
      <div className='absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-600/10 rounded-full blur-[100px] pointer-events-none'></div>

      {/* Left Column: Visual Captain Value Prop */}
      <div className='hidden lg:flex lg:w-1/2 bg-slate-900/40 border-r border-white/5 p-12 flex-col justify-between relative'>
        <div className='flex items-center gap-3 z-10'>
          <div className='h-9 w-9 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20'>
            <span className='font-black text-lg'>D</span>
          </div>
          <span className='text-lg font-bold tracking-tight text-white'>Drivo Captain</span>
        </div>

        <div className='space-y-6 max-w-md z-10'>
          <div className='h-12 w-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/20'>
            <ClipboardList className='h-6 w-6' />
          </div>
          <h2 className='text-4xl font-extrabold tracking-tight leading-tight text-white'>
            Partner with us to <br />earn on your terms.
          </h2>
          <p className='text-slate-400 leading-relaxed'>
            We provide a transparent payout calculator, real-time demand hotspots visualization, and direct digital payouts. Sign up and complete your profile in minutes.
          </p>
        </div>

        <div className='text-xs text-slate-500 z-10'>
          © 2026 Drivo Inc. All rights reserved.
        </div>
      </div>

      {/* Right Column: Secure Form */}
      <div className='flex-1 flex flex-col justify-center px-6 py-8 lg:px-16 z-10 overflow-y-auto max-h-screen'>
        <div className='w-full max-w-md mx-auto space-y-6'>
          {/* Mobile Logo */}
          <div className='flex items-center justify-between lg:hidden'>
            <div className='flex items-center gap-2'>
              <div className='h-8 w-8 bg-emerald-600 rounded-lg flex items-center justify-center'>
                <span className='font-black text-base'>D</span>
              </div>
              <span className='text-base font-bold tracking-tight'>Drivo Captain</span>
            </div>
            <Link to='/' className='text-xs text-slate-400 hover:text-slate-200 transition-colors'>Cancel</Link>
          </div>

          <div>
            <h1 className='text-2xl font-black tracking-tight text-white'>Join the Fleet</h1>
            <p className='text-slate-400 text-xs mt-1.5'>
              Submit your information below to register as a Drivo Captain.
            </p>
          </div>

          <form onSubmit={submitHandler} className='space-y-4'>
            {/* Full Name Row */}
            <div className='grid grid-cols-2 gap-3'>
              <div className='relative'>
                <label className='text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1'>First Name</label>
                <div className='relative'>
                  <span className='absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500'>
                    <User className='h-4 w-4' />
                  </span>
                  <input 
                    type="text" 
                    required 
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="Arif"
                    className='w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:border-emerald-500 focus:bg-white/10 text-white font-medium text-xs transition-all outline-none font-sans'
                  />
                </div>
              </div>

              <div className='relative'>
                <label className='text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1'>Last Name</label>
                <div className='relative'>
                  <span className='absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500'>
                    <User className='h-4 w-4' />
                  </span>
                  <input 
                    type="text" 
                    required 
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Ahmed"
                    className='w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:border-emerald-500 focus:bg-white/10 text-white font-medium text-xs transition-all outline-none font-sans'
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div className='relative'>
              <label className='text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1'>Captain Email</label>
              <div className='relative'>
                <span className='absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500'>
                  <Mail className='h-4 w-4' />
                </span>
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="captain@example.com"
                  className='w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:border-emerald-500 focus:bg-white/10 text-white font-medium text-xs transition-all outline-none font-sans'
                />
              </div>
            </div>

            {/* Password */}
            <div className='relative'>
              <label className='text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1'>Secure Password</label>
              <div className='relative'>
                <span className='absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500'>
                  <Lock className='h-4 w-4' />
                </span>
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className='w-full pl-9 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:border-emerald-500 focus:bg-white/10 text-white font-medium text-xs transition-all outline-none font-sans'
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className='absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors'
                >
                  {showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                </button>
              </div>
            </div>

            {/* Vehicle Info Headers */}
            <div className='pt-2 border-t border-white/5'>
              <h3 className='text-xs font-bold text-emerald-400 flex items-center gap-1.5 mb-3'>
                <Car className='h-4 w-4' /> Vehicle Details
              </h3>
              
              <div className='grid grid-cols-2 gap-3 mb-3'>
                <input 
                  type="text" 
                  required 
                  placeholder="Color (e.g. Black)" 
                  value={vehicleColor}
                  onChange={e => setVehicleColor(e.target.value)}
                  className='w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:border-emerald-500 focus:bg-white/10 text-white font-medium text-xs transition-all outline-none font-sans'
                />
                <input 
                  type="text" 
                  required 
                  placeholder="Plate (e.g. MH-12-AB-1234)" 
                  value={vehiclePlate}
                  onChange={e => setVehiclePlate(e.target.value)}
                  className='w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:border-emerald-500 focus:bg-white/10 text-white font-medium text-xs transition-all outline-none font-sans font-mono uppercase'
                />
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <input 
                  type="number" 
                  required 
                  min="1"
                  max="7"
                  placeholder="Capacity (1-7)" 
                  value={vehicleCapacity}
                  onChange={e => setVehicleCapacity(e.target.value)}
                  className='w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:border-emerald-500 focus:bg-white/10 text-white font-medium text-xs transition-all outline-none font-sans'
                />
                <select 
                  required 
                  value={vehicleType}
                  onChange={e => setVehicleType(e.target.value)}
                  className='w-full px-3 py-2.5 bg-slate-900 border border-white/10 rounded-xl focus:border-emerald-500 text-white font-medium text-xs transition-all outline-none font-sans'
                >
                  <option value="" disabled>Select Type</option>
                  <option value="car">Car (DrivoGo)</option>
                  <option value="auto">Auto (DrivoAuto)</option>
                  <option value="motorcycle">Motorcycle (Moto)</option>
                </select>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className='w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-xl transition-all shadow-xl shadow-emerald-950/10 flex items-center justify-center gap-2 disabled:opacity-50 mt-4'
            >
              {loading ? (
                <div className='h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
              ) : (
                <>Submit Application <ArrowRight className='h-4 w-4' /></>
              )}
            </button>
          </form>

          <div className='space-y-4 pt-4 border-t border-white/5 text-center'>
            <p className='text-xs text-slate-400'>
              Already have a Captain account? <Link to='/captain-login' className='text-emerald-400 hover:underline font-semibold'>Log in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaptainSignup;