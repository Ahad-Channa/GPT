import { useEffect } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';
import Home from './pages/Home';
import ResetPassword from './pages/ResetPassword';
import Landing from './pages/Landing';
import Profile from './pages/Profile';
import TwoFactorOverlay from './components/TwoFactorOverlay';

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
import AdminGoodpicksOffers from './pages/admin/AdminGoodpicksOffers';
import AdminLeaderboard from './pages/admin/AdminLeaderboard';
import AdminAvatars from './pages/admin/AdminAvatars';
import AdminChat from './pages/admin/AdminChat';
import AdminSupport from './pages/admin/AdminSupport';
import AdminVip from './pages/admin/AdminVip';
import VipPage from './pages/VipPage';

import AdminBooks from './pages/admin/AdminBooks';
import AdminLegalPages from './pages/admin/AdminLegalPages';
import AdminCookies from './pages/admin/AdminCookies';
import LegalPage from './pages/LegalPage';
import NotificationPanel from './components/NotificationPanel';
import CookieConsentBanner from './components/cookie/CookieConsentBanner';
import CookieSettingsModal from './components/cookie/CookieSettingsModal';
import { useCookieConsent } from './contexts/CookieConsentContext';

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
  const { hasConsent } = useCookieConsent();

  useEffect(() => {
    const resolve = async () => {
      try {
        const res = await fetch(`${API}/public/r/${code}`);
        const data = await res.json();
        if (data.success && data.referrerId) {
          if (hasConsent && hasConsent('marketing')) {
            localStorage.setItem('ref', data.referrerId);
            document.cookie = `ref=${encodeURIComponent(data.referrerId)}; max-age=2592000; path=/; SameSite=Lax`;
          } else {
            sessionStorage.setItem('pending_ref', data.referrerId);
            localStorage.removeItem('ref');
            document.cookie = 'ref=; max-age=0; path=/; SameSite=Lax';
          }
        }
      } catch (e) {
        // Ignore — user still lands on home page
      } finally {
        window.location.replace('/');
      }
    };
    resolve();
  }, [code, hasConsent]);

  return null; // Nothing to render — redirect happens immediately
};

function App() {
  const { currentUser, isAdmin, hasAdminAccess, twoFactorRequired } = useAuth();
  const { isDarkMode } = useTheme();
  const { hasConsent } = useCookieConsent();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      if (hasConsent && hasConsent('marketing')) {
        localStorage.setItem('ref', ref);
        document.cookie = `ref=${encodeURIComponent(ref)}; max-age=2592000; path=/; SameSite=Lax`;
      } else {
        sessionStorage.setItem('pending_ref', ref);
        localStorage.removeItem('ref');
        document.cookie = 'ref=; max-age=0; path=/; SameSite=Lax';
      }
    }
  }, [hasConsent]);

  return (
    <>
      <CookieConsentBanner />
      <CookieSettingsModal />
      {currentUser && twoFactorRequired && <TwoFactorOverlay />}
      <Toaster
        position="bottom-right"
        containerStyle={{ zIndex: 999999, bottom: 24, right: 24 }}
        toastOptions={{
          className: 'custom-toast',
          duration: 3000,
          style: {
            minHeight: '52px',
            height: 'auto',
            minWidth: '223px',
            width: 'auto',
            maxWidth: 'calc(100vw - 32px)',
            background: isDarkMode ? 'rgba(12, 14, 17, 1)' : 'rgba(255, 255, 255, 1)',
            color: isDarkMode ? '#FFFFFF' : '#111827',
            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: isDarkMode ? '0px 12px 24px 0px rgba(0, 0, 0, 0.6)' : '0px 12px 20px 0px rgba(0, 0, 0, 0.15)',
            borderRadius: '12px',
            paddingTop: '19px',
            paddingRight: '25px',
            paddingBottom: '19px',
            paddingLeft: '25px',
            gap: '5px',
            fontFamily: '"Bricolage Grotesque", sans-serif',
            fontWeight: 700,
            fontSize: '18px',
            lineHeight: '27px',
            letterSpacing: '-0.02em',
            textTransform: 'uppercase',
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            boxSizing: 'border-box'
          },
          success: {
            icon: null
          },
          error: {
            icon: null
          },
          loading: {
            icon: null
          }
        }}
      />
      <NotificationPanel />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/r/:code" element={<ReferralRedirect />} />
        <Route path="/login" element={currentUser ? <Navigate to="/dashboard" replace /> : <Navigate to="/?tab=login" replace />} />
        <Route path="/register" element={currentUser ? <Navigate to="/dashboard" replace /> : <Navigate to="/?tab=register" replace />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/legal/:slug" element={<LegalPage />} />
        <Route path="/policies" element={<LegalPage />} />
        <Route path="/policies/:slug" element={<LegalPage />} />
        <Route path="/impressum" element={<LegalPage customSlug="impressum" />} />
        <Route path="/terms-of-use" element={<LegalPage customSlug="terms-of-use" />} />
        <Route path="/terms-of-service" element={<LegalPage customSlug="terms-of-use" />} />
        <Route path="/privacy-policy" element={<LegalPage customSlug="privacy-policy" />} />
        <Route path="/affiliate-policy" element={<LegalPage customSlug="affiliate-policy" />} />
        <Route path="/cookie-policy" element={<LegalPage customSlug="cookie-policy" />} />
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

          <Route path="avatars" element={<AdminAvatars />} />
          <Route path="books" element={<AdminBooks />} />
          <Route path="admins" element={<AdminStaff />} />
          <Route path="withdrawals" element={<AdminWithdrawals />} />
          <Route path="offerwalls" element={<AdminOfferwalls />} />
          <Route path="promocodes" element={<AdminPromoCodes />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="featured-offers" element={<AdminCustomOffers />} />
          <Route path="goodpicks-offers" element={<AdminGoodpicksOffers />} />
          <Route path="leaderboard" element={<AdminLeaderboard />} />
          <Route path="chat" element={<AdminChat />} />
          <Route path="support" element={<AdminSupport />} />
          <Route path="logs" element={<AdminLogs />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="legal-pages" element={<AdminLegalPages />} />
          <Route path="cookies" element={<AdminCookies />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
