import { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';

const STATUS_FILTERS = ['All', 'Pending', 'Completed', 'Rejected'];

const METHOD_LABELS = {
  crypto:    { label: '₿ Crypto',     color: '#f59e0b' },
  paypal:    { label: '💳 PayPal',    color: '#3b82f6' },
  giftcard:  { label: '🎁 Gift Card', color: '#8b5cf6' },
};

const AdminWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [filter,      setFilter]      = useState('All');
  const [search,      setSearch]      = useState('');

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState(null); // withdrawal to reject
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError,  setRejectError]  = useState('');

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setWithdrawals([
        { _id: 'wd_001', userName: 'john_doe',   amount: 50,  status: 'pending',   method: 'paypal',   date: new Date().toISOString() },
        { _id: 'wd_002', userName: 'jane_smith',  amount: 100, status: 'completed', method: 'crypto',   date: new Date(Date.now() - 86400000).toISOString() },
        { _id: 'wd_003', userName: 'mike_r',      amount: 25,  status: 'pending',   method: 'giftcard', date: new Date(Date.now() - 3600000).toISOString() },
        { _id: 'wd_004', userName: 'alice_w',     amount: 200, status: 'rejected',  method: 'crypto',   date: new Date(Date.now() - 172800000).toISOString() },
      ]);
      setLoading(false);
    }, 800);
  }, []);

  const handleApprove = (id) => {
    if (!window.confirm('Approve this withdrawal?')) return;
    setWithdrawals(prev =>
      prev.map(w => w._id === id ? { ...w, status: 'completed' } : w)
    );
  };

  const openRejectModal = (withdrawal) => {
    setRejectTarget(withdrawal);
    setRejectReason('');
    setRejectError('');
  };

  const handleRejectSubmit = () => {
    if (!rejectReason.trim()) { setRejectError('A reason is required.'); return; }
    setWithdrawals(prev =>
      prev.map(w => w._id === rejectTarget._id ? { ...w, status: 'rejected' } : w)
    );
    setRejectTarget(null);
  };

  const filtered = withdrawals.filter(w => {
    const matchesFilter = filter === 'All' || w.status === filter.toLowerCase();
    const matchesSearch = !search || w.userName.toLowerCase().includes(search.toLowerCase()) || w._id.includes(search);
    return matchesFilter && matchesSearch;
  });

  const statusBadge = (status) => {
    if (status === 'completed') return <span style={{ color: '#34d399', fontSize: '0.75rem', fontWeight: 600 }}>● Completed</span>;
    if (status === 'rejected')  return <span style={{ color: '#f87171', fontSize: '0.75rem', fontWeight: 600 }}>● Rejected</span>;
    return <span style={{ color: '#fbbf24', fontSize: '0.75rem', fontWeight: 600 }}>● Pending</span>;
  };

  return (
    <div>
      <h1 className="admin-page-title">Withdrawal Requests</h1>
      <p className="admin-page-sub">Review and action pending withdrawal requests.</p>

      {/* Search + Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'center' }}>
        <input
          type="text"
          className="admin-input"
          style={{ maxWidth: '280px' }}
          placeholder="Search by user or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map(f => (
            <button
              key={f}
              className={`filter-pill ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="admin-card">
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>User</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="loading-row"><td colSpan="7">Loading withdrawals...</td></tr>
              ) : filtered.length === 0 ? (
                <tr className="loading-row"><td colSpan="7">No results found.</td></tr>
              ) : filtered.map(w => (
                <tr key={w._id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#64748b' }}>
                    {w._id}
                  </td>
                  <td style={{ color: '#cbd5e1', fontWeight: 500 }}>{w.userName}</td>
                  <td style={{ fontFamily: 'monospace', color: '#818cf8', fontWeight: 600 }}>
                    ${w.amount}
                  </td>
                  <td>
                    {METHOD_LABELS[w.method] ? (
                      <span style={{
                        color: METHOD_LABELS[w.method].color,
                        fontSize: '0.78rem',
                        fontWeight: 500,
                      }}>
                        {METHOD_LABELS[w.method].label}
                      </span>
                    ) : w.method}
                  </td>
                  <td>{statusBadge(w.status)}</td>
                  <td style={{ fontSize: '0.78rem', color: '#475569' }}>
                    {new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td>
                    {w.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="action-btn success" onClick={() => handleApprove(w._id)}>
                          Approve
                        </button>
                        <button className="action-btn danger" onClick={() => openRejectModal(w)}>
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Reject Modal ─────────────────────── */}
      {rejectTarget && (
        <div
          className="admin-modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setRejectTarget(null); }}
        >
          <div className="admin-modal">
            {/* Close */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
              <h3>Reject Withdrawal</h3>
              <button
                onClick={() => setRejectTarget(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, fontSize: '18px' }}
              >
                <FiX />
              </button>
            </div>
            <p>
              Rejecting <strong style={{ color: '#cbd5e1' }}>{rejectTarget.userName}</strong>'s request
              for <strong style={{ color: '#818cf8' }}>${rejectTarget.amount}</strong>.
              Please provide a reason.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (required)..."
            />
            {rejectError && (
              <p style={{ color: '#f87171', fontSize: '0.8rem', marginTop: '-0.75rem', marginBottom: '1rem' }}>
                {rejectError}
              </p>
            )}
            <div className="admin-modal-actions">
              <button
                className="action-btn"
                onClick={() => setRejectTarget(null)}
              >
                Cancel
              </button>
              <button
                className="action-btn danger"
                onClick={handleRejectSubmit}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWithdrawals;
