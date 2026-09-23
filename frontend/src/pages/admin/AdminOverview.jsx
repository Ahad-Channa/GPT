import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { FiUsers, FiDollarSign, FiActivity, FiBriefcase } from 'react-icons/fi';
import toast from 'react-hot-toast';
import CoinDisplay from '../../components/CoinDisplay';

const AdminOverview = () => {
  const { currentUser, isPrimaryAdmin, isSupportAgent, mongoUser } = useAuth();

  // Only the primary admin can see this sensitive overview screen.
  // Everyone else gets redirected to the first section they can access.
  if (!isPrimaryAdmin) {
    const perms = mongoUser?.adminPermissions || [];

    if (isSupportAgent || perms.includes('manage_support')) {
      return <Navigate to="/admin/support" replace />;
    }
    if (perms.includes('manage_users')) {
      return <Navigate to="/admin/users" replace />;
    }
    if (perms.includes('manage_withdrawals')) {
      return <Navigate to="/admin/withdrawals" replace />;
    }
    if (perms.includes('manage_chat')) {
      return <Navigate to="/admin/chat" replace />;
    }
    if (perms.includes('manage_offerwalls')) {
      return <Navigate to="/admin/offerwalls" replace />;
    }
    // Fallback — no permissions configured yet
    return (
      <div className="admin-card text-center py-12">
        <h2 className="text-xl font-bold text-[#0E0F0C] mb-2 font-['Bricolage_Grotesque']">No Access</h2>
        <p className="text-gray-500 text-sm">
          You don't have any permissions assigned yet. Contact the Primary Admin.
        </p>
      </div>
    );
  }

  const [stats, setStats] = useState({
    totalUsers: 0,
    bannedUsers: 0,
    totalPendingWithdrawal: 0,
    pendingOffers: 0,
    economyTotal: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/overview-stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      } else {
        toast.error('Failed to load overview stats');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error fetching overview stats');
    }
    setLoading(false);
  };

  const statCards = [
    {
      label: 'Total Users',
      value: stats.totalUsers?.toLocaleString() || '0',
      unit: `+${stats.bannedUsers} Banned`,
      icon: FiUsers,
      color: '#1E2538',
      iconBg: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: 'Pending Withdrawals',
      value: <CoinDisplay amount={stats.totalPendingWithdrawal} size={22} compact={false} />,
      unit: 'Awaiting Review',
      icon: FiActivity,
      color: '#D97706',
      iconBg: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Pending Offers',
      value: stats.pendingOffers?.toLocaleString() || '0',
      unit: 'User Submissions',
      icon: FiBriefcase,
      color: '#DC2626',
      iconBg: 'bg-red-50 text-red-600',
    },
    {
      label: 'Economy Balance',
      value: <CoinDisplay amount={stats.economyTotal} size={22} compact={false} />,
      unit: 'Total in Circulation',
      icon: FiDollarSign,
      color: '#059669',
      iconBg: 'bg-emerald-50 text-emerald-600',
    },
  ];

  return (
    <div>
      <h1 className="admin-page-title">Platform Overview</h1>
      <p className="admin-page-sub">Real-time platform metrics and activity overview.</p>

      {loading ? (
        <div className="admin-card text-center py-16 text-gray-400">
          <div className="w-8 h-8 rounded-full border-2 border-[#1E2538] border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium">Loading statistics...</p>
        </div>
      ) : (
        <div className="admin-stat-grid">
          {statCards.map((card, i) => (
            <div key={i} className="admin-stat-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span className="admin-stat-label">{card.label}</span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                  <card.icon style={{ fontSize: '17px' }} />
                </div>
              </div>
              <div className="admin-stat-value" style={{ color: card.color }}>{card.value}</div>
              <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: '0.35rem', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 500 }}>
                {card.unit}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminOverview;
