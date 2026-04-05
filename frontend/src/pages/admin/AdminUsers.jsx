import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FiCopy, FiSearch, FiX, FiCheck, FiLoader, FiMessageSquare } from 'react-icons/fi';
import toast from 'react-hot-toast';

const AdminUsers = () => {
  const { currentUser } = useAuth();
  const [users,   setUsers]   = useState([]);
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals state
  const [banTarget,     setBanTarget]     = useState(null);
  const [banReason,     setBanReason]     = useState('');
  const [banError,      setBanError]      = useState('');
  const [balanceTarget, setBalanceTarget] = useState(null);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceReason, setBalanceReason] = useState('');
  const [balanceError,  setBalanceError]  = useState('');

  useEffect(() => { fetchUsers(); }, [search]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res   = await fetch(`http://localhost:5000/api/admin/users?search=${search}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleBanSubmit = async () => {
    // Reason is required when banning (not when unbanning)
    if (!banTarget.isBanned && !banReason.trim()) {
      setBanError('A reason is required when banning a user.');
      return;
    }
    setActionLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`http://localhost:5000/api/admin/users/${banTarget._id}/ban`, {
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
      const res = await fetch(`http://localhost:5000/api/admin/users/${balanceTarget._id}/balance`, {
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

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
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
                  <td style={{ fontFamily: 'monospace', color: '#818cf8' }}>{u.walletBalance}</td>
                  <td>
                    {u.isBanned
                      ? <span style={{ color: '#f87171', fontSize: '0.75rem', fontWeight: 600 }}>● Banned</span>
                      : <span style={{ color: '#34d399', fontSize: '0.75rem', fontWeight: 600 }}>● Active</span>
                    }
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button className="action-btn" onClick={() => { setBalanceTarget(u); setBalanceAmount(''); setBalanceReason(''); setBalanceError(''); }}>Adjust Bal</button>
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
                ({balanceTarget.walletBalance.toLocaleString()} Coins)
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
    </div>
  );
};

export default AdminUsers;
