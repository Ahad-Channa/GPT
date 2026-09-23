import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import { FiX, FiRefreshCw, FiLoader, FiInbox, FiCheck, FiXCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import CoinDisplay from '../../components/CoinDisplay';

const STATUS_FILTERS = ['all', 'pending', 'completed', 'rejected'];

const METHOD_LABELS = {
  litecoin: { label: 'Ł Litecoin',   color: '#D97706' },
  paypal:   { label: '💳 PayPal',    color: '#2563EB' },
  giftcard: { label: '🎁 Gift Card', color: '#7C3AED' },
};

const statusBadgeClass = (status) => {
  if (status === 'completed') return { dot: '#059669', text: '#059669', label: 'Completed' };
  if (status === 'rejected')  return { dot: '#DC2626', text: '#DC2626', label: 'Rejected' };
  return { dot: '#D97706', text: '#D97706', label: 'Pending', pulse: true };
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
      <p className="admin-page-sub">Review, approve, and process payout requests from users.</p>

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
        <span style={{ fontSize: '0.78rem', color: '#6B7280', marginLeft: 'auto', fontWeight: 500 }}>
          {pagination.total !== undefined && `${pagination.total} total requests`}
        </span>
      </div>

      {/* Table */}
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
                    <FiInbox style={{ fontSize: '1.75rem', color: '#9CA3AF' }} />
                    <span style={{ color: '#6B7280' }}>No {filter !== 'all' ? filter : ''} withdrawals found.</span>
                  </div>
                </td>
              </tr>
            ) : (
              withdrawals.map((w) => {
                const user   = w.userId;
                const badge  = statusBadgeClass(w.status);
                const baseMethod = METHOD_LABELS[w.method] || { label: w.method || '—', color: '#6B7280' };
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
                        <span style={{ color: '#0E0F0C', fontWeight: 600, fontSize: '0.85rem' }}>
                          {user?.displayName || 'Unknown'}
                        </span>
                        <span style={{ color: '#6B7280', fontSize: '0.75rem' }}>{user?.email}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily: "'Bricolage Grotesque', sans-serif", color: '#1E2538', fontWeight: 700, fontSize: '0.9rem' }}>
                      <CoinDisplay amount={Math.abs(w.amount)} size={14} compact={false} />
                    </td>
                    <td style={{ fontFamily: "'Barlow', system-ui, sans-serif", color: '#EA580C', fontSize: '0.85rem', fontWeight: 600 }}>
                      {w.fee ? <CoinDisplay amount={w.fee} size={12} compact={false} /> : '—'}
                    </td>
                    <td>
                      <span style={{ color: baseMethod.color, fontSize: '0.82rem', fontWeight: 600 }}>
                        {methodLabel}
                      </span>
                    </td>
                    <td style={{ maxWidth: '160px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#4B5563', fontFamily: "'Barlow', system-ui, sans-serif", display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={w.payoutDestination}>
                        {w.payoutDestination || '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: badge.text, fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: badge.dot, display: 'inline-block' }} />
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                      {new Date(w.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {w.status === 'pending' && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'nowrap' }}>
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
                        <span style={{ fontSize: '0.75rem', color: '#6B7280', fontStyle: 'italic' }}>
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

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '1rem', borderTop: '1px solid #E5E7EB' }}>
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
                style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0, fontSize: '18px' }}
              >
                <FiX />
              </button>
            </div>
            <p style={{ marginBottom: '1rem', color: '#6B7280', fontSize: '0.9rem' }}>
              Confirm processing payout to <strong style={{ color: '#0E0F0C' }}>{approveTarget.userId?.displayName || approveTarget.userId?.email}</strong>.
              <br />
              <span style={{ color: '#6B7280', fontSize: '0.85rem' }}>
                Please ensure you have sent the funds to {approveTarget.method} destination: <strong style={{ color: '#0E0F0C' }}>{approveTarget.payoutDestination}</strong>.
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
                style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0, fontSize: '18px' }}
              >
                <FiX />
              </button>
            </div>
            <p style={{ marginBottom: '1rem', color: '#6B7280', fontSize: '0.9rem' }}>
              Rejecting <strong style={{ color: '#0E0F0C' }}>{rejectTarget.userId?.displayName || rejectTarget.userId?.email}</strong>'s request
              for <strong style={{ color: '#1E2538', display: 'inline-flex', alignItems: 'center' }}><CoinDisplay amount={Math.abs(rejectTarget.amount)} size={14} compact={false} /></strong>.
              <br />
              <span style={{ color: '#6B7280', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.3rem' }}>
                The full amount <strong style={{ color: '#059669', display: 'inline-flex', alignItems: 'center' }}><CoinDisplay amount={Math.abs(rejectTarget.amount) + (rejectTarget.fee || 0)} size={14} compact={false} /></strong> (including fee) will be refunded.
              </span>
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (required)..."
            />
            {rejectError && (
              <p style={{ color: '#DC2626', fontSize: '0.8rem', marginTop: '-0.75rem', marginBottom: '1rem', fontWeight: 500 }}>
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
    </div>
  );
};

export default AdminWithdrawals;
