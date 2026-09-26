import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Clock, Zap, MapPin, Sparkles, Star, Users } from 'lucide-react';

const Start = () => {
  return (
    <div className='min-h-screen bg-slate-950 text-white relative overflow-hidden flex flex-col justify-between selection:bg-blue-600 selection:text-white'>
      {/* Decorative Glow Elements */}
      <div className='absolute top-0 left-0 w-[550px] h-[550px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none -translate-x-1/3 -translate-y-1/3'></div>
      <div className='absolute bottom-0 right-0 w-[650px] h-[650px] bg-indigo-600/10 rounded-full blur-[160px] pointer-events-none translate-x-1/4 translate-y-1/4'></div>

      {/* Header */}
      <header className='w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10'>
        <div className='flex items-center gap-3'>
          <div className='h-11 w-11 bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 ring-2 ring-white/10'>
            <span className='font-black text-2xl tracking-tighter text-white'>D</span>
          </div>
          <div>
            <span className='text-2xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent'>Drivo</span>
            <span className='text-[10px] text-blue-400 font-bold block -mt-1 tracking-wider uppercase'>Intelligent Mobility</span>
          </div>
        </div>
        <div className='flex items-center gap-3'>
          <span className='hidden sm:inline-flex items-center gap-1.5 px-3 py-1 text-[10px] uppercase font-bold tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full backdrop-blur-sm'>
            <Sparkles className='h-3 w-3 text-blue-400' />
            AI-Powered Dispatch
          </span>
          <Link 
            to='/login'
            className='text-xs font-semibold text-slate-300 hover:text-white px-3.5 py-1.5 rounded-full border border-white/10 hover:border-white/20 transition-all'
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className='flex-1 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center z-10 py-10 sm:py-16'>
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className='space-y-6'
        >
          <div className='inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-slate-300 backdrop-blur-md'>
            <span className='h-2 w-2 rounded-full bg-emerald-400 animate-pulse'></span>
            <span>Real-time Telemetry & Smart Dispatch Active</span>
          </div>
          
          <h1 className='text-4xl sm:text-6xl font-black tracking-tight leading-[1.08]'>
            Reinventing <br />
            <span className='bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent'>
              Urban Mobility
            </span>
          </h1>
          
          <p className='text-slate-400 text-lg sm:text-xl font-normal max-w-lg leading-relaxed'>
            Drivo brings intelligent route optimization, upfront transparent fares, live driver tracking, and 24/7 AI-powered assistance to every trip.
          </p>

          {/* Core Action Cards */}
          <div className='pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg'>
            <Link to='/login' className='group relative flex items-center justify-between p-5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/40 rounded-2xl transition-all hover:scale-[1.02] shadow-2xl backdrop-blur-md'>
              <div>
                <span className='text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-0.5'>Rider</span>
                <h3 className='font-bold text-lg text-white'>Book a Ride</h3>
                <p className='text-xs text-slate-400 mt-0.5'>Fast, safe, transparent fares</p>
              </div>
              <div className='h-11 w-11 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-all shadow-lg shadow-blue-600/30 flex-shrink-0'>
                <ArrowRight className='h-5 w-5 text-white' />
              </div>
            </Link>

            <Link to='/captain-login' className='group relative flex items-center justify-between p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl transition-all hover:scale-[1.02] shadow-2xl backdrop-blur-md'>
              <div>
                <span className='text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-0.5'>Captain</span>
                <h3 className='font-bold text-lg text-slate-100'>Drive with Drivo</h3>
                <p className='text-xs text-slate-400 mt-0.5'>Highest payouts & daily bonuses</p>
              </div>
              <div className='h-11 w-11 bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 transition-colors border border-slate-700 flex-shrink-0'>
                <ArrowRight className='h-5 w-5 text-slate-300 group-hover:text-white' />
              </div>
            </Link>
          </div>

          {/* Social Proof Mini Bar */}
          <div className='pt-2 flex items-center gap-6 text-xs text-slate-400'>
            <div className='flex items-center gap-1.5'>
              <div className='flex text-amber-400'>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className='h-3.5 w-3.5 fill-amber-400' />
                ))}
              </div>
              <span className='font-bold text-white'>4.9/5</span>
              <span>(25k+ journeys)</span>
            </div>
            <span className='h-3 w-px bg-white/10'></span>
            <div className='flex items-center gap-1.5'>
              <Shield className='h-3.5 w-3.5 text-blue-400' />
              <span>100% Verified Drivers</span>
            </div>
          </div>
        </motion.div>

        {/* Visual Showcase (Feature Highlights Overlay) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className='relative w-full aspect-square max-w-md mx-auto flex items-center justify-center lg:justify-end'
        >
          {/* Glass Card Container */}
          <div className='relative w-full p-8 rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 via-white/5 to-white/0 backdrop-blur-2xl shadow-2xl flex flex-col justify-between space-y-6 overflow-hidden'>
            <div className='absolute -top-16 -right-16 w-56 h-56 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none'></div>
            
            {/* Header info */}
            <div className='flex justify-between items-start'>
              <div>
                <span className='text-[10px] text-blue-400 font-bold uppercase tracking-widest'>Intelligence Engine</span>
                <h4 className='text-2xl font-black mt-1 text-white'>Drivo Telemetry</h4>
              </div>
              <div className='h-9 w-9 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/20'>
                <Zap className='h-4 w-4' />
              </div>
            </div>

            {/* List of features */}
            <div className='space-y-3.5 flex-1 justify-center flex flex-col'>
              {[
                { title: "Dynamic Route Optimizer", desc: "Real-time traffic adjusted navigation", icon: MapPin, color: "text-emerald-400" },
                { title: "24/7 Security Layers", desc: "Encrypted OTP confirmation handshake", icon: Shield, color: "text-blue-400" },
                { title: "Drivo AI Copilot", desc: "Natural language tool calling assistant", icon: Sparkles, color: "text-purple-400" },
                { title: "Real-time Telemetry", desc: "Sub-second live driver GPS sync", icon: Clock, color: "text-amber-400" }
              ].map((item, idx) => (
                <div key={idx} className='flex items-center gap-3.5 p-3.5 bg-white/5 rounded-2xl border border-white/5 hover:border-white/15 transition-all hover:translate-x-1'>
                  <div className={`h-9 w-9 rounded-xl bg-slate-900/70 flex items-center justify-center ${item.color} border border-white/10 flex-shrink-0`}>
                    <item.icon className='h-4 w-4' />
                  </div>
                  <div>
                    <h5 className='text-sm font-semibold text-white'>{item.title}</h5>
                    <p className='text-xs text-slate-400'>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Metrics */}
            <div className='grid grid-cols-3 gap-2 pt-4 border-t border-white/10 text-center'>
              <div className='bg-white/5 p-2 rounded-xl'>
                <span className='text-xl font-black text-white'>99.4%</span>
                <span className='text-[9px] text-slate-400 block uppercase font-bold mt-0.5'>On-Time</span>
              </div>
              <div className='bg-white/5 p-2 rounded-xl'>
                <span className='text-xl font-black text-white'>4.9★</span>
                <span className='text-[9px] text-slate-400 block uppercase font-bold mt-0.5'>Rating</span>
              </div>
              <div className='bg-white/5 p-2 rounded-xl'>
                <span className='text-xl font-black text-white'>25K+</span>
                <span className='text-[9px] text-slate-400 block uppercase font-bold mt-0.5'>Rides</span>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className='w-full max-w-7xl mx-auto px-6 py-6 border-t border-white/5 z-10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4'>
        <p>© 2026 Drivo Inc. All rights reserved.</p>
        <div className='flex gap-6'>
          <a href="#" className='hover:text-slate-300 transition-colors'>Safety & Guidelines</a>
          <a href="#" className='hover:text-slate-300 transition-colors'>Privacy Policy</a>
          <a href="#" className='hover:text-slate-300 transition-colors'>Terms of Service</a>
        </div>
      </footer>
    </div>
  );
};

export default Start;