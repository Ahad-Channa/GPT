import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  FiGrid, FiUsers, FiShield, FiArrowRight, FiLogOut, FiDollarSign,
  FiActivity, FiSettings, FiTarget, FiTag, FiStar, FiCheckSquare,
  FiAward, FiBook, FiUser, FiMessageSquare, FiHelpCircle, FiBell
} from 'react-icons/fi';
import { FaTrophy } from 'react-icons/fa6';
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
    const interval = setInterval(fetchNotificationCounts, 60000);
    return () => clearInterval(interval);
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
    ...(hasPerm('manage_offerwalls') ? [{ to: '/admin/offerwalls', end: false, icon: FiTarget, label: 'Offerwalls', badgeKey: 'offerwalls' }] : []),
    ...(hasPerm('manage_offerwalls') ? [{ to: '/admin/promocodes', end: false, icon: FiTag, label: 'Promo Codes' }] : []),
    ...(hasPerm('manage_offerwalls') ? [{ to: '/admin/featured-offers', end: false, icon: FiStar, label: 'Featured Offers' }] : []),
    ...(hasPerm('manage_offerwalls') ? [{ to: '/admin/goodpicks-offers', end: false, icon: FiCheckSquare, label: 'Goodpicks Offers' }] : []),

    // Leaderboard / VIP / Books / Avatars — primary admin only
    ...(isPrimaryAdmin ? [{ to: '/admin/leaderboard', end: false, icon: FaTrophy, label: 'Leaderboard' }] : []),
    ...(isPrimaryAdmin ? [{ to: '/admin/vip', end: false, icon: FiAward, label: 'VIP Ranks' }] : []),
    ...(isPrimaryAdmin ? [{ to: '/admin/books', end: false, icon: FiBook, label: 'Books' }] : []),
    ...(isPrimaryAdmin ? [{ to: '/admin/avatars', end: false, icon: FiUser, label: 'Avatars' }] : []),

    // Chat Moderation — manage_chat perm, or primary admin
    ...(hasPerm('manage_chat') ? [{ to: '/admin/chat', end: false, icon: FiMessageSquare, label: 'Chat Moderation' }] : []),

    // Support — manage_support perm, support_agent role, or primary admin
    ...(hasPerm('manage_support') || isSupportAgent ? [{ to: '/admin/support', end: false, icon: FiHelpCircle, label: 'Support', badgeKey: 'support' }] : []),

    // Staff / Announcements / Logs / Settings — primary admin only
    ...(isPrimaryAdmin ? [{ to: '/admin/admins', end: false, icon: FiShield, label: 'Staff' }] : []),
    ...(isPrimaryAdmin ? [{ to: '/admin/announcements', end: false, icon: FiBell, label: 'Announcements' }] : []),
    ...(isPrimaryAdmin ? [{ to: '/admin/logs', end: false, icon: FiActivity, label: 'Audit Log', badgeKey: 'security' }] : []),
    ...(isPrimaryAdmin ? [{ to: '/admin/settings', end: false, icon: FiSettings, label: 'Settings', accent: true }] : []),
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
          <img src="/coins/logo final.svg" alt="TaskMint" className="admin-brand-logo" />
          <div style={{ marginTop: '0.2rem' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '999px',
              background: '#F3F4F6',
              color: '#374151',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              border: '1px solid #E5E7EB',
              whiteSpace: 'nowrap'
            }}>
              {roleLabel}
            </span>
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
                  `admin-nav-item ${isActive ? 'active' : ''}`
                }
              >
                <Icon className="admin-nav-icon" />
                <span>{label}</span>
                {count > 0 && (
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: '0.65rem',
                    background: '#EF4444',
                    color: 'white',
                    padding: '2px 7px',
                    borderRadius: '999px',
                    fontWeight: 700,
                  }}>
                    {count}
                  </span>
                )}
                {accent && (
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: '0.6rem',
                    background: '#FEF3C7',
                    color: '#D97706',
                    border: '1px solid #FCD34D',
                    borderRadius: '4px',
                    padding: '1px 6px',
                    fontWeight: 700,
                    letterSpacing: '0.05em'
                  }}>
                    ROOT
                  </span>
                )}
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
            <span>Back to Dashboard</span>
          </button>
          <button
            className="admin-nav-item logout-btn"
            onClick={handleLogout}
          >
            <FiLogOut className="admin-nav-icon" />
            <span>Sign Out</span>
          </button>
        </nav>
      </aside>

      {/* ─── Main Content Area ───────────────────── */}
      <main className="admin-main">
        {/* Top Header */}
        <header className="admin-header">
          <h3>TaskMint Management Console</h3>
          <div className="admin-user-info">
            {isPrimaryAdmin && <span className="super-badge">Primary Admin</span>}
            {isSupportAgent && !isPrimaryAdmin && (
              <span className="badge-cyan">Support Agent</span>
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
