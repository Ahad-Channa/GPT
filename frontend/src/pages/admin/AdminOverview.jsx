import { useState, useEffect } from 'react';
import { FiUsers, FiDollarSign, FiActivity } from 'react-icons/fi';

const AdminOverview = () => {
  const [stats, setStats] = useState({ users: 0, pendingWithdrawals: 0, totalBalance: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setStats({ users: 142, pendingWithdrawals: 5, totalBalance: 45000 });
      setLoading(false);
    }, 800);
  }, []);

  const statCards = [
    {
      label: 'Total Users',
      value: stats.users,
      unit: 'Registered',
      icon: FiUsers,
      color: '#818cf8',
      glow: 'rgba(99,102,241,0.2)',
      gradient: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    },
    {
      label: 'Pending Withdrawals',
      value: stats.pendingWithdrawals,
      unit: 'Awaiting Review',
      icon: FiActivity,
      color: '#fbbf24',
      glow: 'rgba(234,179,8,0.2)',
      gradient: 'linear-gradient(135deg, #d97706, #b45309)',
    },
    {
      label: 'Economy Balance',
      value: `${stats.totalBalance.toLocaleString()}`,
      unit: 'Platform Points',
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
