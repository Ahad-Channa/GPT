import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  FiGrid, FiUsers, FiShield, FiArrowRight, FiLogOut, FiZap, FiDollarSign, FiActivity, FiSliders, FiBox, FiTag, FiStar, FiTrendingUp, FiMessageSquare, FiInbox, FiImage, FiMessageCircle, FiHeadphones, FiAward, FiTarget
} from 'react-icons/fi';
import './Admin.css';

const AdminLayout = () => {
  const { currentUser, logout, isPrimaryAdmin, mongoUser } = useAuth();
  const navigate = useNavigate();
  const [notiCounts, setNotiCounts] = useState({});
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    fetchNotificationCounts();
    // Poll every 1 minute
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
        // Calculate total unread
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

  const navItems = [
    { to: '/admin',             end: true,  icon: FiGrid,       label: 'Overview'      },
    { to: '/admin/users',       end: false, icon: FiUsers,      label: 'Users',        badgeKey: 'users' },
    { to: '/admin/withdrawals', end: false, icon: FiDollarSign, label: 'Withdrawals',  badgeKey: 'withdrawals'   },
    ...(isPrimaryAdmin || mongoUser?.adminPermissions?.includes('manage_offerwalls') ? [{ to: '/admin/offerwalls', end: false, icon: FiBox, label: 'Offerwalls', badgeKey: 'offerwalls' }] : []),
    ...(isPrimaryAdmin || mongoUser?.adminPermissions?.includes('manage_offerwalls') ? [{ to: '/admin/promocodes', end: false, icon: FiTag, label: 'Promo Codes' }] : []),
    ...(isPrimaryAdmin || mongoUser?.adminPermissions?.includes('manage_offerwalls') ? [{ to: '/admin/featured-offers', end: false, icon: FiStar, label: 'Featured Offers' }] : []),
    ...(isPrimaryAdmin || mongoUser?.adminPermissions?.includes('manage_offerwalls') ? [{ to: '/admin/proofs', end: false, icon: FiInbox, label: 'Proofs' }] : []),
    ...(isPrimaryAdmin ? [{ to: '/admin/leaderboard', end: false, icon: FiTrendingUp, label: 'Leaderboard' }] : []),
    ...(isPrimaryAdmin ? [{ to: '/admin/vip',         end: false, icon: FiAward,      label: 'VIP Ranks'   }] : []),
    ...(isPrimaryAdmin ? [{ to: '/admin/missions',    end: false, icon: FiTarget,     label: 'Missions'    }] : []),
    ...(isPrimaryAdmin ? [{ to: '/admin/avatars', end: false, icon: FiImage, label: 'Avatars' }] : []),

    ...(isPrimaryAdmin || mongoUser?.role === 'mod' ? [{ to: '/admin/chat', end: false, icon: FiMessageCircle, label: 'Chat Moderation' }] : []),
    ...(isPrimaryAdmin || mongoUser?.adminPermissions?.includes('manage_support') ? [{ to: '/admin/support', end: false, icon: FiHeadphones, label: 'Support', badgeKey: 'support' }] : []),
    ...(isPrimaryAdmin ? [{ to: '/admin/admins',   end: false, icon: FiShield,   label: 'Staff'     }] : []),
    ...(isPrimaryAdmin ? [{ to: '/admin/announcements', end: false, icon: FiMessageSquare, label: 'Announcements' }] : []),
    ...(isPrimaryAdmin ? [{ to: '/admin/logs',     end: false, icon: FiActivity, label: 'Audit Log', badgeKey: 'security' }] : []),
    ...(isPrimaryAdmin ? [{ to: '/admin/settings', end: false, icon: FiSliders,  label: 'Settings', accent: true }] : []),
  ];

  return (
    <div className="admin-layout">

      {/* ─── Sidebar ─────────────────────────────── */}
      <aside className="admin-sidebar">
        {/* Brand */}
        <div className="admin-brand">
          <div className="admin-brand-icon">
            <FiZap style={{ color: 'white', fontSize: '16px' }} />
          </div>
          <div>
            <h2>GPT Admin</h2>
            <p>{isPrimaryAdmin ? 'Primary Admin' : 'Admin'}</p>
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
          <h3>GPT Management Console</h3>
          <div className="admin-user-info" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>

            {isPrimaryAdmin && <span className="super-badge">Primary Admin</span>}
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
