import { useState, useEffect, useCallback } from 'react';
import { FiActivity, FiRefreshCw, FiSearch, FiChevronDown, FiChevronUp, FiMessageSquare } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';

// ── Action metadata: label, colour class, description ────────────────────────
const ACTION_META = {
  BAN_USER:             { label: 'Ban User',            color: 'log-badge--danger',  desc: 'User account banned'                 },
  UNBAN_USER:           { label: 'Unban User',          color: 'log-badge--success', desc: 'User account reinstated'             },
  ADJUST_BALANCE:       { label: 'Adjust Balance',      color: 'log-badge--warning', desc: 'Wallet balance manually adjusted'    },
  APPROVE_WITHDRAWAL:   { label: 'Approve Withdrawal',  color: 'log-badge--success', desc: 'Withdrawal request approved'         },
  REJECT_WITHDRAWAL:    { label: 'Reject Withdrawal',   color: 'log-badge--danger',  desc: 'Withdrawal request rejected'         },
  COMPLETE_WITHDRAWAL:  { label: 'Complete Withdrawal', color: 'log-badge--info',    desc: 'Withdrawal marked as completed'      },
  CREATE_ADMIN:         { label: 'Create Admin',        color: 'log-badge--info',    desc: 'New admin account created/promoted'  },
  REVOKE_ADMIN:         { label: 'Revoke Admin',        color: 'log-badge--danger',  desc: 'Admin privileges revoked'            },
  EDIT_PERMISSIONS:     { label: 'Edit Permissions',    color: 'log-badge--warning', desc: 'Admin permissions edited'            },
  CREATE_CUSTOM_OFFER:  { label: 'Create Custom Offer', color: 'log-badge--info',    desc: 'Created a new custom offer'          },
  UPDATE_CUSTOM_OFFER:  { label: 'Update Custom Offer', color: 'log-badge--warning', desc: 'Updated a custom offer'              },
  DELETE_CUSTOM_OFFER:  { label: 'Delete Custom Offer', color: 'log-badge--danger',  desc: 'Deleted a custom offer'              },
  APPROVE_CUSTOM_OFFER: { label: 'Approve Submission',  color: 'log-badge--success', desc: 'Approved custom offer proof'         },
  REJECT_CUSTOM_OFFER:  { label: 'Reject Submission',   color: 'log-badge--danger',  desc: 'Rejected custom offer proof'         },
};

const ALL_ACTIONS = Object.keys(ACTION_META);

const fmt = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
};

