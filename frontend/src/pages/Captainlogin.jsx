import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CaptainDataContext } from '../context/CapatainContext';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, ArrowRight, DollarSign } from 'lucide-react';
import axios from 'axios';
import { notyf } from '../utils/notyf';

const Captainlogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { setCaptain } = React.useContext(CaptainDataContext);
  const navigate = useNavigate();

  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);

    const captainData = {
      email: email,
      password: password
    };

    try {
      const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/captains/login`, captainData);

      if (response.status === 200) {
        const data = response.data;
        setCaptain(data.captain);
        localStorage.setItem('captain-token', data.token);
        notyf.success('Login Successful');
        navigate('/captain-home');
      }
    } catch (error) {
      const errMsg = error.response?.data?.message || 
                     error.response?.data?.errors?.[0]?.msg || 
                     'Login Failed';
      notyf.error(errMsg);
    } finally {
      setLoading(false);
    }

    setEmail('');
    setPassword('');
  };

  return (
    <div className='min-h-screen bg-slate-950 text-white flex flex-col lg:flex-row relative overflow-hidden'>
      {/* Glow effects */}
      <div className='absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none'></div>
      <div className='absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-600/10 rounded-full blur-[100px] pointer-events-none'></div>

      {/* Left Column: Visual Captain Value Prop */}
      <div className='hidden lg:flex lg:w-1/2 bg-slate-900/40 border-r border-white/5 p-12 flex-col justify-between relative'>
        <div className='flex items-center gap-3 z-10'>
          <div className='h-9 w-9 bg-gradient-to-tr from-emerald-650 to-teal-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20'>
            <span className='font-black text-lg'>D</span>
          </div>
          <span className='text-lg font-bold tracking-tight text-white'>Drivo Captain</span>
        </div>

        <div className='space-y-6 max-w-md z-10'>
          <div className='h-12 w-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/20'>
            <DollarSign className='h-6 w-6' />
          </div>
          <h2 className='text-4xl font-extrabold tracking-tight leading-tight text-white'>
            Maximize your earnings <br />every single day.
          </h2>
          <p className='text-slate-400 leading-relaxed'>
            Drivo is the smartest platform for drivers. Experience optimized route dispatches, dynamic bonuses, and immediate payouts directly to your account.
          </p>
        </div>

        <div className='text-xs text-slate-500 z-10'>
          © 2026 Drivo Inc. All rights reserved.
        </div>
      </div>

      {/* Right Column: Secure Form */}
      <div className='flex-1 flex flex-col justify-center px-6 py-12 lg:px-16 z-10'>
        <div className='w-full max-w-sm mx-auto space-y-8'>
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
            <h1 className='text-3xl font-black tracking-tight text-white'>Captain Dashboard</h1>
            <p className='text-slate-400 text-sm mt-2'>
              Sign in to start receiving trip requests.
            </p>
          </div>

          <form onSubmit={submitHandler} className='space-y-6'>
            <div className='space-y-4'>
              {/* Email */}
              <div className='relative'>
                <label className='text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1.5'>Captain Email</label>
                <div className='relative'>
                  <span className='absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500'>
                    <Mail className='h-5 w-5' />
                  </span>
                  <input 
                    type="email" 
                    required 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="captain@example.com"
                    className='w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-emerald-500 focus:bg-white/10 text-white font-medium text-sm placeholder:text-slate-500 transition-all outline-none'
                  />
                </div>
              </div>

              {/* Password */}
              <div className='relative'>
                <div className='flex justify-between items-center mb-1.5'>
                  <label className='text-xs text-slate-400 font-semibold uppercase tracking-wider block'>Password</label>
                  <a href="#" className='text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors'>Forgot password?</a>
                </div>
                <div className='relative'>
                  <span className='absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500'>
                    <Lock className='h-5 w-5' />
                  </span>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className='w-full pl-11 pr-11 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-emerald-500 focus:bg-white/10 text-white font-medium text-sm placeholder:text-slate-500 transition-all outline-none'
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className='absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors'
                  >
                    {showPassword ? <EyeOff className='h-5 w-5' /> : <Eye className='h-5 w-5' />}
                  </button>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className='w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-xl transition-all shadow-xl shadow-emerald-900/10 flex items-center justify-center gap-2 disabled:opacity-50'
            >
              {loading ? (
                <div className='h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
              ) : (
                <>Start Driving <ArrowRight className='h-4 w-4' /></>
              )}
            </button>
          </form>

          <div className='space-y-4 pt-4 border-t border-white/5 text-center'>
            <p className='text-sm text-slate-400'>
              Not registered as a driver? <Link to='/captain-signup' className='text-emerald-400 hover:underline font-semibold'>Apply to drive</Link>
            </p>
            <Link 
              to='/login' 
              className='inline-flex items-center gap-2 px-4 py-2 border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-bold uppercase tracking-wider rounded-xl transition-all'
            >
              Sign in as Passenger <ArrowRight className='h-3 w-3' />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Captainlogin;