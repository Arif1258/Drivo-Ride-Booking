import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Clock, Zap, MapPin } from 'lucide-react';

const Start = () => {
  return (
    <div className='min-h-screen bg-slate-950 text-white relative overflow-hidden flex flex-col justify-between selection:bg-blue-600 selection:text-white'>
      {/* Decorative Blur Spheres */}
      <div className='absolute top-0 left-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none -translate-x-1/3 -translate-y-1/3'></div>
      <div className='absolute bottom-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none translate-x-1/4 translate-y-1/4'></div>

      {/* Header */}
      <header className='w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10'>
        <div className='flex items-center gap-3'>
          <div className='h-10 w-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20'>
            <span className='font-black text-xl tracking-tighter'>D</span>
          </div>
          <span className='text-xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent'>Drivo</span>
        </div>
        <div>
          <span className='inline-flex items-center gap-1.5 px-3 py-1 text-[10px] uppercase font-bold tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full'>
            Incubated @ CRTDH, IIT Kharagpur
          </span>
        </div>
      </header>

      {/* Hero Section */}
      <main className='flex-1 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center z-10 py-12'>
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className='space-y-6'
        >
          <div className='inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-slate-300 backdrop-blur-sm'>
            <span className='h-2 w-2 rounded-full bg-green-500 animate-pulse'></span>
            AI-Optimized Ride Booking Active
          </div>
          <h1 className='text-4xl sm:text-6xl font-black tracking-tight leading-[1.1]'>
            Reinventing <br />
            <span className='bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent'>
              Urban Mobility
            </span>
          </h1>
          <p className='text-slate-400 text-lg sm:text-xl font-normal max-w-lg leading-relaxed'>
            Drivo brings next-generation route optimization, smart dispatch, and transparent pricing to your everyday travels.
          </p>

          {/* Core Action Cards */}
          <div className='pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md'>
            <Link to='/login' className='group relative flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all hover:scale-[1.02] shadow-xl'>
              <div>
                <h3 className='font-bold text-base'>Book a Ride</h3>
                <p className='text-xs text-slate-500 mt-1'>Fast, safe, transparent fares</p>
              </div>
              <div className='h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/30'>
                <ArrowRight className='h-5 w-5 text-white' />
              </div>
            </Link>

            <Link to='/captain-login' className='group relative flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:border-slate-700 transition-all hover:scale-[1.02] shadow-xl'>
              <div>
                <h3 className='font-bold text-base text-slate-200'>Drive with Us</h3>
                <p className='text-xs text-slate-500 mt-1'>Highest payouts & bonuses</p>
              </div>
              <div className='h-10 w-10 bg-slate-850 rounded-xl flex items-center justify-center group-hover:bg-slate-800 transition-colors border border-slate-750'>
                <ArrowRight className='h-5 w-5 text-slate-300' />
              </div>
            </Link>
          </div>
        </motion.div>

        {/* Visual Showcase (Features & Metrics Overlay) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className='relative w-full aspect-square max-w-md mx-auto flex items-center justify-center lg:justify-end'
        >
          {/* Glass Card Container */}
          <div className='relative w-full p-8 rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-white/0 backdrop-blur-xl shadow-2xl flex flex-col justify-between space-y-8 overflow-hidden'>
            <div className='absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none'></div>
            
            {/* Header info */}
            <div className='flex justify-between items-start'>
              <div>
                <span className='text-xs text-slate-400 font-bold uppercase tracking-widest'>Core Engine</span>
                <h4 className='text-xl font-bold mt-1'>Dynamic Tracking</h4>
              </div>
              <div className='h-8 w-8 bg-blue-500/10 text-blue-400 rounded-lg flex items-center justify-center border border-blue-500/20'>
                <Zap className='h-4 w-4' />
              </div>
            </div>

            {/* List of features */}
            <div className='space-y-4 flex-1 justify-center flex flex-col'>
              {[
                { title: "Smart Route Optimizer", desc: "Mapbox direction systems", icon: MapPin, color: "text-emerald-400" },
                { title: "24/7 Security Layers", desc: "Encrypted OTP confirmation", icon: Shield, color: "text-blue-400" },
                { title: "Real-time Telemetry", desc: "Instant WebSocket coordinates", icon: Clock, color: "text-purple-400" }
              ].map((item, idx) => (
                <div key={idx} className='flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors'>
                  <div className={`h-8 w-8 rounded-lg bg-slate-900/50 flex items-center justify-center ${item.color}`}>
                    <item.icon className='h-4 w-4' />
                  </div>
                  <div>
                    <h5 className='text-sm font-semibold'>{item.title}</h5>
                    <p className='text-xs text-slate-500'>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Metrics */}
            <div className='grid grid-cols-3 gap-2 pt-4 border-t border-white/5 text-center'>
              <div>
                <span className='text-xl font-black text-white'>80%</span>
                <span className='text-[10px] text-slate-500 block uppercase font-bold mt-0.5'>Faster ETA</span>
              </div>
              <div>
                <span className='text-xl font-black text-white'>4.9★</span>
                <span className='text-[10px] text-slate-500 block uppercase font-bold mt-0.5'>Rating</span>
              </div>
              <div>
                <span className='text-xl font-black text-white'>25K+</span>
                <span className='text-[10px] text-slate-500 block uppercase font-bold mt-0.5'>Rides</span>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className='w-full max-w-7xl mx-auto px-6 py-6 border-t border-white/5 z-10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4'>
        <p>© 2026 Drivo Inc. All rights reserved.</p>
        <div className='flex gap-6'>
          <a href="#" className='hover:text-slate-350 transition-colors'>Privacy Policy</a>
          <a href="#" className='hover:text-slate-350 transition-colors'>Terms of Service</a>
        </div>
      </footer>
    </div>
  );
};

export default Start;