// ── Single expandable row ─────────────────────────────────────────────────────
const LogRow = ({ log }) => {
  const [open, setOpen] = useState(false);
  const meta = ACTION_META[log.action] || { label: log.action, color: 'log-badge--info', desc: '' };
  
  let noteText = '';
  if (typeof log.details === 'string') {
    noteText = log.details;
  } else if (log.details && (log.details.reason || log.details.note)) {
    noteText = log.details.reason || log.details.note;
  }
  const hasNote = !!noteText;

  return (
    <>
      <tr className={`log-row ${open ? 'log-row--open' : ''}`} onClick={() => setOpen(o => !o)} style={{ cursor: 'pointer' }}>
        <td style={{ color: '#64748b', fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.75rem', fontFeatureSettings: "'zero' 0", fontVariantNumeric: 'normal' }}>
          {fmt(log.createdAt)}
        </td>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span className={`log-badge ${meta.color}`}>{meta.label}</span>
            {hasNote && (
              <span title="Has context / note" style={{ display: 'inline-flex', alignItems: 'center', color: '#818cf8', flexShrink: 0 }}>
                <FiMessageSquare size={11} />
              </span>
            )}
          </div>
        </td>
        <td>
          <span style={{ color: '#e2e8f0', fontWeight: 500 }}>
            {log.adminId?.displayName || '—'}
          </span>
          <span style={{ color: '#475569', fontSize: '0.75rem', display: 'block' }}>
            {log.adminId?.email || ''}
          </span>
        </td>
        <td>
          {log.targetUserId ? (
            <>
              <span style={{ color: '#c8d6ef' }}>{log.targetUserId.displayName || '—'}</span>
              <span style={{ color: '#475569', fontSize: '0.75rem', display: 'block' }}>
                {log.targetUserId.email || ''}
              </span>
            </>
          ) : <span style={{ color: '#475569' }}>—</span>}
        </td>
        <td style={{ textAlign: 'right', paddingRight: '1rem', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {hasNote ? (
            <span style={{ marginRight: '0.8rem', fontStyle: 'italic', fontSize: '0.8rem', color: '#cbd5e1' }} title={noteText}>
              {noteText}
            </span>
          ) : (
            <span style={{ marginRight: '0.8rem', fontSize: '0.8rem', color: '#475569' }}>—</span>
          )}
          {open ? <FiChevronUp style={{ color: '#475569', display: 'inline-block', verticalAlign: 'middle' }} /> : <FiChevronDown style={{ color: '#475569', display: 'inline-block', verticalAlign: 'middle' }} />}
        </td>
      </tr>
      {open && (
        <tr className="log-detail-row">
          <td colSpan={5}>
            <div className="log-detail-box">
              <p className="log-detail-desc">{meta.desc}</p>
              {hasNote && (
                <div style={{ marginBottom: '1rem', padding: '0.6rem 0.8rem', background: 'rgba(30,41,59,0.5)', borderRadius: '6px', borderLeft: '3px solid #818cf8', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
                    <FiMessageSquare size={10} /> Context / Reason
                  </span>
                  <p style={{ margin: 0, color: '#e2e8f0', fontSize: '0.85rem', lineHeight: '1.4' }}>
                    {noteText}
                  </p>
                </div>
              )}
              <pre className="log-detail-json">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const AdminLogs = () => {
  const { currentUser } = useAuth();
  const [logs, setLogs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]       = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');

  const fetchLogs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setLogs(data.logs);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Apply client-side search + action filter
  const visible = logs.filter(l => {
    let noteText = '';
    if (typeof l.details === 'string') {
      noteText = l.details;
    } else if (l.details && (l.details.reason || l.details.note)) {
      noteText = l.details.reason || l.details.note;
    }
    const hasNote = !!noteText;

    if (activeFilter === 'HAS_NOTE') return hasNote;
    const matchAction = activeFilter === 'ALL' || l.action === activeFilter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || l.adminId?.email?.toLowerCase().includes(q)
      || l.adminId?.displayName?.toLowerCase().includes(q)
      || l.targetUserId?.email?.toLowerCase().includes(q)
      || l.targetUserId?.displayName?.toLowerCase().includes(q)
      || l.action?.toLowerCase().includes(q)
      || noteText.toLowerCase().includes(q);
    return matchAction && matchSearch;
  });

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FiActivity style={{ color: '#818cf8', fontSize: '1.25rem' }} />
            Audit Log
          </h1>
          <p className="admin-page-sub">Every important admin action is recorded here.</p>
        </div>
        <button
          className="action-btn primary"
          onClick={() => fetchLogs(true)}
          disabled={refreshing}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', alignSelf: 'flex-start' }}
        >
          <FiRefreshCw style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Controls */}
      <div className="admin-card" style={{ padding: '1.25rem' }}>
        {/* Search */}
        <div className="admin-search-bar" style={{ marginBottom: '0.85rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <FiSearch style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
            <input
              className="admin-input"
              style={{ paddingLeft: '2.4rem' }}
              placeholder="Search by admin or target user…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Action filters */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className={`filter-pill ${activeFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveFilter('ALL')}
          >
            All
          </button>
          <button
            className={`filter-pill ${activeFilter === 'HAS_NOTE' ? 'active' : ''}`}
            onClick={() => setActiveFilter('HAS_NOTE')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <FiMessageSquare size={11} /> Has Notes
          </button>
          {ALL_ACTIONS.map(action => (
            <button
              key={action}
              className={`filter-pill ${activeFilter === action ? 'active' : ''}`}
              onClick={() => setActiveFilter(action)}
            >
              {ACTION_META[action].label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Admin</th>
                <th>Target User</th>
                <th style={{ textAlign: 'right', paddingRight: '1rem' }}>
                  Notes / Details
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="loading-row">
                  <td colSpan={5}>Loading audit logs…</td>
                </tr>
              ) : visible.length === 0 ? (
                <tr className="loading-row">
                  <td colSpan={5}>No log entries found.</td>
                </tr>
              ) : (
                visible.map(log => <LogRow key={log._id} log={log} />)
              )}
            </tbody>
          </table>
        </div>

        {!loading && visible.length > 0 && (
          <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: '0.75rem', color: '#475569' }}>
            Showing {visible.length} of {logs.length} entries
          </div>
        )}
      </div>

      {/* Inline styles for badges + detail box */}
      <style>{`
        .log-badge {
          display: inline-block;
          padding: 2px 9px;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          white-space: nowrap;
        }
        .log-badge--danger  { background: rgba(239,68,68,0.12);  color: #f87171; border: 1px solid rgba(239,68,68,0.2);  }
        .log-badge--success { background: rgba(16,185,129,0.12); color: #34d399; border: 1px solid rgba(16,185,129,0.2); }
        .log-badge--warning { background: rgba(234,179,8,0.12);  color: #fbbf24; border: 1px solid rgba(234,179,8,0.2);  }
        .log-badge--info    { background: rgba(99,102,241,0.12); color: #818cf8; border: 1px solid rgba(99,102,241,0.2); }

        .log-row--open td { background: rgba(99,102,241,0.04); }
        .log-row:hover td { background: rgba(255,255,255,0.02); }

        .log-detail-row td { padding: 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .log-detail-box {
          padding: 1rem 1.25rem;
          background: rgba(0,0,0,0.2);
          border-top: 1px solid rgba(99,102,241,0.1);
        }
        .log-detail-desc {
          font-size: 0.8rem;
          color: #64748b;
          margin-bottom: 0.75rem;
        }
        .log-detail-json {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 8px;
          padding: 0.75rem 1rem;
          font-family: 'Inter', system-ui, sans-serif;
          font-feature-settings: 'zero' 0;
          font-variant-numeric: normal;
          font-size: 0.78rem;
          color: #94a3b8;
          overflow-x: auto;
          margin: 0;
          white-space: pre;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default AdminLogs;
