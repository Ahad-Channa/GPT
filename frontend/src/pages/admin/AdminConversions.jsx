import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FiActivity, FiRefreshCw } from 'react-icons/fi';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AdminConversions = () => {
  const { currentUser } = useAuth();
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ providerId: '', internalStatus: '', processingState: '', clickId: '', transactionId: '' });
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (page = pagination.page) => {
    if (!currentUser) return;
    setLoading(true);
    setError('');
    try {
      const token = await currentUser.getIdToken();
      const params = new URLSearchParams({ page: String(page), limit: String(pagination.limit) });
      Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
      const res = await fetch(`${API}/admin/conversions?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load conversions');
      setRows(data.conversions || []);
      setPagination(data.pagination || pagination);
    } catch (err) {
      setError(err.message || 'Failed to load conversions');
    } finally {
      setLoading(false);
    }
  }, [currentUser, filters, pagination.limit, pagination.page]);

  useEffect(() => { load(1); }, []);

  const set = (key) => (event) => setFilters(prev => ({ ...prev, [key]: event.target.value }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="admin-page-title flex items-center gap-2"><FiActivity /> Conversions</h1>
          <p className="admin-page-sub">Tracked conversion lifecycle and reward/reversal references.</p>
        </div>
        <button onClick={() => load(1)} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 flex items-center gap-2">
          <FiRefreshCw className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      <div className="admin-card grid grid-cols-1 md:grid-cols-5 gap-3">
        <input className="admin-input" value={filters.providerId} onChange={set('providerId')} placeholder="Provider" />
        <select className="admin-input" value={filters.internalStatus} onChange={set('internalStatus')}>
          <option value="">Any status</option>
          {['pending', 'approved', 'rejected', 'reversed'].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select className="admin-input" value={filters.processingState} onChange={set('processingState')}>
          <option value="">Any processing</option>
          {['pending', 'claimed', 'processing', 'processed', 'failed', 'reversal_processing', 'reversed', 'reversal_failed'].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <input className="admin-input" value={filters.clickId} onChange={set('clickId')} placeholder="Click ID" />
        <input className="admin-input" value={filters.transactionId} onChange={set('transactionId')} placeholder="Provider txn" />
      </div>

      {error && <div className="admin-card text-rose-400">{error}</div>}
      <div className="admin-card admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Time</th><th>Provider</th><th>User</th><th>Campaign</th><th>Click / Txn</th><th>Status</th><th>Reward</th><th>Ledger</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row._id}>
                <td>{new Date(row.createdAt).toLocaleString()}</td>
                <td>{row.providerId}<br /><span>{row.eventType || 'event'}</span></td>
                <td>{row.user?.displayName || row.user?.email || 'Unknown'}</td>
                <td>{row.offer?.title || row.campaignType}<br /><span>{row.campaignId || ''}</span></td>
                <td><code>{row.clickId || '-'}</code><br /><span>{row.providerTransactionId || '-'}</span></td>
                <td>{row.incomingStatus || '-'}<br /><strong>{row.internalStatus}</strong> / {row.processingState}</td>
                <td>{row.rewardAmount || 0}<br /><span>{row.payout?.amount || 0} {row.payout?.currency || 'USD'}</span></td>
                <td>
                  <span>Reward: {row.rewardTransaction?._id || '-'}</span><br />
                  <span>Reversal: {row.reversalTransaction?._id || '-'}</span>
                  {(row.rejectionReason || row.errorReason) && <p className="text-rose-400 text-xs mt-1">{row.rejectionReason || row.errorReason}</p>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && <p className="text-slate-500 text-center py-8">No conversions found.</p>}
      </div>

      <div className="flex items-center justify-end gap-3 text-sm text-slate-400">
        <button className="px-3 py-1 rounded bg-white/5" disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1)}>Prev</button>
        <span>Page {pagination.page} of {pagination.totalPages || 1}</span>
        <button className="px-3 py-1 rounded bg-white/5" disabled={pagination.page >= pagination.totalPages} onClick={() => load(pagination.page + 1)}>Next</button>
      </div>
    </div>
  );
};

export default AdminConversions;
