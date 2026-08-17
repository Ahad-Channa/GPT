import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  FiGrid, FiUsers, FiShield, FiArrowRight, FiLogOut, FiZap, FiDollarSign, FiActivity, FiSliders, FiBox, FiTag, FiStar, FiTrendingUp, FiMessageSquare, FiInbox, FiImage, FiMessageCircle, FiHeadphones, FiAward, FiBook, FiLink
} from 'react-icons/fi';
import './Admin.css';

const AdminLayout = () => {
  const { currentUser, logout, isPrimaryAdmin, isAdmin, isSupportAgent, mongoUser } = useAuth();
  const navigate = useNavigate();
  const [notiCounts, setNotiCounts] = useState({});
  const [totalUnread, setTotalUnread] = useState(0);

  // Support agents should land directly on support tab
  const defaultRedirect = isSupportAgent && !isAdmin && !isPrimaryAdmin ? '/admin/support' : null;

  useEffect(() => {
    fetchNotificationCounts();
    const Barlowval = setInterval(fetchNotificationCounts, 60000);
    return () => clearInterval(Barlowval);
  }, []);

  const fetchNotificationCounts = async () => {
    if (!currentUser) return;
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/notifications/counts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setNotiCounts(data.counts);
        const total = Object.values(data.counts).reduce((a, b) => a + b, 0);
        setTotalUnread(total);
      }
    } catch (err) {
      console.error('Failed to load admin notifications count', err);
    }
  };

  const handleLogout = async () => {
    try { await logout(); navigate('/login'); }
    catch (e) { console.error('Failed to log out', e); }
  };

  // Permission helper
  const hasPerm = (perm) => isPrimaryAdmin || mongoUser?.adminPermissions?.includes(perm);

  // Build nav items based on role
  const navItems = [
    // Overview — primary admin only (has sensitive platform data)
    ...(isPrimaryAdmin ? [{ to: '/admin', end: true, icon: FiGrid, label: 'Overview' }] : []),

    // Users — manage_users perm or primary admin
    ...(hasPerm('manage_users') ? [{ to: '/admin/users', end: false, icon: FiUsers, label: 'Users', badgeKey: 'users' }] : []),

    // Withdrawals — manage_withdrawals perm or primary admin
    ...(hasPerm('manage_withdrawals') ? [{ to: '/admin/withdrawals', end: false, icon: FiDollarSign, label: 'Withdrawals', badgeKey: 'withdrawals' }] : []),

    // Offerwalls group — manage_offerwalls perm or primary admin
    ...(hasPerm('manage_offerwalls') ? [{ to: '/admin/offerwalls', end: false, icon: FiBox, label: 'Offerwalls', badgeKey: 'offerwalls' }] : []),
    ...(hasPerm('manage_offerwalls') ? [{ to: '/admin/promocodes', end: false, icon: FiTag, label: 'Promo Codes' }] : []),
    ...(hasPerm('manage_offerwalls') ? [{ to: '/admin/featured-offers', end: false, icon: FiStar, label: 'Featured Offers' }] : []),
    ...(hasPerm('manage_offerwalls') ? [{ to: '/admin/direct-offers', end: false, icon: FiLink, label: 'Direct Offers' }] : []),
    ...(hasPerm('manage_offerwalls') ? [{ to: '/admin/proofs', end: false, icon: FiInbox, label: 'Proofs' }] : []),


    // Leaderboard / VIP / Avatars — primary admin only
    ...(isPrimaryAdmin ? [{ to: '/admin/leaderboard', end: false, icon: FiTrendingUp, label: 'Leaderboard' }] : []),
    ...(isPrimaryAdmin ? [{ to: '/admin/vip', end: false, icon: FiAward, label: 'VIP Ranks' }] : []),
    ...(isPrimaryAdmin ? [{ to: '/admin/books', end: false, icon: FiBook, label: 'Books' }] : []),
    ...(isPrimaryAdmin ? [{ to: '/admin/avatars', end: false, icon: FiImage, label: 'Avatars' }] : []),

    // Chat Moderation — manage_chat perm, or primary admin
    ...(hasPerm('manage_chat') ? [{ to: '/admin/chat', end: false, icon: FiMessageCircle, label: 'Chat Moderation' }] : []),

    // Support — manage_support perm, support_agent role, or primary admin
    ...(hasPerm('manage_support') || isSupportAgent ? [{ to: '/admin/support', end: false, icon: FiHeadphones, label: 'Support', badgeKey: 'support' }] : []),

    // Staff / Announcements / Logs / Settings — primary admin only
    ...(isPrimaryAdmin ? [{ to: '/admin/admins', end: false, icon: FiShield, label: 'Staff' }] : []),
    ...(isPrimaryAdmin ? [{ to: '/admin/announcements', end: false, icon: FiMessageSquare, label: 'Announcements' }] : []),
    ...(isPrimaryAdmin ? [{ to: '/admin/logs', end: false, icon: FiActivity, label: 'Audit Log', badgeKey: 'security' }] : []),
    ...(isPrimaryAdmin ? [{ to: '/admin/settings', end: false, icon: FiSliders, label: 'Settings', accent: true }] : []),
  ];

  // Role label for sidebar
  const roleLabel = isPrimaryAdmin
    ? 'Primary Admin'
    : isAdmin
    ? 'Admin'
    : isSupportAgent
    ? 'Support Agent'
    : 'Staff';

  return (
    <div className="admin-layout">

      {/* ─── Sidebar ─────────────────────────────── */}
      <aside className="admin-sidebar">
        {/* Brand */}
        <div className="admin-brand">
          <img src="/coins/logo1.png" alt="Logo" className="h-16 w-auto object-contain" />
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{roleLabel}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="admin-nav">
          <span className="admin-nav-label">Management</span>

          {navItems.map(({ to, end, icon: Icon, label, accent, badgeKey }) => {
            const count = badgeKey && notiCounts[badgeKey] ? notiCounts[badgeKey] : 0;
            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `admin-nav-item ${isActive ? 'active' : ''} ${accent ? 'settings-item' : ''}`
                }
              >
                <Icon className="admin-nav-icon" style={accent ? { color: '#fbbf24' } : {}} />
                {label}
                {count > 0 && (
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: '0.65rem',
                    background: '#ef4444',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    fontWeight: 'bold',
                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.4)'
                  }}>
                    {count}
                  </span>
                )}
                {accent && <span style={{ marginLeft: 'auto', fontSize: '0.6rem', background: 'rgba(234,179,8,0.15)', color: '#fbbf24', border: '1px solid rgba(234,179,8,0.25)', borderRadius: '4px', padding: '1px 6px', fontWeight: 700, letterSpacing: '0.05em' }}>ROOT</span>}
              </NavLink>
            );
          })}

          <div className="admin-nav-divider" />
          <span className="admin-nav-label">Actions</span>

          <button
            className="admin-nav-item exit-btn"
            onClick={() => navigate('/dashboard')}
          >
            <FiArrowRight className="admin-nav-icon" />
            Back to Dashboard
          </button>
          <button
            className="admin-nav-item logout-btn"
            onClick={handleLogout}
          >
            <FiLogOut className="admin-nav-icon" />
            Sign Out
          </button>
        </nav>
      </aside>

      {/* ─── Main Content Area ───────────────────── */}
      <main className="admin-main">
        {/* Top Header */}
        <header className="admin-header">
          <h3>TaskMint Management Console</h3>
          <div className="admin-user-info" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            {isPrimaryAdmin && <span className="super-badge">Primary Admin</span>}
            {isSupportAgent && !isPrimaryAdmin && (
              <span style={{ fontSize: '0.7rem', background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '4px', padding: '2px 8px', fontWeight: 700 }}>
                Support Agent
              </span>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
