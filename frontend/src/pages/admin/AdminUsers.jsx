import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  FiCopy, FiSearch, FiX, FiCheck, FiLoader, FiMessageSquare,
  FiEye, FiUser, FiDollarSign, FiActivity, FiGift, FiChevronDown
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── User Detail Modal ────────────────────────────────────────────
const UserDetailModal = ({ user, onClose, currentUser }) => {
  const [tab, setTab] = useState('overview');
  const [transactions, setTransactions] = useState([]);
  const [loadingTx, setLoadingTx] = useState(false);

  useEffect(() => {
    if (tab === 'activity' && user) fetchTransactions();
  }, [tab, user]);

  const fetchTransactions = async () => {
    setLoadingTx(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API}/admin/users/${user._id}/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setTransactions(data.transactions);
    } catch (e) {
      console.error(e);
    }
    setLoadingTx(false);
  };

  if (!user) return null;

  const txTypeColor = (type) => {
    const map = {
      offer_reward: '#818cf8',
      daily_bonus: '#fbbf24',
      promo_code: '#34d399',
      referral_reward: '#22d3ee',
      withdrawal: '#f87171',
      admin_adjustment: '#fb923c',
      leaderboard_reward: '#c084fc',
      custom_offer_reward: '#6ee7b7',
    };
    return map[type] || '#94a3b8';
  };

  return (
    <div
      className="admin-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#0f1422',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '1.5rem',
        width: '100%',
        maxWidth: '700px',
        maxHeight: '88vh',
        overflowY: 'auto',
        position: 'relative',
        padding: '2rem',
      }}>
        {/* Close */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '20px' }}
        >
          <FiX />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <img
            src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.displayName || 'User'}`}
            alt="avatar"
            style={{ width: 52, height: 52, borderRadius: '1rem', border: '2px solid rgba(99,102,241,0.4)', background: '#1e2a44' }}
          />
          <div>
            <h3 style={{ color: '#fff', fontWeight: 800, fontSize: '1.15rem', margin: 0 }}>
              {user.displayName || '—'}
              {user.isBanned && (
                <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem', color: '#f87171', background: 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: '1rem', border: '1px solid rgba(239,68,68,0.2)' }}>
                  BANNED
                </span>
              )}
              {user.role === 'admin' && (
                <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem', color: '#a78bfa', background: 'rgba(139,92,246,0.1)', padding: '2px 8px', borderRadius: '1rem', border: '1px solid rgba(139,92,246,0.2)' }}>
                  ADMIN
                </span>
              )}
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '2px 0 0' }}>{user.email}</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: '#080b14', padding: '4px', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          {[
            { key: 'overview', label: 'Overview', icon: FiUser },
            { key: 'activity', label: 'Activity', icon: FiActivity },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.82rem', fontWeight: 600,
                cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                background: tab === key ? 'rgba(99,102,241,0.15)' : 'none',
                color: tab === key ? '#818cf8' : '#64748b',
              }}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ── */}
        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {[
              { label: 'Wallet Balance', value: `${(user.walletBalance || 0).toLocaleString()} Coins`, color: '#818cf8' },
              { label: 'Total Earned', value: `${(user.totalEarned || 0).toLocaleString()} Coins`, color: '#34d399' },
              { label: 'Referral Earnings', value: `${(user.referralEarnings || 0).toLocaleString()} Coins`, color: '#22d3ee' },
              { label: 'VIP Level', value: `Level ${user.vipLevel || 1}`, color: '#fbbf24' },
              { label: 'Daily Streak', value: `${user.dailyBonusStreak || 0} days`, color: '#fb923c' },
              { label: 'Fraud Flag', value: user.fraudFlag || 0, color: user.fraudFlag > 0 ? '#f87171' : '#475569' },
              { label: 'Referral %', value: user.referralPercentage !== null && user.referralPercentage !== undefined ? `${user.referralPercentage}% (override)` : 'Global default', color: '#94a3b8' },
              { label: 'Referred By', value: user.referredBy ? `Yes (tracked)` : 'Organic', color: '#94a3b8' },
              { label: 'Joined', value: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—', color: '#94a3b8' },
              { label: 'Private Profile', value: user.isPrivate ? 'Yes' : 'No', color: '#94a3b8' },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                style={{
                  background: '#151d2e',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '0.875rem',
                  padding: '0.875rem 1rem',
                }}
              >
                <p style={{ fontSize: '0.67rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>{label}</p>
                <p style={{ fontSize: '0.95rem', fontWeight: 700, color, margin: 0, fontFamily: 'monospace' }}>{value}</p>
              </div>
            ))}

            {/* User ID row — full width */}
            <div style={{ gridColumn: '1 / -1', background: '#151d2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.875rem', padding: '0.875rem 1rem' }}>
              <p style={{ fontSize: '0.67rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>User ID (MongoDB)</p>
              <p style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#64748b', margin: 0 }}>{user._id}</p>
            </div>
            <div style={{ gridColumn: '1 / -1', background: '#151d2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.875rem', padding: '0.875rem 1rem' }}>
              <p style={{ fontSize: '0.67rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Firebase UID</p>
              <p style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#64748b', margin: 0 }}>{user.firebaseUid}</p>
            </div>

            {/* Referral link */}
            <div style={{ gridColumn: '1 / -1', background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.15)', borderRadius: '0.875rem', padding: '0.875rem 1rem' }}>
              <p style={{ fontSize: '0.67rem', fontWeight: 700, color: '#22d3ee', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>User's Referral Link</p>
              <p style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#94a3b8', margin: 0, wordBreak: 'break-all' }}>
                {window.location.origin}/?ref={user._id}
              </p>
            </div>
          </div>
        )}

        {/* ── Activity Tab ── */}
        {tab === 'activity' && (
          <div>
            {loadingTx ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                <FiLoader style={{ animation: 'spin 1s linear infinite', fontSize: 24, color: '#6366f1' }} />
              </div>
            ) : transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#475569' }}>
                <FiActivity size={32} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
                <p>No transaction history found.</p>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '0.75rem' }}>
                  Showing latest {transactions.length} transactions
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {transactions.map(tx => (
                    <div
                      key={tx._id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        background: '#151d2e', border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '0.75rem', padding: '0.6rem 0.875rem',
                      }}
                    >
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: txTypeColor(tx.transactionType), flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {tx.description || tx.transactionType}
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: 2 }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: txTypeColor(tx.transactionType), textTransform: 'uppercase' }}>
                            {tx.transactionType?.replace(/_/g, ' ')}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: '#475569' }}>
                            {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                          </span>
                          {tx.status !== 'completed' && (
                            <span style={{ fontSize: '0.65rem', color: tx.status === 'pending' ? '#fbbf24' : '#f87171', fontWeight: 600 }}>
                              · {tx.status}
                            </span>
                          )}
                        </div>
                      </div>
                      <span style={{
                        fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace', flexShrink: 0,
                        color: tx.amount < 0 ? '#f87171' : '#34d399',
                      }}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount?.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main AdminUsers Component ────────────────────────────────────
const AdminUsers = () => {
  const { currentUser } = useAuth();
  const [users,   setUsers]   = useState([]);
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Detail modal
  const [detailUser, setDetailUser] = useState(null);

  // Modals state
  const [banTarget,     setBanTarget]     = useState(null);
  const [banReason,     setBanReason]     = useState('');
  const [banError,      setBanError]      = useState('');
  const [balanceTarget, setBalanceTarget] = useState(null);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceReason, setBalanceReason] = useState('');
  const [balanceError,  setBalanceError]  = useState('');

  const [refTarget, setRefTarget] = useState(null);
  const [refAmount, setRefAmount] = useState('');
  const [refError,  setRefError]  = useState('');

  useEffect(() => { fetchUsers(); }, [search]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res   = await fetch(`${API}/admin/users?search=${search}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleBanSubmit = async () => {
    if (!banTarget.isBanned && !banReason.trim()) {
      setBanError('A reason is required when banning a user.');
      return;
    }
    setActionLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API}/admin/users/${banTarget._id}/ban`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBanned: !banTarget.isBanned, reason: banReason }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(banTarget.isBanned ? 'User unbanned successfully.' : 'User banned successfully.');
        fetchUsers();
        setBanTarget(null);
      } else {
        setBanError(data.error || 'Action failed.');
      }
    } catch (err) {
      setBanError('Unexpected error. Please try again.');
      console.error(err);
    }
    setActionLoading(false);
  };

  const handleBalanceSubmit = async () => {
    const amount = Number(balanceAmount);
    if (isNaN(amount) || balanceAmount === '') { setBalanceError('Please enter a valid amount.'); return; }
    if (amount === 0) { setBalanceError('Amount cannot be zero.'); return; }
    if (!balanceReason.trim()) { setBalanceError('A reason is required for balance adjustments.'); return; }
    setActionLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API}/admin/users/${balanceTarget._id}/balance`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, reason: balanceReason }),
      });
      const data = await res.json();
      if (data.success) {
        const sign = amount > 0 ? '+' : '';
        toast.success(`Balance adjusted: ${sign}${amount.toLocaleString()} Coins`);
        fetchUsers();
        setBalanceTarget(null);
      } else {
        setBalanceError(data.error || 'Action failed.');
      }
    } catch (err) {
      setBalanceError('Unexpected error. Please try again.');
      console.error(err);
    }
    setActionLoading(false);
  };

  const handleRefSubmit = async () => {
    const amount = refAmount === '' ? null : Number(refAmount);
    if (amount !== null && (isNaN(amount) || amount < 0 || amount > 100)) { setRefError('Please enter a valid percentage between 0 and 100.'); return; }
    
    setActionLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API}/admin/users/${refTarget._id}/referral`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralPercentage: amount }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(amount === null ? 'Referral percentage override removed' : `Referral percentage overridden: ${amount}%`);
        fetchUsers();
        setRefTarget(null);
      } else {
        setRefError(data.error || 'Action failed.');
      }
    } catch (err) {
      setRefError('Unexpected error. Please try again.');
      console.error(err);
    }
    setActionLoading(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied!');
  };

  return (
    <div>
      <h1 className="admin-page-title">User Management</h1>
      <p className="admin-page-sub">View, search and moderate platform users.</p>

      {/* Search */}
      <div className="admin-search-bar">
        <div style={{ position: 'relative', flex: 1 }}>
          <FiSearch style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#475569', fontSize: '14px' }} />
          <input
            type="text"
            className="admin-input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Search by email or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="action-btn primary" onClick={fetchUsers}>
          Search
        </button>
      </div>

      {/* Table */}
      <div className="admin-card">
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="loading-row">
                  <td colSpan="7">Loading users...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr className="loading-row">
                  <td colSpan="7">No users found.</td>
                </tr>
              ) : users.map(u => (
                <tr key={u._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#475569', fontFamily: 'monospace' }}>
                        {u._id.substring(0, 10)}...
                      </span>
                      <button
                        onClick={() => copyToClipboard(u._id)}
                        title="Copy ID"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', padding: 0 }}
                      >
                        <FiCopy size={12} />
                      </button>
                    </div>
                  </td>
                  <td style={{ color: '#cbd5e1', fontWeight: 500 }}>{u.displayName || '—'}</td>
                  <td>{u.email}</td>
                  <td>
                    {u.role === 'admin'
                      ? <span className="super-badge">{u.role}</span>
                      : <span style={{ color: '#475569' }}>{u.role}</span>
                    }
                  </td>
                  <td style={{ fontFamily: 'monospace', color: '#818cf8' }}>{(u.walletBalance || 0).toLocaleString()}</td>
                  <td>
                    {u.isBanned
                      ? <span style={{ color: '#f87171', fontSize: '0.75rem', fontWeight: 600 }}>● Banned</span>
                      : <span style={{ color: '#34d399', fontSize: '0.75rem', fontWeight: 600 }}>● Active</span>
                    }
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {/* View Details */}
                      <button
                        className="action-btn"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#818cf8', borderColor: 'rgba(99,102,241,0.3)' }}
                        onClick={() => setDetailUser(u)}
                      >
                        <FiEye size={12} /> Details
                      </button>
                      <button className="action-btn" onClick={() => { setBalanceTarget(u); setBalanceAmount(''); setBalanceReason(''); setBalanceError(''); }}>Adjust Bal</button>
                      <button className="action-btn" onClick={() => { setRefTarget(u); setRefAmount(u.referralPercentage !== null && u.referralPercentage !== undefined ? String(u.referralPercentage) : ''); setRefError(''); }}>Ref %</button>
                      <button
                        className={`action-btn ${u.isBanned ? 'success' : 'danger'}`}
                        onClick={() => { setBanTarget(u); setBanReason(''); setBanError(''); }}
                      >
                        {u.isBanned ? 'Unban' : 'Ban'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── User Detail Modal ───────────────── */}
      {detailUser && (
        <UserDetailModal
          user={detailUser}
          onClose={() => setDetailUser(null)}
          currentUser={currentUser}
        />
      )}

      {/* ── Ban/Unban Modal ─────────────────────── */}
      {banTarget && (
        <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setBanTarget(null); }}>
          <div className="admin-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
              <h3>{banTarget.isBanned ? 'Unban User' : 'Ban User'}</h3>
              <button onClick={() => setBanTarget(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, fontSize: '18px' }}>
                <FiX />
              </button>
            </div>
            <p style={{ marginBottom: '1rem', color: '#94a3b8', fontSize: '0.9rem' }}>
              User: <strong style={{ color: '#fff' }}>{banTarget.email}</strong>
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.4rem' }}>
              <FiMessageSquare size={12} />
              {banTarget.isBanned ? 'Reason for unbanning' : 'Reason for ban'}
              {!banTarget.isBanned && <span style={{ color: '#f87171' }}>*</span>}
            </label>
            <textarea
              value={banReason}
              onChange={(e) => { setBanReason(e.target.value); setBanError(''); }}
              placeholder={banTarget.isBanned
                ? 'Reason for reinstating this user (optional)…'
                : 'Why is this user being banned? (required)'}
              style={{ borderColor: banError ? 'rgba(248,113,113,0.4)' : undefined }}
            />
            {banError && (
              <p style={{ color: '#f87171', fontSize: '0.8rem', marginTop: '-0.75rem', marginBottom: '1rem' }}>
                {banError}
              </p>
            )}
            <div className="admin-modal-actions">
              <button className="action-btn" onClick={() => setBanTarget(null)}>Cancel</button>
              <button
                className={`action-btn ${banTarget.isBanned ? 'success' : 'danger'}`}
                onClick={handleBanSubmit}
                disabled={actionLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {actionLoading ? <FiLoader style={{ animation: 'spin 1s linear infinite' }} /> : <FiCheck />}
                Confirm {banTarget.isBanned ? 'Unban' : 'Ban'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Adjust Balance Modal ─────────────────────── */}
      {balanceTarget && (
        <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setBalanceTarget(null); }}>
          <div className="admin-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
              <h3>Adjust Balance</h3>
              <button onClick={() => setBalanceTarget(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, fontSize: '18px' }}>
                <FiX />
              </button>
            </div>
            <p style={{ marginBottom: '1rem', color: '#94a3b8', fontSize: '0.9rem' }}>
              User: <strong style={{ color: '#fff' }}>{balanceTarget.email}</strong>
              <span style={{ marginLeft: '0.5rem', fontFamily: 'monospace', color: '#818cf8' }}>
                ({(balanceTarget.walletBalance || 0).toLocaleString()} Coins)
              </span>
            </p>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
              Amount <span style={{ color: '#f87171' }}>*</span>
              <span style={{ color: '#475569', marginLeft: '0.4rem' }}>(use negative to deduct, e.g. -500)</span>
            </label>
            <input
              type="number"
              className="admin-input"
              style={{ marginBottom: '0.85rem', width: '100%', boxSizing: 'border-box', borderColor: balanceError && !balanceAmount ? 'rgba(248,113,113,0.4)' : undefined }}
              value={balanceAmount}
              onChange={(e) => { setBalanceAmount(e.target.value); setBalanceError(''); }}
              placeholder="e.g. 500 or -200"
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.4rem' }}>
              <FiMessageSquare size={12} />
              Reason / Context <span style={{ color: '#f87171' }}>*</span>
            </label>
            <textarea
              value={balanceReason}
              onChange={(e) => { setBalanceReason(e.target.value); setBalanceError(''); }}
              placeholder="Why is this balance being adjusted? (e.g. Bonus reward, correction, refund…)"
              style={{ borderColor: balanceError && !balanceReason.trim() ? 'rgba(248,113,113,0.4)' : undefined }}
            />
            {balanceError && (
              <p style={{ color: '#f87171', fontSize: '0.8rem', marginTop: '-0.75rem', marginBottom: '1rem' }}>
                {balanceError}
              </p>
            )}
            <div className="admin-modal-actions">
              <button className="action-btn" onClick={() => setBalanceTarget(null)}>Cancel</button>
              <button
                className="action-btn primary"
                onClick={handleBalanceSubmit}
                disabled={actionLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {actionLoading ? <FiLoader style={{ animation: 'spin 1s linear infinite' }} /> : <FiCheck />}
                Apply Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Adjust Referral Percentage Modal ─────────────────────── */}
      {refTarget && (
        <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setRefTarget(null); }}>
          <div className="admin-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
              <h3>Override Referral %</h3>
              <button onClick={() => setRefTarget(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, fontSize: '18px' }}>
                <FiX />
              </button>
            </div>
            <p style={{ marginBottom: '1rem', color: '#94a3b8', fontSize: '0.9rem' }}>
              User: <strong style={{ color: '#fff' }}>{refTarget.email}</strong>
            </p>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
              Specific Percentage <span style={{ color: '#f87171' }}>*</span>
              <span style={{ color: '#475569', marginLeft: '0.4rem' }}>(leave empty to use global setting)</span>
            </label>
            <input
              type="number"
              className="admin-input"
              style={{ marginBottom: '0.85rem', width: '100%', boxSizing: 'border-box', borderColor: refError ? 'rgba(248,113,113,0.4)' : undefined }}
              value={refAmount}
              onChange={(e) => { setRefAmount(e.target.value); setRefError(''); }}
              placeholder="e.g. 10"
              min={0}
              max={100}
            />
            {refError && (
              <p style={{ color: '#f87171', fontSize: '0.8rem', marginTop: '-0.75rem', marginBottom: '1rem' }}>
                {refError}
              </p>
            )}
            <div className="admin-modal-actions">
              <button className="action-btn" onClick={() => setRefTarget(null)}>Cancel</button>
              <button
                className="action-btn primary"
                onClick={handleRefSubmit}
                disabled={actionLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {actionLoading ? <FiLoader style={{ animation: 'spin 1s linear infinite' }} /> : <FiCheck />}
                Apply Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
