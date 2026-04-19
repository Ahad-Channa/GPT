import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './contexts/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Landing from './pages/Landing';
import Profile from './pages/Profile';
import Wallet from './pages/Wallet';
import Earn from './pages/Earn';
import Leaderboard from './pages/Leaderboard';
import DailyBonus from './pages/DailyBonus';
import PublicProfile from './pages/PublicProfile';
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
import NotificationPanel from './components/NotificationPanel';

const PrivateRoute = ({ children }) => {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/" replace />;
};

function App() {
  const { currentUser, isAdmin } = useAuth();

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
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
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
      <Route path="/" element={currentUser ? <Navigate to="/dashboard" replace /> : <Landing />} />
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
      
      {/* Admin Routes */}
      <Route 
        path="/admin" 
        element={
          <PrivateRoute>
            {isAdmin ? <AdminLayout /> : <Navigate to="/dashboard" replace />}
          </PrivateRoute>
        }
      >
        <Route index element={<AdminOverview />} />
        <Route path="announcements" element={<AdminAnnouncements />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="admins" element={<AdminStaff />} />
        <Route path="withdrawals" element={<AdminWithdrawals />} />
        <Route path="offerwalls" element={<AdminOfferwalls />} />
        <Route path="promocodes" element={<AdminPromoCodes />} />
        <Route path="featured-offers" element={<AdminCustomOffers />} />
        <Route path="proofs" element={<AdminProofs />} />
        <Route path="leaderboard" element={<AdminLeaderboard />} />
        <Route path="logs" element={<AdminLogs />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
    </Routes>
    </>
  );
}

export default App;
