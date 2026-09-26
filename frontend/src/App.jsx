import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import Start from './pages/Start';
import UserLogin from './pages/UserLogin';
import UserSignup from './pages/UserSignup';
import Captainlogin from './pages/Captainlogin';
import CaptainSignup from './pages/CaptainSignup';
import Home from './pages/Home';
import UserProtectWrapper from './pages/UserProtectWrapper';
import UserLogout from './pages/UserLogout';
import CaptainHome from './pages/CaptainHome';
import CaptainProtectWrapper from './pages/CaptainProtectWrapper';
import CaptainLogout from './pages/CaptainLogout';
import Riding from './pages/Riding';
import CaptainRiding from './pages/CaptainRiding';
import PaymentHistory from './pages/PaymentHistory';
import EarningsDashboard from './pages/EarningsDashboard';
import AdminAnalytics from './pages/AdminAnalytics';
import MyRides from './pages/MyRides';
import TrackRide from './pages/TrackRide';
import Offers from './pages/Offers';
import Notifications from './pages/Notifications';
import HelpSupport from './pages/HelpSupport';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import 'remixicon/fonts/remixicon.css';

const App = () => {
  return (
    <div>
      <Routes>
        {/* Public & Guest Accessible Routes */}
        <Route path='/' element={<Start />} />
        <Route path='/login' element={<UserLogin />} />
        <Route path='/signup' element={<UserSignup />} />
        <Route path='/captain-login' element={<Captainlogin />} />
        <Route path='/captain-signup' element={<CaptainSignup />} />
        <Route path='/offers' element={<Offers />} />
        <Route path='/support' element={<HelpSupport />} />

        {/* Authenticated Rider Routes */}
        <Route 
          path='/home'
          element={
            <UserProtectWrapper>
              <Home />
            </UserProtectWrapper>
          } 
        />
        <Route 
          path='/book-ride'
          element={
            <UserProtectWrapper>
              <Home />
            </UserProtectWrapper>
          } 
        />
        <Route 
          path='/my-rides'
          element={
            <UserProtectWrapper>
              <MyRides />
            </UserProtectWrapper>
          } 
        />
        <Route 
          path='/bookings'
          element={
            <UserProtectWrapper>
              <MyRides />
            </UserProtectWrapper>
          } 
        />
        <Route 
          path='/track-ride'
          element={
            <UserProtectWrapper>
              <TrackRide />
            </UserProtectWrapper>
          } 
        />
        <Route 
          path='/payments'
          element={
            <UserProtectWrapper>
              <PaymentHistory />
            </UserProtectWrapper>
          } 
        />
        <Route 
          path='/payment-methods'
          element={
            <UserProtectWrapper>
              <PaymentHistory />
            </UserProtectWrapper>
          } 
        />
        <Route 
          path='/notifications'
          element={
            <UserProtectWrapper>
              <Notifications />
            </UserProtectWrapper>
          } 
        />
        <Route 
          path='/profile'
          element={
            <UserProtectWrapper>
              <Profile />
            </UserProtectWrapper>
          } 
        />
        <Route 
          path='/settings'
          element={
            <UserProtectWrapper>
              <Settings />
            </UserProtectWrapper>
          } 
        />
        <Route 
          path='/riding' 
          element={
            <UserProtectWrapper>
              <Riding />
            </UserProtectWrapper>
          } 
        />
        <Route 
          path='/admin-analytics' 
          element={
            <UserProtectWrapper>
              <AdminAnalytics />
            </UserProtectWrapper>
          } 
        />
        <Route 
          path='/user/logout'
          element={
            <UserProtectWrapper>
              <UserLogout />
            </UserProtectWrapper>
          } 
        />

        {/* Captain Driver Routes */}
        <Route 
          path='/captain-home' 
          element={
            <CaptainProtectWrapper>
              <CaptainHome />
            </CaptainProtectWrapper>
          } 
        />
        <Route 
          path='/captain-earnings' 
          element={
            <CaptainProtectWrapper>
              <EarningsDashboard />
            </CaptainProtectWrapper>
          } 
        />
        <Route 
          path='/captain-riding' 
          element={
            <CaptainProtectWrapper>
              <CaptainRiding />
            </CaptainProtectWrapper>
          } 
        />
        <Route 
          path='/captain/logout' 
          element={
            <CaptainProtectWrapper>
              <CaptainLogout />
            </CaptainProtectWrapper>
          } 
        />

        {/* Fallback to Home */}
        <Route path='*' element={<Navigate to='/' replace />} />
      </Routes>
    </div>
  );
};

export default App;