import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import { FiX, FiRefreshCw, FiLoader, FiInbox, FiCheck, FiXCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import CoinDisplay from '../../components/CoinDisplay';

const STATUS_FILTERS = ['all', 'pending', 'completed', 'rejected'];

const METHOD_LABELS = {
  litecoin: { label: 'Ł Litecoin',   color: '#f59e0b' },
  paypal:   { label: '💳 PayPal',    color: '#3b82f6' },
  giftcard: { label: '🎁 Gift Card', color: '#8b5cf6' },
};

const statusBadgeClass = (status) => {
  if (status === 'completed') return { dot: '#34d399', text: '#34d399', label: 'Completed' };
  if (status === 'rejected')  return { dot: '#f87171', text: '#f87171', label: 'Rejected' };
  return { dot: '#fbbf24', text: '#fbbf24', label: 'Pending', pulse: true };
};

const AdminWithdrawals = () => {
  const { currentUser } = useAuth();
  const [withdrawals,   setWithdrawals]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [filter,        setFilter]        = useState('pending');
  const [pagination,    setPagination]    = useState({ page: 1, totalPages: 1 });
  const [approveTarget, setApproveTarget] = useState(null);
  const [approveNote,   setApproveNote]   = useState('');
  const [rejectTarget,  setRejectTarget]  = useState(null);
  const [rejectReason,  setRejectReason]  = useState('');
  const [rejectError,   setRejectError]   = useState('');
  const [actionLoading, setActionLoading] = useState('');

  const fetchWithdrawals = useCallback(async (page = 1, status = 'pending') => {
    try {
      setLoading(true);
      const token = await currentUser.getIdToken();
      const params = new URLSearchParams({ page, limit: 20, status });
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/withdrawals?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setWithdrawals(data.withdrawals);
      setPagination(data.pagination);
    } catch (err) {
      toast.error(err.message || 'Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchWithdrawals(1, filter);
  }, [filter, fetchWithdrawals]);

  const handleApproveSubmit = async () => {
    setActionLoading(approveTarget._id);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/withdrawals/${approveTarget._id}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: approveNote }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success('Withdrawal approved successfully');
      setApproveTarget(null);
      fetchWithdrawals(pagination.page, filter);
    } catch (err) {
      toast.error(err.message || 'Failed to approve withdrawal');
    } finally {
      setActionLoading('');
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) { setRejectError('A reason is required.'); return; }
    setActionLoading(rejectTarget._id);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/withdrawals/${rejectTarget._id}/reject`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success(`Withdrawal rejected — ${data.refundAmount?.toLocaleString() || '?'} Coins refunded to user`);
      setRejectTarget(null);
      fetchWithdrawals(pagination.page, filter);
    } catch (err) {
      setRejectError(err.message || 'Failed to reject withdrawal');
    } finally {
      setActionLoading('');
    }
  };

  return (
    <div>
      <h1 className="admin-page-title">Withdrawal Requests</h1>
      <p className="admin-page-sub">Review, approve, and reject payout requests from users.</p>

      {/* Filter + Refresh bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              className={`filter-pill ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
              style={{ textTransform: 'capitalize' }}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button
          className="action-btn"
          onClick={() => fetchWithdrawals(pagination.page, filter)}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}
        >
          <FiRefreshCw className={loading ? 'spin' : ''} />
          Refresh
        </button>
        <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: 'auto' }}>
          {pagination.total !== undefined && `${pagination.total} total`}
        </span>
      </div>

      {/* Table */}
      <div className="admin-card">
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Amount</th>
                <th>Fee</th>
                <th>Method</th>
                <th>Destination</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="loading-row">
                  <td colSpan="8">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <FiLoader style={{ animation: 'spin 1s linear infinite' }} />
                      Loading withdrawals...
                    </div>
                  </td>
                </tr>
              ) : withdrawals.length === 0 ? (
                <tr className="loading-row">
                  <td colSpan="8">
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '2rem 0' }}>
                      <FiInbox style={{ fontSize: '1.5rem', color: '#475569' }} />
                      <span>No {filter !== 'all' ? filter : ''} withdrawals found.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                withdrawals.map((w) => {
                  const user   = w.userId;
                  const badge  = statusBadgeClass(w.status);
                  const baseMethod = METHOD_LABELS[w.method] || { label: w.method || '—', color: '#94a3b8' };
                  const methodLabel = w.method === 'giftcard' && w.metadata?.brand 
                    ? `🎁 Gift Card (${w.metadata.brand})` 
                    : baseMethod.label;
                  const isActing = actionLoading === w._id;

                  return (
                    <motion.tr
                      key={w._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.82rem' }}>
                            {user?.displayName || 'Unknown'}
                          </span>
                          <span style={{ color: '#475569', fontSize: '0.72rem' }}>{user?.email}</span>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', color: '#818cf8', fontWeight: 600, fontSize: '0.82rem' }}>
                        <CoinDisplay amount={Math.abs(w.amount)} size={12} compact={false} />
                      </td>
                      <td style={{ fontFamily: 'monospace', color: '#fb923c', fontSize: '0.8rem' }}>
                        {w.fee ? <CoinDisplay amount={w.fee} size={11} compact={false} /> : '—'}
                      </td>
                      <td>
                        <span style={{ color: baseMethod.color, fontSize: '0.78rem', fontWeight: 500 }}>
                          {methodLabel}
                        </span>
                      </td>
                      <td style={{ maxWidth: '160px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title={w.payoutDestination}>
                          {w.payoutDestination || '—'}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: badge.text, fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: badge.dot, display: 'inline-block', animation: badge.pulse ? 'pulse 2s infinite' : 'none' }} />
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: '#475569' }}>
                        {new Date(w.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td>
                        {w.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              className="action-btn success"
                              onClick={() => { setApproveTarget(w); setApproveNote(''); }}
                              disabled={!!actionLoading}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            >
                              {isActing ? <FiLoader style={{ animation: 'spin 1s linear infinite' }} /> : <FiCheck />}
                              Approve
                            </button>
                            <button
                              className="action-btn danger"
                              onClick={() => { setRejectTarget(w); setRejectReason(''); setRejectError(''); }}
                              disabled={!!actionLoading}
                            >
                              <FiXCircle /> Reject
                            </button>
                          </div>
                        )}
                        {w.status !== 'pending' && (
                          <span style={{ fontSize: '0.72rem', color: '#475569', fontStyle: 'italic' }}>
                            {w.status === 'completed' ? `by ${w.metadata?.approvedBy || 'admin'}` : `rejected`}
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={`filter-pill ${pagination.page === p ? 'active' : ''}`}
                onClick={() => fetchWithdrawals(p, filter)}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Approve Modal ─────────────────────── */}
      {approveTarget && (
        <div
          className="admin-modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setApproveTarget(null); }}
        >
          <div className="admin-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
              <h3>Approve Withdrawal</h3>
              <button
                onClick={() => setApproveTarget(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, fontSize: '18px' }}
              >
                <FiX />
              </button>
            </div>
            <p style={{ marginBottom: '1rem' }}>
              Confirm processing payout to <strong style={{ color: '#cbd5e1' }}>{approveTarget.userId?.displayName || approveTarget.userId?.email}</strong>.
              <br />
              <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>
                Please ensure you have successfully sent the funds to {approveTarget.method} destination: <strong style={{color: '#fff'}}>{approveTarget.payoutDestination}</strong>.
              </span>
            </p>
            <textarea
              value={approveNote}
              onChange={(e) => setApproveNote(e.target.value)}
              placeholder="Optional Note / Transaction Reference (e.g. TxHash, PayPal ID)..."
            />
            <div className="admin-modal-actions">
              <button className="action-btn" onClick={() => setApproveTarget(null)}>Cancel</button>
              <button
                className="action-btn success"
                onClick={handleApproveSubmit}
                disabled={!!actionLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {actionLoading ? <FiLoader style={{ animation: 'spin 1s linear infinite' }} /> : <FiCheck />}
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ─────────────────────── */}
      {rejectTarget && (
        <div
          className="admin-modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setRejectTarget(null); }}
        >
          <div className="admin-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
              <h3>Reject Withdrawal</h3>
              <button
                onClick={() => setRejectTarget(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, fontSize: '18px' }}
              >
                <FiX />
              </button>
            </div>
            <p style={{ marginBottom: '1rem' }}>
              Rejecting <strong style={{ color: '#cbd5e1' }}>{rejectTarget.userId?.displayName || rejectTarget.userId?.email}</strong>'s request
              for <strong style={{ color: '#818cf8', fontFamily: 'monospace', display: 'inline-flex', alignItems: 'center' }}><CoinDisplay amount={Math.abs(rejectTarget.amount)} size={12} compact={false} /></strong>.
              <br />
              <span style={{ color: '#94a3b8', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                The full amount <strong style={{ color: '#34d399', display: 'inline-flex', alignItems: 'center' }}><CoinDisplay amount={Math.abs(rejectTarget.amount) + (rejectTarget.fee || 0)} size={12} compact={false} /></strong> (including fee) will be refunded.
              </span>
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
              <button className="action-btn" onClick={() => setRejectTarget(null)}>Cancel</button>
              <button
                className="action-btn danger"
                onClick={handleRejectSubmit}
                disabled={!!actionLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {actionLoading ? <FiLoader style={{ animation: 'spin 1s linear infinite' }} /> : <FiXCircle />}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
};

export default AdminWithdrawals;
