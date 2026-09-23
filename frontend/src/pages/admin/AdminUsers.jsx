import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  FiCopy, FiSearch, FiX, FiCheck, FiLoader, FiMessageSquare,
  FiEye, FiUser, FiDollarSign, FiActivity, FiShield, FiAlertTriangle
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import CoinDisplay from '../../components/CoinDisplay';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── User Detail Modal ────────────────────────────────────────────
const UserDetailModal = ({ user, onClose, currentUser }) => {
  const [tab, setTab] = useState('overview');
  const [transactions, setTransactions] = useState([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [loadingLinked, setLoadingLinked] = useState(false);
  const [fraudStatusSelect, setFraudStatusSelect] = useState(user.fraudStatus || 'clean');
  const [savingFraud, setSavingFraud] = useState(false);

  useEffect(() => {
    if (tab === 'activity' && user) fetchTransactions();
    if (tab === 'fraud' && user) fetchLinkedAccounts();
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

  const fetchLinkedAccounts = async () => {
    setLoadingLinked(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API}/admin/linked-accounts/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setLinkedAccounts(data.linkedAccounts);
    } catch (e) {
      console.error(e);
    }
    setLoadingLinked(false);
  };

  const handleFraudStatusChange = async (newStatus) => {
    setSavingFraud(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API}/admin/fraud-status/${user._id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fraudStatus: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setFraudStatusSelect(newStatus);
        toast.success(`Fraud status updated to ${newStatus}`);
      } else {
        toast.error(data.error || 'Failed to update');
      }
    } catch (e) {
      toast.error('Failed to update fraud status');
    }
    setSavingFraud(false);
  };

  if (!user) return null;

  const txTypeColor = (type) => {
    const map = {
      offer_reward: '#4F46E5',
      daily_bonus: '#D97706',
      promo_code: '#059669',
      referral_reward: '#0284C7',
      withdrawal: '#DC2626',
      admin_adjustment: '#EA580C',
      leaderboard_reward: '#7C3AED',
      custom_offer_reward: '#059669',
      chargeback: '#E11D48',
    };
    return map[type] || '#6B7280';
  };

  return (
    <div
      className="admin-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '1.5rem',
        width: '100%',
        maxWidth: '700px',
        maxHeight: '88vh',
        overflowY: 'auto',
        position: 'relative',
        padding: '2rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
      }}>
        {/* Close */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '20px' }}
        >
          <FiX />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <img
            src={user.avatarUrl || `/avatars/avatar1.png`}
            alt="avatar"
            style={{ width: 52, height: 52, borderRadius: '50%', border: '2px solid #E5E7EB', background: '#F3F4F6' }}
          />
          <div>
            <h3 style={{ color: '#0E0F0C', fontWeight: 700, fontSize: '1.2rem', margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              {user.displayName || '—'}
              {user.isBanned && (
                <span style={{ marginLeft: '0.5rem', fontSize: '0.68rem', color: '#DC2626', background: '#FEF2F2', padding: '2px 8px', borderRadius: '1rem', border: '1px solid #FECACA', fontWeight: 700 }}>
                  BANNED
                </span>
              )}
              {user.role === 'admin' && (
                <span style={{ marginLeft: '0.5rem', fontSize: '0.68rem', color: '#7C3AED', background: '#F5F3FF', padding: '2px 8px', borderRadius: '1rem', border: '1px solid #DDD6FE', fontWeight: 700 }}>
                  ADMIN
                </span>
              )}
              {(user.fraudStatus && user.fraudStatus !== 'clean') && (
                <span style={{
                  marginLeft: '0.5rem', fontSize: '0.68rem', fontWeight: 700,
                  color: user.fraudStatus === 'blocked' ? '#DC2626' : user.fraudStatus === 'flagged' ? '#EA580C' : '#D97706',
                  background: user.fraudStatus === 'blocked' ? '#FEF2F2' : user.fraudStatus === 'flagged' ? '#FFF7ED' : '#FFFBEB',
                  padding: '2px 8px', borderRadius: '1rem',
                  border: `1px solid ${user.fraudStatus === 'blocked' ? '#FECACA' : user.fraudStatus === 'flagged' ? '#FFEDD5' : '#FDE68A'}`,
                }}>
                  {user.fraudStatus === 'blocked' ? '🚫 BLOCKED' : user.fraudStatus === 'flagged' ? '⚠️ FLAGGED' : '👀 SUSPICIOUS'}
                </span>
              )}
            </h3>
            <p style={{ color: '#6B7280', fontSize: '0.85rem', margin: '2px 0 0' }}>{user.email}</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: '#F3F4F6', padding: '4px', borderRadius: '0.75rem', border: '1px solid #E5E7EB' }}>
          {[
            { key: 'overview', label: 'Overview', icon: FiUser },
            { key: 'activity', label: 'Activity', icon: FiActivity },
            { key: 'fraud', label: 'Fraud', icon: FiShield },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.85rem', fontWeight: 600,
                cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                background: tab === key ? '#1E2538' : 'none',
                color: tab === key ? '#FFFFFF' : '#6B7280',
              }}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ── */}
        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {[
              { label: 'Wallet Balance', value: <CoinDisplay amount={user.walletBalance || 0} size={15} compact={false} />, color: '#1E2538' },
              { label: 'Total Earned', value: <CoinDisplay amount={user.totalEarned || 0} size={15} compact={false} />, color: '#059669' },
              { label: 'Referral Earnings', value: <CoinDisplay amount={user.commissionGenerated || 0} size={15} compact={false} />, color: '#0284C7' },
              { label: 'Daily Streak', value: `${user.dailyBonusStreak || 0} days`, color: '#D97706' },
              { label: 'Fraud Flag', value: user.fraudFlag || 0, color: user.fraudFlag > 0 ? '#DC2626' : '#6B7280' },
              { label: 'Fraud Status', value: (user.fraudStatus || 'clean').toUpperCase(), color: user.fraudStatus === 'blocked' ? '#DC2626' : user.fraudStatus === 'flagged' ? '#EA580C' : user.fraudStatus === 'suspicious' ? '#D97706' : '#059669' },
              { label: 'Last IP', value: user.lastIp || '—', color: '#374151' },
              { label: 'Last Country', value: user.lastCountry || '—', color: '#374151' },
              { label: 'Referral %', value: user.referralPercentage !== null && user.referralPercentage !== undefined ? `${user.referralPercentage}% (override)` : 'Global default', color: '#374151' },
              { label: 'Referred By', value: user.referredBy ? `Yes (tracked)` : 'Organic', color: '#374151' },
              { label: 'Joined', value: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—', color: '#374151' },
              { label: 'Private Profile', value: user.isPrivate ? 'Yes' : 'No', color: '#374151' },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                style={{
                  background: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: '0.875rem',
                  padding: '0.875rem 1rem',
                }}
              >
                <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>{label}</p>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color, margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif" }}>{value}</div>
              </div>
            ))}

            {/* User ID row — full width */}
            <div style={{ gridColumn: '1 / -1', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '0.875rem', padding: '0.875rem 1rem' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>User ID (MongoDB)</p>
              <p style={{ fontSize: '0.82rem', fontFamily: "'Barlow', system-ui, sans-serif", color: '#374151', margin: 0 }}>{user._id}</p>
            </div>
            <div style={{ gridColumn: '1 / -1', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '0.875rem', padding: '0.875rem 1rem' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Firebase UID</p>
              <p style={{ fontSize: '0.82rem', fontFamily: "'Barlow', system-ui, sans-serif", color: '#374151', margin: 0 }}>{user.firebaseUid}</p>
            </div>

            {/* Referral link */}
            <div style={{ gridColumn: '1 / -1', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '0.875rem', padding: '0.875rem 1rem' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>User's Referral Link</p>
              <p style={{ fontSize: '0.82rem', fontFamily: "'Barlow', system-ui, sans-serif", color: '#047857', margin: 0, wordBreak: 'break-all' }}>
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
                <FiLoader style={{ animation: 'spin 1s linear infinite', fontSize: 24, color: '#1E2538' }} />
              </div>
            ) : transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#9CA3AF' }}>
                <FiActivity size={32} style={{ marginBottom: '0.75rem', opacity: 0.4, margin: '0 auto' }} />
                <p className="text-sm font-medium">No transaction history found.</p>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '0.78rem', color: '#6B7280', marginBottom: '0.75rem', fontWeight: 500 }}>
                  Showing latest {transactions.length} transactions
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {transactions.map(tx => (
                    <div
                      key={tx._id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        background: '#F9FAFB', border: '1px solid #E5E7EB',
                        borderRadius: '0.75rem', padding: '0.65rem 0.95rem',
                      }}
                    >
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: txTypeColor(tx.transactionType), flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.85rem', color: '#0E0F0C', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {tx.description || tx.transactionType}
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: 2 }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: txTypeColor(tx.transactionType), textTransform: 'uppercase' }}>
                            {tx.transactionType?.replace(/_/g, ' ')}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#6B7280' }}>
                            {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                          </span>
                          {tx.status !== 'completed' && (
                            <span style={{ fontSize: '0.68rem', color: tx.status === 'pending' ? '#D97706' : '#DC2626', fontWeight: 700 }}>
                              · {tx.status}
                            </span>
                          )}
                        </div>
                      </div>
                      <span style={{
                        fontSize: '0.9rem', fontWeight: 700, fontFamily: "'Bricolage Grotesque', sans-serif", flexShrink: 0,
                        color: tx.amount < 0 ? '#DC2626' : '#059669',
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

        {/* ── Fraud Tab ── */}
        {tab === 'fraud' && (
          <div>
            {/* Fraud Status Manager */}
            <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '0.875rem', padding: '1rem', marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
                <FiShield size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Fraud Status
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select
                  value={fraudStatusSelect}
                  onChange={(e) => setFraudStatusSelect(e.target.value)}
                  style={{
                    flex: 1, background: '#FFFFFF', border: '1px solid #D1D5DB',
                    borderRadius: '0.5rem', color: '#0E0F0C', padding: '0.55rem 0.75rem',
                    fontSize: '0.875rem', outline: 'none',
                  }}
                >
                  <option value="clean">✅ Clean</option>
                  <option value="suspicious">👀 Suspicious</option>
                  <option value="flagged">⚠️ Flagged</option>
                  <option value="blocked">🚫 Blocked</option>
                </select>
                <button
                  className="action-btn primary"
                  onClick={() => handleFraudStatusChange(fraudStatusSelect)}
                  disabled={savingFraud || fraudStatusSelect === (user.fraudStatus || 'clean')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}
                >
                  {savingFraud ? <FiLoader style={{ animation: 'spin 1s linear infinite' }} /> : <FiCheck size={14} />}
                  Save
                </button>
              </div>
            </div>

            {/* IP History */}
            <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '0.875rem', padding: '1rem', marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
                IP History ({(user.ipHistory || []).length})
              </p>
              {(user.ipHistory && user.ipHistory.length > 0) ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {user.ipHistory.map((ip, i) => (
                    <span key={i} style={{
                      fontSize: '0.75rem', color: ip === user.lastIp ? '#1E2538' : '#6B7280',
                      background: ip === user.lastIp ? '#EFF6FF' : '#FFFFFF',
                      padding: '4px 10px', borderRadius: '0.5rem',
                      border: `1px solid ${ip === user.lastIp ? '#BFDBFE' : '#E5E7EB'}`,
                      fontWeight: ip === user.lastIp ? 700 : 500,
                      fontFamily: "'Barlow', system-ui, sans-serif",
                    }}>
                      {ip} {ip === user.lastIp && '(current)'}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.85rem', color: '#9CA3AF', margin: 0 }}>No IP history recorded yet.</p>
              )}
            </div>

            {/* Linked Accounts */}
            <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '0.875rem', padding: '1rem' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
                <FiAlertTriangle size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Linked Accounts
              </p>
              {loadingLinked ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}>
                  <FiLoader style={{ animation: 'spin 1s linear infinite', fontSize: 20, color: '#1E2538' }} />
                </div>
              ) : linkedAccounts.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: '#059669', margin: 0, fontWeight: 500 }}>✅ No linked accounts detected.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {linkedAccounts.map(acc => (
                    <div key={acc._id} style={{
                      background: '#FFFFFF', border: '1px solid #FED7AA',
                      borderRadius: '0.75rem', padding: '0.75rem',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <div>
                          <span style={{ color: '#0E0F0C', fontWeight: 600, fontSize: '0.875rem' }}>{acc.displayName || '—'}</span>
                          <span style={{ color: '#6B7280', fontSize: '0.75rem', marginLeft: '0.5rem' }}>{acc.email}</span>
                        </div>
                        {acc.fraudStatus && acc.fraudStatus !== 'clean' && (
                          <span style={{
                            fontSize: '0.65rem', fontWeight: 700,
                            color: acc.fraudStatus === 'blocked' ? '#DC2626' : '#EA580C',
                            background: acc.fraudStatus === 'blocked' ? '#FEF2F2' : '#FFF7ED',
                            padding: '2px 7px', borderRadius: '0.5rem',
                          }}>
                            {acc.fraudStatus.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                        {(acc.matchReasons || []).map((reason, i) => (
                          <span key={i} style={{
                            fontSize: '0.68rem', color: '#D97706', background: '#FFFBEB',
                            padding: '2px 7px', borderRadius: '0.4rem', border: '1px solid #FDE68A',
                            fontWeight: 600
                          }}>
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
  const [referredByCode, setReferredByCode] = useState('');

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
        toast.success(
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            Balance adjusted: {sign}<CoinDisplay amount={amount} size={14} compact={false} />
          </span>
        );
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
    const amount = refAmount === '' ? undefined : Number(refAmount);
    if (amount !== undefined && (isNaN(amount) || amount < 0 || amount > 100)) { setRefError('Please enter a valid percentage between 0 and 100.'); return; }
    
    setActionLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const body = {};
      if (refAmount !== '') body.referralPercentage = amount ?? null;
      if (referredByCode.trim()) body.referredByCode = referredByCode.trim();

      const res = await fetch(`${API}/admin/users/${refTarget._id}/referral`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        const msgs = [];
        if (refAmount !== '') msgs.push(amount === undefined ? 'Ref% removed' : `Ref% set to ${amount}%`);
        if (referredByCode.trim()) msgs.push(`Referrer linked via code ${referredByCode.trim().toUpperCase()}`);
        toast.success(msgs.join(' · ') || 'Updated');
        fetchUsers();
        setRefTarget(null);
        setReferredByCode('');
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
      <p className="admin-page-sub">View, search, inspect and moderate platform users.</p>

      {/* Search */}
      <div className="admin-search-bar">
        <div style={{ position: 'relative', flex: 1 }}>
          <FiSearch style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontSize: '15px' }} />
          <input
            type="text"
            className="admin-input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Search by email or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="action-btn primary" onClick={fetchUsers} style={{ height: '42px', padding: '0 1.25rem' }}>
          Search
        </button>
      </div>

      {/* Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ whiteSpace: 'nowrap' }}>User ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Balance</th>
              <th>Status</th>
              <th style={{ textAlign: 'right', paddingRight: '1.25rem', whiteSpace: 'nowrap' }}>Actions</th>
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
                <td style={{ whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', color: '#6B7280', fontFamily: "'Barlow', system-ui, sans-serif" }}>
                      {u._id.substring(0, 10)}...
                    </span>
                    <button
                      onClick={() => copyToClipboard(u._id)}
                      title="Copy ID"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1E2538', padding: 0 }}
                    >
                      <FiCopy size={13} />
                    </button>
                  </div>
                </td>
                <td style={{ color: '#0E0F0C', fontWeight: 600, whiteSpace: 'nowrap' }}>{u.displayName || '—'}</td>
                <td style={{ color: '#4B5563', whiteSpace: 'nowrap' }}>{u.email}</td>
                <td>
                  {u.role === 'admin'
                    ? <span className="super-badge">{u.role}</span>
                    : <span style={{ color: '#6B7280', textTransform: 'capitalize' }}>{u.role}</span>
                  }
                </td>
                <td style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, color: '#1E2538', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
                  {(u.walletBalance || 0).toLocaleString()}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {u.isBanned
                    ? <span style={{ color: '#DC2626', fontSize: '0.75rem', fontWeight: 700 }}>● Banned</span>
                    : <span style={{ color: '#059669', fontSize: '0.75rem', fontWeight: 700 }}>● Active</span>
                  }
                </td>
                <td style={{ textAlign: 'right', paddingRight: '1.25rem', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.35rem', width: '185px', marginLeft: 'auto' }}>
                    {/* View Details */}
                    <button
                      className="action-btn"
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.74rem', fontWeight: 600, color: '#1E2538', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', width: '100%' }}
                      onClick={() => setDetailUser(u)}
                    >
                      <FiEye size={12} /> Details
                    </button>
                    <button
                      className="action-btn"
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.74rem', width: '100%', justifyContent: 'center' }}
                      onClick={() => { setBalanceTarget(u); setBalanceAmount(''); setBalanceReason(''); setBalanceError(''); }}
                    >
                      Adjust Bal
                    </button>
                    <button
                      className="action-btn"
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.74rem', width: '100%', justifyContent: 'center' }}
                      onClick={() => { setRefTarget(u); setRefAmount(u.referralPercentage !== null && u.referralPercentage !== undefined ? String(u.referralPercentage) : ''); setRefError(''); setReferredByCode(''); }}
                    >
                      Ref %
                    </button>
                    <button
                      className={`action-btn ${u.isBanned ? 'success' : 'danger'}`}
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.74rem', width: '100%', justifyContent: 'center' }}
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
              <button onClick={() => setBanTarget(null)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0, fontSize: '18px' }}>
                <FiX />
              </button>
            </div>
            <p style={{ marginBottom: '1rem', color: '#6B7280', fontSize: '0.9rem' }}>
              User: <strong style={{ color: '#0E0F0C' }}>{banTarget.email}</strong>
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.4rem', fontWeight: 600 }}>
              <FiMessageSquare size={13} />
              {banTarget.isBanned ? 'Reason for unbanning' : 'Reason for ban'}
              {!banTarget.isBanned && <span style={{ color: '#DC2626' }}>*</span>}
            </label>
            <textarea
              value={banReason}
              onChange={(e) => { setBanReason(e.target.value); setBanError(''); }}
              placeholder={banTarget.isBanned
                ? 'Reason for reinstating this user (optional)…'
                : 'Why is this user being banned? (required)'}
              style={{ borderColor: banError ? '#DC2626' : undefined }}
            />
            {banError && (
              <p style={{ color: '#DC2626', fontSize: '0.8rem', marginTop: '-0.75rem', marginBottom: '1rem', fontWeight: 500 }}>
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
                {actionLoading && <FiLoader style={{ animation: 'spin 1s linear infinite' }} />}
                {banTarget.isBanned ? 'Confirm Unban' : 'Confirm Ban'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Balance Adjustment Modal ────────────── */}
      {balanceTarget && (
        <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setBalanceTarget(null); }}>
          <div className="admin-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
              <h3>Adjust Balance</h3>
              <button onClick={() => setBalanceTarget(null)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0, fontSize: '18px' }}>
                <FiX />
              </button>
            </div>
            <p style={{ marginBottom: '0.5rem', color: '#6B7280', fontSize: '0.9rem' }}>
              User: <strong style={{ color: '#0E0F0C' }}>{balanceTarget.email}</strong>
            </p>
            <p style={{ marginBottom: '1.25rem', color: '#6B7280', fontSize: '0.85rem' }}>
              Current balance: <strong style={{ color: '#1E2538' }}>{(balanceTarget.walletBalance || 0).toLocaleString()} Coins</strong>
            </p>

            <label style={{ display: 'block', fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.35rem', fontWeight: 600 }}>
              Adjustment Amount (+ to add, - to deduct) <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              type="number"
              className="admin-input"
              value={balanceAmount}
              onChange={(e) => { setBalanceAmount(e.target.value); setBalanceError(''); }}
              placeholder="e.g. 500 or -200"
              style={{ marginBottom: '1rem', width: '100%', borderColor: balanceError ? '#DC2626' : undefined }}
            />

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.35rem', fontWeight: 600 }}>
              <FiMessageSquare size={13} />
              Reason for Adjustment <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <textarea
              value={balanceReason}
              onChange={(e) => { setBalanceReason(e.target.value); setBalanceError(''); }}
              placeholder="e.g. Compensation for failed offerwall survey..."
              style={{ borderColor: balanceError ? '#DC2626' : undefined }}
            />

            {balanceError && (
              <p style={{ color: '#DC2626', fontSize: '0.8rem', marginTop: '-0.75rem', marginBottom: '1rem', fontWeight: 500 }}>
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
                {actionLoading && <FiLoader style={{ animation: 'spin 1s linear infinite' }} />}
                Apply Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Referral Settings Modal ─────────────── */}
      {refTarget && (
        <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setRefTarget(null); }}>
          <div className="admin-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
              <h3>Referral Configuration</h3>
              <button onClick={() => setRefTarget(null)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0, fontSize: '18px' }}>
                <FiX />
              </button>
            </div>
            <p style={{ marginBottom: '1.25rem', color: '#6B7280', fontSize: '0.9rem' }}>
              User: <strong style={{ color: '#0E0F0C' }}>{refTarget.email}</strong>
            </p>

            <label style={{ display: 'block', fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.35rem', fontWeight: 600 }}>
              Custom Referral Rate % (leave empty for global default)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              className="admin-input"
              value={refAmount}
              onChange={(e) => { setRefAmount(e.target.value); setRefError(''); }}
              placeholder="e.g. 15 for 15%"
              style={{ marginBottom: '1rem', width: '100%', borderColor: refError ? '#DC2626' : undefined }}
            />

            <label style={{ display: 'block', fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.35rem', fontWeight: 600 }}>
              Link Referrer (Enter referrer's Referral Code / ID)
            </label>
            <input
              type="text"
              className="admin-input"
              value={referredByCode}
              onChange={(e) => { setReferredByCode(e.target.value); setRefError(''); }}
              placeholder="Referral Code"
              style={{ marginBottom: '1.25rem', width: '100%' }}
            />

            {refError && (
              <p style={{ color: '#DC2626', fontSize: '0.8rem', marginTop: '-0.75rem', marginBottom: '1rem', fontWeight: 500 }}>
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
                {actionLoading && <FiLoader style={{ animation: 'spin 1s linear infinite' }} />}
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
