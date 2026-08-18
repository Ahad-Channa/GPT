import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiLink, FiPlus, FiTrash2, FiToggleLeft, FiToggleRight,
  FiExternalLink, FiCheckCircle, FiXCircle, FiClock,
  FiLoader, FiRefreshCw, FiEye, FiCopy, FiActivity,
  FiChevronDown, FiChevronUp, FiSettings
} from 'react-icons/fi';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const CLICK_STATUS_COLORS = {
  clicked:  { text: 'text-slate-300',   bg: 'bg-slate-500/10',   border: 'border-slate-500/20'  },
  pending:  { text: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20'  },
  approved: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  rejected: { text: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20'   },
};

const Badge = ({ status }) => {
  const c = CLICK_STATUS_COLORS[status] || CLICK_STATUS_COLORS.clicked;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${c.text} ${c.bg} border ${c.border}`}>
      {status}
    </span>
  );
};

const PRESET_ICONS = [
  '🎮', '🏆', '💰', '🎯', '🎁', '💎', '🔥', '⚡',
  '🚀', '📱', '🛒', '🎵', '💪', '🌟', '🎲', '📺',
  '🏨', '✈️', '🛍️', '🎰', '🏦', '🎬',
];

// ─── Create / Edit Offer Modal ────────────────────────────────────────────────
const OfferFormModal = ({ offer, onClose, onSaved, token }) => {
  const isEdit = Boolean(offer);
  const [form, setForm] = useState({
    title: offer?.title || '',
    description: offer?.description || '',
    rewardAmount: offer?.rewardAmount || '',
    advertiserPayoutAmount: offer?.advertiserPayoutAmount || '',
    advertiserUrl: offer?.advertiserUrl || '',
    expirationDate: offer?.expirationDate ? offer.expirationDate.slice(0, 10) : '',
    icon: offer?.icon || '',
    coverImage: offer?.coverImage || '',
    requirements: (offer?.requirements || []).join('\n'),
    allowedCountries: (offer?.allowedCountries || []).join(', '),
    displayPlacements: {
      featured: offer?.displayPlacements?.featured !== undefined ? offer.displayPlacements.featured : true,
      brandedOfferwall: offer?.displayPlacements?.brandedOfferwall || false,
    },
    platforms: offer?.platforms || { desktop: true, android: true, ios: true },
    isActive: offer?.isActive !== undefined ? offer.isActive : true,
    postbackMapping: {
      clickIdParam:       offer?.postbackMapping?.clickIdParam       || 'click_id',
      transactionIdParam: offer?.postbackMapping?.transactionIdParam || 'txn_id',
      payoutParam:        offer?.postbackMapping?.payoutParam        || 'payout',
      statusParam:        offer?.postbackMapping?.statusParam        || 'status',
      approvedValue:      offer?.postbackMapping?.approvedValue      || 'approved',
      rejectedValue:      offer?.postbackMapping?.rejectedValue      || 'rejected',
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMapping, setShowMapping] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setMapping = (k) => (e) => setForm((f) => ({ ...f, postbackMapping: { ...f.postbackMapping, [k]: e.target.value } }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const url = isEdit ? `${API}/admin/direct-offers/${offer._id}` : `${API}/admin/direct-offers`;
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          rewardAmount: Number(form.rewardAmount),
          advertiserPayoutAmount: Number(form.advertiserPayoutAmount) || 0,
          expirationDate: form.expirationDate || null,
          requirements: form.requirements.split('\n').map(r => r.trim()).filter(Boolean),
          allowedCountries: form.allowedCountries.split(',').map(c => c.trim()).filter(Boolean),
          displayPlacements: form.displayPlacements,
          platforms: form.platforms,
          postbackMapping: form.postbackMapping,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onSaved(data.offer);
        onClose();
      } else {
        setError(data.error || 'Failed to save offer');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50';
  const labelCls = 'block text-xs font-semibold text-slate-400 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1a1f2e] border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <h3 className="text-lg font-bold text-white mb-4">{isEdit ? 'Edit Direct Offer' : 'Create Direct Offer'}</h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={labelCls}>Title *</label>
            <input className={inputCls} value={form.title} onChange={set('title')} required placeholder="e.g. Casino Sign Up Bonus" />
          </div>
          <div>
            <label className={labelCls}>Description *</label>
            <textarea className={inputCls} rows={3} value={form.description} onChange={set('description')} required placeholder="Describe what the user needs to do..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Reward (Coins) *</label>
              <input type="number" className={inputCls} value={form.rewardAmount} onChange={set('rewardAmount')} required min="1" placeholder="e.g. 500" />
            </div>
            <div>
              <label className={labelCls}>Advertiser Payout (USD)</label>
              <input type="number" step="0.01" className={inputCls} value={form.advertiserPayoutAmount} onChange={set('advertiserPayoutAmount')} placeholder="e.g. 2.50" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Advertiser URL * <span className="text-slate-600 font-normal">(where user is sent)</span></label>
            <input className={inputCls} value={form.advertiserUrl} onChange={set('advertiserUrl')} required placeholder="https://advertiser.com/landing?ref=taskmint" />
          </div>
          <div>
            <label className={labelCls}>Requirements <span className="text-slate-600 font-normal">(one per line)</span></label>
            <textarea className={inputCls} rows={3} value={form.requirements} onChange={set('requirements')} placeholder="Register on the platform&#10;Make a deposit of at least $10&#10;Play 5 rounds" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Icon / Emoji</label>
              <input className={inputCls} value={form.icon} onChange={set('icon')} placeholder="🎰 or image URL" />
              <div className="flex flex-wrap gap-1 mt-1">
                {PRESET_ICONS.map(e => (
                  <button key={e} type="button" onClick={() => setForm(f => ({ ...f, icon: e }))}
                    className={`text-lg p-0.5 rounded hover:bg-white/10 ${form.icon === e ? 'bg-white/20' : ''}`}>{e}</button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Cover Image URL</label>
              <input className={inputCls} value={form.coverImage} onChange={set('coverImage')} placeholder="https://..." />
              {form.coverImage && (
                <img src={form.coverImage} alt="preview" className="mt-1 w-16 h-16 object-cover rounded-lg border border-white/10" />
              )}
            </div>
          </div>
          <div>
            <label className={labelCls}>Expiration Date</label>
            <input type="date" className={inputCls} value={form.expirationDate} onChange={set('expirationDate')} />
          </div>
          <div>
            <label className={labelCls}>Allowed Countries <span className="text-slate-600 font-normal">(ISO-2, comma separated; blank = global)</span></label>
            <input className={inputCls} value={form.allowedCountries} onChange={set('allowedCountries')} placeholder="US, GB, DE" />
          </div>
          <div>
            <label className={labelCls}>Placements</label>
            <div className="flex flex-wrap gap-3">
              {[
                ['featured', 'Featured Offers'],
                ['brandedOfferwall', 'Branded Offerwall'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.displayPlacements[key]}
                    onChange={e => setForm(f => ({ ...f, displayPlacements: { ...f.displayPlacements, [key]: e.target.checked } }))}
                    className="accent-indigo-500"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Platforms</label>
            <div className="flex gap-3">
              {['desktop', 'android', 'ios'].map(p => (
                <label key={p} className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={form.platforms[p]} onChange={e => setForm(f => ({ ...f, platforms: { ...f.platforms, [p]: e.target.checked } }))} className="accent-indigo-500" />
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </label>
              ))}
            </div>
          </div>

          {isEdit && (
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="accent-indigo-500" />
              Offer is Active
            </label>
          )}

          {/* Postback Parameter Mapping — Collapsible */}
          <div className="border border-white/10 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowMapping(m => !m)}
              className="w-full flex items-center justify-between px-3 py-2 bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-left"
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <FiSettings className="text-indigo-400" /> Postback Parameter Mapping
              </span>
              {showMapping ? <FiChevronUp className="text-slate-500" /> : <FiChevronDown className="text-slate-500" />}
            </button>
            {showMapping && (
              <div className="p-3 space-y-3 border-t border-white/5">
                <p className="text-[11px] text-slate-500">
                  Configure which query parameter names this advertiser uses. Leave defaults if unsure.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Click ID Parameter</label>
                    <input className={inputCls} value={form.postbackMapping.clickIdParam} onChange={setMapping('clickIdParam')} placeholder="e.g. clickid, subid, click_id" />
                  </div>
                  <div>
                    <label className={labelCls}>Transaction ID Parameter</label>
                    <input className={inputCls} value={form.postbackMapping.transactionIdParam} onChange={setMapping('transactionIdParam')} placeholder="e.g. txn_id, tid" />
                  </div>
                  <div>
                    <label className={labelCls}>Payout / Revenue Parameter</label>
                    <input className={inputCls} value={form.postbackMapping.payoutParam} onChange={setMapping('payoutParam')} placeholder="e.g. payout, reward, commission" />
                  </div>
                  <div>
                    <label className={labelCls}>Status Parameter</label>
                    <input className={inputCls} value={form.postbackMapping.statusParam} onChange={setMapping('statusParam')} placeholder="e.g. status, event, action" />
                  </div>
                  <div>
                    <label className={labelCls}>Approved Value</label>
                    <input className={inputCls} value={form.postbackMapping.approvedValue} onChange={setMapping('approvedValue')} placeholder="e.g. approved, conversion, 1" />
                  </div>
                  <div>
                    <label className={labelCls}>Rejected Value</label>
                    <input className={inputCls} value={form.postbackMapping.rejectedValue} onChange={setMapping('rejectedValue')} placeholder="e.g. rejected, chargeback, 0" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-rose-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white text-sm font-semibold transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">
              {loading ? <FiLoader className="animate-spin" /> : isEdit ? 'Save Changes' : 'Create Offer'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ─── Click Logs Modal ─────────────────────────────────────────────────────────
const ClickLogsModal = ({ offer, token, onClose }) => {
  const [clicks, setClicks] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter ? `?status=${filter}` : '';
      const res = await fetch(`${API}/admin/direct-offers/${offer._id}/clicks${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) { setClicks(data.clicks); setTotal(data.total); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [offer._id, token, filter]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (clickId, action) => {
    setActionLoading(clickId + action);
    try {
      const res = await fetch(`${API}/admin/click-logs/${clickId}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        await load();
      } else {
        alert(data.error);
      }
    } catch { alert('Network error'); }
    finally { setActionLoading(''); }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1a1f2e] border border-white/10 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Click Logs — <span className="text-indigo-300">{offer.title}</span></h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl font-bold">&times;</button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-slate-400">{total} total clicks</span>
          <div className="flex gap-2">
            {['', 'clicked', 'approved', 'rejected'].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold ${filter === s ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/40' : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white'}`}>
                {s || 'All'}
              </button>
            ))}
          </div>
          <button onClick={load} className="ml-auto p-1.5 text-slate-400 hover:text-white">
            <FiRefreshCw className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center text-slate-500 py-10"><FiLoader className="animate-spin inline text-2xl" /></div>
          ) : clicks.length === 0 ? (
            <div className="text-center text-slate-500 py-10">No click logs found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-white/5 text-left">
                  <th className="pb-2 pr-3">User</th>
                  <th className="pb-2 pr-3">Click ID</th>
                  <th className="pb-2 pr-3">Device</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Date</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clicks.map(click => (
                  <tr key={click._id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-2 pr-3">
                      <div className="text-white font-medium">{click.userId?.displayName || 'Unknown'}</div>
                      <div className="text-slate-500 text-xs">{click.userId?.email}</div>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-xs font-mono truncate max-w-[100px]" title={click.clickId}>
                          {click.clickId?.slice(0, 8)}...
                        </span>
                        <button onClick={() => copyToClipboard(click.clickId)} className="text-slate-500 hover:text-white" title="Copy full click ID">
                          <FiCopy className="text-xs" />
                        </button>
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-slate-400 text-xs">{click.device || 'unknown'}</td>
                    <td className="py-2 pr-3"><Badge status={click.status} /></td>
                    <td className="py-2 pr-3 text-slate-500 text-xs">{new Date(click.createdAt).toLocaleDateString()}</td>
                    <td className="py-2">
                      {click.status !== 'approved' && click.status !== 'rejected' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(click.clickId, 'approve')}
                            disabled={actionLoading === click.clickId + 'approve'}
                            className="px-2 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/25 disabled:opacity-50"
                          >
                            {actionLoading === click.clickId + 'approve' ? <FiLoader className="animate-spin" /> : '✓ Approve'}
                          </button>
                          <button
                            onClick={() => handleAction(click.clickId, 'reject')}
                            disabled={actionLoading === click.clickId + 'reject'}
                            className="px-2 py-1 rounded bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold hover:bg-rose-500/25 disabled:opacity-50"
                          >
                            {actionLoading === click.clickId + 'reject' ? <FiLoader className="animate-spin" /> : '✗ Reject'}
                          </button>
                        </div>
                      )}
                      {click.status === 'approved' && <span className="text-emerald-400 text-xs">Credited ✓</span>}
                      {click.status === 'rejected' && <span className="text-rose-400 text-xs">Rejected</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const AdminDirectOffers = () => {
  const { currentUser } = useAuth();
  const [token, setToken] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editOffer, setEditOffer] = useState(null);
  const [logsOffer, setLogsOffer] = useState(null);
  const [copiedId, setCopiedId] = useState('');

  useEffect(() => {
    if (currentUser) currentUser.getIdToken().then(setToken);
  }, [currentUser]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/direct-offers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setOffers(data.offers);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (offer) => {
    try {
      const res = await fetch(`${API}/admin/direct-offers/${offer._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive: !offer.isActive }),
      });
      const data = await res.json();
      if (data.success) setOffers(prev => prev.map(o => o._id === offer._id ? data.offer : o));
    } catch { alert('Failed to toggle offer'); }
  };

  const handleDelete = async (offer) => {
    if (!window.confirm(`Deactivate "${offer.title}"?`)) return;
    try {
      const res = await fetch(`${API}/admin/direct-offers/${offer._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setOffers(prev => prev.map(o => o._id === offer._id ? { ...o, isActive: false } : o));
    } catch { alert('Failed to deactivate'); }
  };

  const copySecret = (secret, id) => {
    navigator.clipboard.writeText(secret).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(''), 1500);
    }).catch(() => {});
  };

  const backendBaseUrl = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:5000';

  const buildPostbackUrl = (offer) => {
    const m = offer.postbackMapping || {};
    const clickIdParam = m.clickIdParam || 'click_id';
    const statusParam  = m.statusParam  || 'status';
    const approvedVal  = m.approvedValue || 'approved';
    const payoutParam  = m.payoutParam  || 'payout';
    return `${backendBaseUrl}/api/direct-offers/postback?${clickIdParam}={CLICK_ID}&${statusParam}=${approvedVal}&${payoutParam}={PAYOUT}&secret=${offer.postbackSecretKey}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FiLink className="text-indigo-400" /> Direct Offers
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            S2S postback tracking for direct advertiser partnerships. Rewards are credited automatically when advertisers confirm conversions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="p-2 text-slate-400 hover:text-white transition-colors">
            <FiRefreshCw className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors"
          >
            <FiPlus /> New Offer
          </button>
        </div>
      </div>

      {/* Offers Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-500"><FiLoader className="animate-spin inline text-3xl" /></div>
      ) : offers.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <FiLink className="text-slate-600 text-4xl mx-auto mb-3" />
          <p className="text-slate-400 font-semibold">No direct offers yet</p>
          <p className="text-slate-500 text-sm mt-1">Create your first direct offer to start tracking advertiser conversions.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {offers.map(offer => (
            <motion.div
              key={offer._id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-4"
            >
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Left: Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{offer.icon || '🔗'}</span>
                        <h4 className="text-white font-bold text-base">{offer.title}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${offer.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                          {offer.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-slate-400 text-sm mt-1 line-clamp-2">{offer.description}</p>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-400">
                    <span>💰 <strong className="text-amber-400">{offer.rewardAmount?.toLocaleString()}</strong> coins reward</span>
                    <span>💵 ${offer.advertiserPayoutAmount || 0} payout</span>
                    <span>Placement: <strong className="text-slate-300">{[
                      offer.displayPlacements?.featured !== false ? 'Featured' : null,
                      offer.displayPlacements?.brandedOfferwall ? 'Branded Offerwall' : null,
                    ].filter(Boolean).join(' + ') || 'Hidden'}</strong></span>
                    <span>Countries: <strong className="text-slate-300">{offer.allowedCountries?.length ? offer.allowedCountries.join(', ') : 'Global'}</strong></span>
                    <span>👆 <strong className="text-white">{offer.totalClicks || 0}</strong> clicks</span>
                    <span>✓ <strong className="text-emerald-400">{offer.totalApproved || 0}</strong> approved</span>
                    <span>✗ <strong className="text-rose-400">{offer.totalRejected || 0}</strong> rejected</span>
                  </div>

                  {/* Postback info */}
                  <div className="mt-3 bg-black/20 border border-white/5 rounded-lg p-3 space-y-2">
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Postback Setup</p>

                    <div>
                      <p className="text-[11px] text-slate-500 mb-1">Secret Key:</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-indigo-300 font-mono bg-indigo-500/10 px-2 py-0.5 rounded truncate max-w-xs">
                          {offer.postbackSecretKey}
                        </code>
                        <button onClick={() => copySecret(offer.postbackSecretKey, offer._id + 'secret')}
                          className="text-slate-500 hover:text-white flex-shrink-0" title="Copy secret">
                          {copiedId === offer._id + 'secret' ? <FiCheckCircle className="text-emerald-400" /> : <FiCopy />}
                        </button>
                      </div>
                    </div>

                    {/* Parameter mapping summary */}
                    {offer.postbackMapping && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
                        <span>Click ID: <strong className="text-slate-400">{offer.postbackMapping.clickIdParam || 'click_id'}</strong></span>
                        <span>Status: <strong className="text-slate-400">{offer.postbackMapping.statusParam || 'status'}</strong></span>
                        <span>Approved: <strong className="text-emerald-400">{offer.postbackMapping.approvedValue || 'approved'}</strong></span>
                        <span>Rejected: <strong className="text-rose-400">{offer.postbackMapping.rejectedValue || 'rejected'}</strong></span>
                        <span>Payout: <strong className="text-slate-400">{offer.postbackMapping.payoutParam || 'payout'}</strong></span>
                      </div>
                    )}

                    <div>
                      <p className="text-[11px] text-slate-500 mb-1">Give this URL to your advertiser:</p>
                      <div className="flex items-start gap-2">
                        <code className="text-[10px] text-slate-300 font-mono bg-black/30 px-2 py-1 rounded break-all flex-1">
                          {buildPostbackUrl(offer)}
                        </code>
                        <button onClick={() => copySecret(buildPostbackUrl(offer), offer._id + 'url')}
                          className="text-slate-500 hover:text-white flex-shrink-0 mt-1" title="Copy postback URL">
                          {copiedId === offer._id + 'url' ? <FiCheckCircle className="text-emerald-400" /> : <FiCopy />}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-600 mt-1">
                        Replace <code className="text-slate-500">{'{CLICK_ID}'}</code> with the actual click ID and <code className="text-slate-500">{'{PAYOUT}'}</code> with the payout amount.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-row lg:flex-col gap-2 lg:items-end flex-shrink-0">
                  <button
                    onClick={() => setLogsOffer(offer)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
                  >
                    <FiActivity /> Click Logs
                  </button>
                  <button
                    onClick={() => setEditOffer(offer)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:text-indigo-200 text-xs font-semibold transition-colors"
                  >
                    <FiEye /> Edit
                  </button>
                  <button
                    onClick={() => handleToggle(offer)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${offer.isActive ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:text-amber-300' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:text-emerald-300'}`}
                  >
                    {offer.isActive ? <><FiToggleRight /> Deactivate</> : <><FiToggleLeft /> Activate</>}
                  </button>
                  <a
                    href={offer.advertiserUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white text-xs font-semibold transition-colors"
                  >
                    <FiExternalLink /> Preview URL
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showCreate && (
          <OfferFormModal
            offer={null}
            token={token}
            onClose={() => setShowCreate(false)}
            onSaved={(offer) => setOffers(prev => [offer, ...prev])}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {editOffer && (
          <OfferFormModal
            offer={editOffer}
            token={token}
            onClose={() => setEditOffer(null)}
            onSaved={(updated) => {
              setOffers(prev => prev.map(o => o._id === updated._id ? updated : o));
              setEditOffer(null);
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {logsOffer && (
          <ClickLogsModal
            offer={logsOffer}
            token={token}
            onClose={() => setLogsOffer(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDirectOffers;
