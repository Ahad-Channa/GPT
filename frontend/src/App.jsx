import { useEffect } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './contexts/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Landing from './pages/Landing';
import Profile from './pages/Profile';

import Affiliates from './pages/Affiliates';
import Wallet from './pages/Wallet';
import Earn from './pages/Earn';
import Leaderboard from './pages/Leaderboard';
import DailyBonus from './pages/DailyBonus';
import PublicProfile from './pages/PublicProfile';
import Chat from './pages/Chat';
import AdminLayout from './pages/admin/AdminLayout';
import AdminOverview from './pages/admin/AdminOverview';
import AdminAnnouncements from './pages/admin/AdminAnnouncements';
import AdminUsers from './pages/admin/AdminUsers';
import AdminStaff from './pages/admin/AdminStaff';
import AdminWithdrawals from './pages/admin/AdminWithdrawals';
import AdminLogs from './pages/admin/AdminLogs';
import AdminSettings from './pages/admin/AdminSettings';
import AdminOfferwalls from './pages/admin/AdminOfferwalls';
import AdminPromoCodes from './pages/admin/AdminPromoCodes';
import AdminCustomOffers from './pages/admin/AdminCustomOffers';
import AdminLeaderboard from './pages/admin/AdminLeaderboard';
import AdminProofs from './pages/admin/AdminProofs';
import AdminAvatars from './pages/admin/AdminAvatars';
import AdminChat from './pages/admin/AdminChat';
import AdminSupport from './pages/admin/AdminSupport';
import AdminVip from './pages/admin/AdminVip';
import VipPage from './pages/VipPage';
import MissionPage from './pages/MissionPage';
import AdminMissions from './pages/admin/AdminMissions';
import AdminBooks from './pages/admin/AdminBooks';
import NotificationPanel from './components/NotificationPanel';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const PrivateRoute = ({ children }) => {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/" replace />;
};

/**
 * ReferralRedirect — handles short referral URLs like /r/XXXXXXXX
 * Resolves the short code to a user ID, stores it in localStorage
 * (same mechanism as ?ref= on the landing page), then redirects to /.
 */
const ReferralRedirect = () => {
  const { code } = useParams();

  useEffect(() => {
    const resolve = async () => {
      try {
        const res = await fetch(`${API}/public/r/${code}`);
        const data = await res.json();
        if (data.success && data.referrerId) {
          localStorage.setItem('ref', data.referrerId);
        }
      } catch (e) {
        // Ignore — user still lands on home page
      } finally {
        window.location.replace('/');
      }
    };
    resolve();
  }, [code]);

  return null; // Nothing to render — redirect happens immediately
};

function App() {
  const { currentUser, isAdmin, hasAdminAccess } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      localStorage.setItem('ref', ref);
    }
  }, []);

  return (
    <>
      <Toaster 
        position="bottom-right" 
        toastOptions={{
          style: {
            background: '#0A0A0A',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '2px',
            fontFamily: "'Barlow', system-ui, sans-serif",
            fontFeatureSettings: '"cv01" 0, "zero" 0',
            fontVariantNumeric: 'normal',
            fontSize: '12px',
            textTransform: 'uppercase'
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#0A0A0A' }
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#0A0A0A' }
          }
        }} 
      />
      <NotificationPanel />
      <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/r/:code" element={<ReferralRedirect />} />
      <Route path="/login" element={currentUser ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route 
        path="/dashboard" 
        element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        } 
      />
      <Route 
        path="/dashboard/profile" 
        element={
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        } 
      />
      <Route 
        path="/dashboard/wallet" 
        element={
          <PrivateRoute>
            <Wallet />
          </PrivateRoute>
        } 
      />
      <Route 
        path="/dashboard/earn" 
        element={
          <PrivateRoute>
            <Earn />
          </PrivateRoute>
        } 
      />
      <Route 
        path="/dashboard/leaderboard" 
        element={
          <PrivateRoute>
            <Leaderboard />
          </PrivateRoute>
        } 
      />
      <Route 
        path="/dashboard/daily-bonus" 
        element={
          <PrivateRoute>
            <DailyBonus />
          </PrivateRoute>
        } 
      />
      <Route 
        path="/user/:id" 
        element={
          <PrivateRoute>
            <PublicProfile />
          </PrivateRoute>
        } 
      />
      <Route 
        path="/dashboard/chat" 
        element={
          <PrivateRoute>
            <Chat />
          </PrivateRoute>
        } 
      />
      <Route 
        path="/dashboard/affiliates" 
        element={
          <PrivateRoute>
            <Affiliates />
          </PrivateRoute>
        } 
      />
      <Route 
        path="/dashboard/vip" 
        element={
          <PrivateRoute>
            <VipPage />
          </PrivateRoute>
        } 
      />
      <Route 
        path="/dashboard/missions" 
        element={
          <PrivateRoute>
            <MissionPage />
          </PrivateRoute>
        } 
      />
      
      {/* Admin Routes */}
      <Route 
        path="/admin" 
        element={
          <PrivateRoute>
            {hasAdminAccess ? <AdminLayout /> : <Navigate to="/dashboard" replace />}
          </PrivateRoute>
        }
      >
        <Route index element={<AdminOverview />} />
        <Route path="announcements" element={<AdminAnnouncements />} />
        <Route path="vip" element={<AdminVip />} />
        <Route path="missions" element={<AdminMissions />} />
        <Route path="avatars" element={<AdminAvatars />} />
        <Route path="books" element={<AdminBooks />} />
        <Route path="admins" element={<AdminStaff />} />
        <Route path="withdrawals" element={<AdminWithdrawals />} />
        <Route path="offerwalls" element={<AdminOfferwalls />} />
        <Route path="promocodes" element={<AdminPromoCodes />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="featured-offers" element={<AdminCustomOffers />} />
        <Route path="proofs" element={<AdminProofs />} />
        <Route path="leaderboard" element={<AdminLeaderboard />} />
        <Route path="chat" element={<AdminChat />} />
        <Route path="support" element={<AdminSupport />} />
        <Route path="logs" element={<AdminLogs />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
    </Routes>
    </>
  );
}

export default App;
