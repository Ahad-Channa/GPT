import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FiBell, FiCheck, FiCheckCircle, FiClock, FiDollarSign, FiUsers, FiBox, FiShield, FiAlertTriangle } from 'react-icons/fi';
import toast from 'react-hot-toast';

const AdminNotifications = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    if (!currentUser) return;
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
      } else {
        toast.error('Failed to load notifications');
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred while loading notifications');
    }
    setLoading(false);
  };

  const markAsRead = async (id = null, category = null) => {
    try {
      const token = await currentUser.getIdToken();
      const body = {};
      if (id) body.notificationId = id;
      if (category) body.category = category;

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/notifications/mark-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(id ? 'Notification marked as read' : 'Notifications marked as read');
        // Update local state
        setNotifications(prev => prev.map(n => {
          if (id && n._id === id) return { ...n, read: true };
          if (category && n.category === category) return { ...n, read: true };
          if (!id && !category) return { ...n, read: true };
          return n;
        }));
      } else {
        toast.error(data.error || 'Failed to mark as read');
      }
    } catch (err) {
      console.error(err);
      toast.error('Server error');
    }
  };

  const getIcon = (category) => {
    switch(category) {
      case 'withdrawals': return <FiDollarSign />;
      case 'users': return <FiUsers />;
      case 'offerwalls': return <FiBox />;
      case 'security': return <FiShield />;
      default: return <FiBell />;
    }
  };

  const getColor = (category) => {
    switch(category) {
      case 'withdrawals': return '#fbbf24';
      case 'users': return '#818cf8';
      case 'offerwalls': return '#34d399';
      case 'security': return '#ef4444';
      default: return '#cbd5e1';
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="admin-page-title">Notifications</h1>
          <p className="admin-page-sub">View and manage administrative alerts.</p>
        </div>
        <button 
          className="action-btn primary"
          onClick={() => markAsRead()}
          disabled={notifications.every(n => n.read)}
        >
          <FiCheckCircle style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
          Mark all as read
        </button>
      </div>

      <div className="admin-card" style={{ padding: '0' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>
            <FiBell style={{ fontSize: '2rem', marginBottom: '1rem', opacity: 0.5 }} />
            <p>You have no notifications.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {notifications.map(noti => (
              <div key={noti._id} style={{
                display: 'flex',
                alignItems: 'flex-start',
                padding: '1.25rem',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: noti.read ? 'transparent' : 'rgba(99,102,241,0.05)',
                transition: 'background 0.2s',
                gap: '1rem'
              }}>
                <div style={{
                  width: '40px', height: '40px',
                  borderRadius: '10px',
                  background: `rgba(${getColor(noti.category) === '#fbbf24' ? '251,191,36' : getColor(noti.category) === '#818cf8' ? '129,140,248' : getColor(noti.category) === '#34d399' ? '52,211,153' : getColor(noti.category) === '#ef4444' ? '239,68,68' : '203,213,225'}, 0.15)`,
                  color: getColor(noti.category),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px',
                  flexShrink: 0
                }}>
                  {getIcon(noti.category)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: noti.read ? '#cbd5e1' : '#fff', fontWeight: noti.read ? 500 : 700 }}>
                      {noti.title}
                    </h4>
                    {!noti.read && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6366f1' }} />}
                  </div>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.4 }}>
                    {noti.message}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.7rem', color: '#64748b' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <FiClock />
                      {new Date(noti.createdAt).toLocaleString()}
                    </span>
                    <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {noti.category}
                    </span>
                  </div>
                </div>
                {!noti.read && (
                  <button 
                    className="action-btn"
                    onClick={() => markAsRead(noti._id)}
                    title="Mark as read"
                    style={{ padding: '0.4rem', flexShrink: 0 }}
                  >
                    <FiCheck />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminNotifications;
