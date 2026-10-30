import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FiFileText, FiRefreshCw, FiX } from 'react-icons/fi';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const JsonBlock = ({ value }) => (
  <pre className="text-xs text-slate-300 bg-black/30 border border-white/10 rounded-lg p-3 overflow-auto max-h-64">
    {JSON.stringify(value || {}, null, 2)}
  </pre>
);

const AdminPostbackLogs = () => {
  const { currentUser } = useAuth();
  const [rows, setRows] = useState([]);
  const [detail, setDetail] = useState(null);
  const [filters, setFilters] = useState({ providerId: '', processingResult: '', clickId: '', transactionId: '', duplicate: '' });
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
      const res = await fetch(`${API}/admin/postback-logs?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load postback logs');
      setRows(data.logs || []);
      setPagination(data.pagination || pagination);
    } catch (err) {
      setError(err.message || 'Failed to load postback logs');
    } finally {
      setLoading(false);
    }
  }, [currentUser, filters, pagination.limit, pagination.page]);

  useEffect(() => { load(1); }, []);

  const openDetail = async (id) => {
    const token = await currentUser.getIdToken();
    const res = await fetch(`${API}/admin/postback-logs/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setDetail(data.log);
  };

  const set = (key) => (event) => setFilters(prev => ({ ...prev, [key]: event.target.value }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="admin-page-title flex items-center gap-2"><FiFileText /> Postback Logs</h1>
          <p className="admin-page-sub">Sanitized provider postback diagnostics.</p>
        </div>
        <button onClick={() => load(1)} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 flex items-center gap-2">
          <FiRefreshCw className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      <div className="admin-card grid grid-cols-1 md:grid-cols-5 gap-3">
        <input className="admin-input" value={filters.providerId} onChange={set('providerId')} placeholder="Provider" />
        <select className="admin-input" value={filters.processingResult} onChange={set('processingResult')}>
          <option value="">Any result</option>
          {['received', 'accepted', 'rejected', 'duplicate', 'ignored', 'error'].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select className="admin-input" value={filters.duplicate} onChange={set('duplicate')}>
          <option value="">Duplicate?</option>
          <option value="true">Duplicate</option>
          <option value="false">Not duplicate</option>
        </select>
        <input className="admin-input" value={filters.clickId} onChange={set('clickId')} placeholder="Click ID" />
        <input className="admin-input" value={filters.transactionId} onChange={set('transactionId')} placeholder="Mapped txn" />
      </div>

      {error && <div className="admin-card text-rose-400">{error}</div>}
      <div className="admin-card admin-table-container">
        <table className="admin-table">
          <thead>
            <tr><th>Time</th><th>Provider</th><th>Route</th><th>Mapped</th><th>Security</th><th>Result</th><th>User/Conversion</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row._id}>
                <td>{new Date(row.createdAt).toLocaleString()}</td>
                <td>{row.providerId || '-'}</td>
                <td>{row.method} {row.route}<br /><span>{row.sourceIp || '-'}</span></td>
                <td><code>{row.mappedFields?.clickId || '-'}</code><br /><span>{row.mappedFields?.transactionId || '-'}</span></td>
                <td>{row.security?.checked ? (row.security?.passed ? 'passed' : 'failed') : 'not checked'}<br /><span>{row.security?.method || '-'}</span></td>
                <td>{row.processingResult}{row.isDuplicate ? ' duplicate' : ''}<br /><span>{row.rejectionReason || ''}</span></td>
                <td>{row.user?.displayName || row.user?.email || '-'}<br /><span>{row.conversion?._id || '-'}</span></td>
                <td><button className="px-3 py-1 rounded bg-white/5" onClick={() => openDetail(row._id)}>Inspect</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && <p className="text-slate-500 text-center py-8">No postback logs found.</p>}
      </div>

      <div className="flex items-center justify-end gap-3 text-sm text-slate-400">
        <button className="px-3 py-1 rounded bg-white/5" disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1)}>Prev</button>
        <span>Page {pagination.page} of {pagination.totalPages || 1}</span>
        <button className="px-3 py-1 rounded bg-white/5" disabled={pagination.page >= pagination.totalPages} onClick={() => load(pagination.page + 1)}>Next</button>
      </div>

      {detail && (
        <div className="fixed inset-0 bg-black/70 z-50 flex justify-end" onClick={() => setDetail(null)}>
          <div className="w-full max-w-2xl bg-[#0f172a] border-l border-white/10 p-6 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button className="float-right text-slate-400" onClick={() => setDetail(null)}><FiX /></button>
            <h2 className="text-white font-bold text-lg mb-4">Sanitized Postback Detail</h2>
            <p className="text-sm text-slate-400 mb-4">{detail.providerId} · {detail.processingResult}</p>
            <h3 className="text-slate-300 font-semibold mb-2">Mapped Fields</h3>
            <JsonBlock value={detail.mappedFields} />
            <h3 className="text-slate-300 font-semibold mt-4 mb-2">Query</h3>
            <JsonBlock value={detail.sanitizedQuery} />
            <h3 className="text-slate-300 font-semibold mt-4 mb-2">Body</h3>
            <JsonBlock value={detail.sanitizedBody} />
            <h3 className="text-slate-300 font-semibold mt-4 mb-2">Headers</h3>
            <JsonBlock value={detail.sanitizedHeaders} />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPostbackLogs;
