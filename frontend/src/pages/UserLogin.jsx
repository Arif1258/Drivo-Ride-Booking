import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserDataContext } from '../context/UserContext';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import { notyf } from '../utils/notyf';

const UserLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { setUser } = useContext(UserDataContext);
  const navigate = useNavigate();

  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);

    const userData = {
      email: email,
      password: password
    };

    try {
      const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/users/login`, userData);

      if (response.status === 200) {
        const data = response.data;
        setUser(data.user);
        localStorage.setItem('token', data.token);
        notyf.success('Login Successful');
        navigate('/home');
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
      <div className='absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none'></div>
      <div className='absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none'></div>

      {/* Left Column: Visual Brand Storytelling */}
      <div className='hidden lg:flex lg:w-1/2 bg-slate-900/40 border-r border-white/5 p-12 flex-col justify-between relative'>
        <div className='flex items-center gap-3 z-10'>
          <div className='h-9 w-9 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20'>
            <span className='font-black text-lg'>D</span>
          </div>
          <span className='text-lg font-bold tracking-tight text-white'>Drivo</span>
        </div>

        <div className='space-y-6 max-w-md z-10'>
          <div className='h-12 w-12 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/20'>
            <ShieldCheck className='h-6 w-6' />
          </div>
          <h2 className='text-4xl font-extrabold tracking-tight leading-tight'>
            Travel with complete <br />peace of mind.
          </h2>
          <p className='text-slate-400 leading-relaxed'>
            We verify all captains and vehicles to ensure premium, high-quality, and secure rides. Choose your ride, check your OTP, and enjoy the journey.
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
              <div className='h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center'>
                <span className='font-black text-base'>D</span>
              </div>
              <span className='text-base font-bold tracking-tight'>Drivo</span>
            </div>
            <Link to='/' className='text-xs text-slate-400 hover:text-slate-200 transition-colors'>Cancel</Link>
          </div>

          <div>
            <h1 className='text-3xl font-black tracking-tight text-white'>Welcome back</h1>
            <p className='text-slate-400 text-sm mt-2'>
              Enter your details to request your next trip.
            </p>
          </div>

          <form onSubmit={submitHandler} className='space-y-6'>
            <div className='space-y-4'>
              {/* Email */}
              <div className='relative'>
                <label className='text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1.5'>Email Address</label>
                <div className='relative'>
                  <span className='absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500'>
                    <Mail className='h-5 w-5' />
                  </span>
                  <input 
                    type="email" 
                    required 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className='w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-blue-500 focus:bg-white/10 text-white font-medium text-sm placeholder:text-slate-500 transition-all outline-none font-sans'
                  />
                </div>
              </div>

              {/* Password */}
              <div className='relative'>
                <div className='flex justify-between items-center mb-1.5'>
                  <label className='text-xs text-slate-400 font-semibold uppercase tracking-wider block'>Password</label>
                  <a href="#" className='text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors'>Forgot password?</a>
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
                    className='w-full pl-11 pr-11 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-blue-500 focus:bg-white/10 text-white font-medium text-sm placeholder:text-slate-500 transition-all outline-none'
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
              className='w-full py-3.5 bg-white hover:bg-slate-100 text-slate-950 font-extrabold rounded-xl transition-all shadow-xl shadow-white/5 flex items-center justify-center gap-2 disabled:opacity-50'
            >
              {loading ? (
                <div className='h-5 w-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin'></div>
              ) : (
                <>Sign In <ArrowRight className='h-4 w-4' /></>
              )}
            </button>
          </form>

          <div className='space-y-4 pt-4 border-t border-white/5 text-center'>
            <p className='text-sm text-slate-400'>
              New to Drivo? <Link to='/signup' className='text-blue-400 hover:underline font-semibold'>Create an account</Link>
            </p>
            <Link 
              to='/captain-login' 
              className='inline-flex items-center gap-2 px-4 py-2 border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold uppercase tracking-wider rounded-xl transition-all'
            >
              Sign in as Captain <ArrowRight className='h-3 w-3' />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserLogin;