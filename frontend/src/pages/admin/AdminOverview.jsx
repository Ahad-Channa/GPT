import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FiUsers, FiDollarSign, FiActivity, FiBriefcase, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

const AdminOverview = () => {
  const { currentUser } = useAuth();
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
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/overview-stats`, {
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
      value: stats.totalUsers,
      unit: `+${stats.bannedUsers} Banned`,
      icon: FiUsers,
      color: '#818cf8',
      glow: 'rgba(99,102,241,0.2)',
      gradient: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    },
    {
      label: 'Pending Withdrawals',
      value: stats.totalPendingWithdrawal.toLocaleString(),
      unit: 'Coins Awaiting Review',
      icon: FiActivity,
      color: '#fbbf24',
      glow: 'rgba(234,179,8,0.2)',
      gradient: 'linear-gradient(135deg, #d97706, #b45309)',
    },
    {
      label: 'Pending Offers',
      value: stats.pendingOffers,
      unit: 'User Submissions',
      icon: FiBriefcase,
      color: '#f87171',
      glow: 'rgba(239,68,68,0.2)',
      gradient: 'linear-gradient(135deg, #dc2626, #991b1b)',
    },
    {
      label: 'Economy Balance',
      value: `${stats.economyTotal.toLocaleString()}`,
      unit: 'Total Coins in Circulation',
      icon: FiDollarSign,
      color: '#34d399',
      glow: 'rgba(16,185,129,0.2)',
      gradient: 'linear-gradient(135deg, #059669, #0d9488)',
    },
  ];

  return (
    <div>
      <h1 className="admin-page-title">Platform Overview</h1>
      <p className="admin-page-sub">Real-time statistics for the GPT Platform.</p>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>
          Loading statistics...
        </div>
      ) : (
        <div className="admin-stat-grid">
          {statCards.map((card, i) => (
            <div key={i} className="admin-stat-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <span className="admin-stat-label">{card.label}</span>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: card.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 4px 12px ${card.glow}`
                }}>
                  <card.icon style={{ color: 'white', fontSize: '16px' }} />
                </div>
              </div>
              <div className="admin-stat-value" style={{ color: card.color }}>{card.value}</div>
              <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.25rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
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
