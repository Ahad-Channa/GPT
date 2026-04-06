import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiStar, FiPlus, FiTrash2, FiToggleLeft, FiToggleRight,
  FiExternalLink, FiClock, FiCheckCircle, FiXCircle,
  FiLoader, FiAlertTriangle, FiRefreshCw, FiEye, FiInbox
} from 'react-icons/fi';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const STATUS_COLORS = {
  pending:  { text: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20'  },
  approved: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  rejected: { text: 'text-rose-400',   bg: 'bg-rose-500/10',   border: 'border-rose-500/20'   },
};

const Badge = ({ status }) => {
  const c = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${c.text} ${c.bg} border ${c.border}`}>
      {status}
    </span>
  );
};

// ── Create Offer Modal ────────────────────────────────────────────────────────
const CreateOfferModal = ({ onClose, onCreated, token }) => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    rewardAmount: '',
    externalLink: '',
    trackingType: 'manual_approval',
    expirationDate: '',
    icon: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/custom-offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          rewardAmount: Number(form.rewardAmount),
          expirationDate: form.expirationDate || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onCreated(data.offer);
        onClose();
      } else {
        setError(data.error || 'Failed to create offer');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-xl bg-[#0f1728] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.07] bg-gradient-to-r from-amber-500/[0.06] to-transparent shrink-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <FiStar className="text-amber-400 text-sm" />
          </div>
          <div>
            <h3 className="text-white font-bold font-display text-sm">Create Featured Offer</h3>
            <p className="text-slate-500 text-[11px] mt-0.5">Add a new offer for users to complete</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3 overflow-y-auto custom-scrollbar relative">
          {/* Title */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Title *</label>
            <input
              value={form.title}
              onChange={set('title')}
              placeholder="e.g. Sign up for CryptoGame and reach Level 5"
              required
              className="w-full bg-slate-900 border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Description *</label>
            <textarea
              value={form.description}
              onChange={set('description')}
              placeholder="Describe the steps needed to complete and earn the reward..."
              rows={2}
              required
              className="w-full bg-slate-900 border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 resize-none"
            />
          </div>

          {/* Icon URL */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Icon / Image URL</label>
            <input
              type="text"
              value={form.icon}
              onChange={set('icon')}
              placeholder="e.g. https://.../icon.png or fa-solid fa-gamepad"
              className="w-full bg-slate-900 border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20"
            />
          </div>

          {/* Reward + External Link (2 cols) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Reward (Coins) *</label>
              <input
                type="number"
                min="1"
                value={form.rewardAmount}
                onChange={set('rewardAmount')}
                placeholder="e.g. 500"
                required
                className="w-full bg-slate-900 border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Expiry Date</label>
              <input
                type="datetime-local"
                value={form.expirationDate}
                onChange={set('expirationDate')}
                className="w-full bg-slate-900 border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20"
              />
            </div>
          </div>

          {/* External Link */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">External Link *</label>
            <input
              type="url"
              value={form.externalLink}
              onChange={set('externalLink')}
              placeholder="https://..."
              required
              className="w-full bg-slate-900 border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20"
            />
          </div>

          {/* Tracking Type */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Tracking Type</label>
            <select
              value={form.trackingType}
              onChange={set('trackingType')}
              className="w-full bg-slate-900 border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20"
            >
              <option className="bg-slate-900" value="manual_approval">Manual Approval (user submits proof)</option>
              <option className="bg-slate-900" value="click">Click Tracking (auto-credit on click)</option>
            </select>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm shrink-0">
              <FiAlertTriangle className="flex-shrink-0" /> {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-1 shrink-0 pb-2">
            <button type="button" onClick={onClose} className="px-4 py-1.5 text-slate-400 hover:text-white text-sm font-semibold transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold text-sm hover:bg-amber-500/30 disabled:opacity-50 transition-all"
            >
              {loading ? <FiLoader className="animate-spin" /> : <FiPlus />}
              {loading ? 'Creating...' : 'Create Offer'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ── Submission Review Row ─────────────────────────────────────────────────────
const SubmissionRow = ({ sub, onAction, token }) => {
  const [loading, setLoading] = useState(false);

  const act = async (status) => {
    let adminNote = undefined;
    
    if (status === 'rejected') {
      const reason = window.prompt("Reason for rejection: (Saved in audit logs)");
      if (reason === null) return; // Cancelled
      adminNote = reason;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/custom-offers/submissions/${sub._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, adminNote }),
      });
      const data = await res.json();
      if (data.success) onAction(sub._id, status);
    } catch (e) {
      console.error('Submission update failed', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-b border-white/[0.04] last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <span className="text-sm text-white font-semibold truncate">
            {sub.userId?.displayName || sub.userId?.email || 'Unknown User'}
          </span>
          <Badge status={sub.status} />
        </div>
        <p className="text-xs text-slate-500">
          Offer: <span className="text-slate-400">{sub.offerId?.title || 'N/A'}</span>
          {' · '}
          <span className="text-emerald-500">+{sub.offerId?.rewardAmount?.toLocaleString() || '?'} Coins</span>
          {' · '}
          {new Date(sub.createdAt).toLocaleDateString()}
        </p>
        {sub.proofText && (
          <p className="text-xs text-slate-500 mt-1 italic truncate">
            Proof: "{sub.proofText}"
          </p>
        )}
        {sub.proofImage && (
          <div className="mt-2">
            <a href={sub.proofImage} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 transition-colors text-xs font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full inline-block animate-pulse"></span>
              View Uploaded Image Proof
            </a>
          </div>
        )}
        {sub.adminNote && (
          <div className="mt-2 p-2 rounded bg-white/[0.04] border border-white/[0.08] text-xs text-slate-300 w-fit">
            <span className="font-semibold text-rose-400 block mb-0.5">Admin Note:</span>
            <p className="italic">"{sub.adminNote}"</p>
          </div>
        )}
      </div>
      {sub.status === 'pending' && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => act('approved')}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold disabled:opacity-50 transition-all"
          >
            {loading ? <FiLoader className="animate-spin text-xs" /> : <FiCheckCircle className="text-xs" />}
            Approve
          </button>
          <button
            onClick={() => act('rejected')}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold disabled:opacity-50 transition-all"
          >
            <FiXCircle className="text-xs" />
            Reject
          </button>
        </div>
      )}
    </div>
  );
};

// ── Main Admin Component ──────────────────────────────────────────────────────
const AdminCustomOffers = () => {
  const { currentUser } = useAuth();
  const [token, setToken] = useState(null);
  const [offers, setOffers] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activeView, setActiveView] = useState('offers'); // 'offers' | 'submissions'
  const [submissionFilter, setSubmissionFilter] = useState('pending'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [refreshSub, setRefreshSub] = useState(0);

  useEffect(() => {
    if (currentUser) currentUser.getIdToken().then(setToken);
  }, [currentUser]);

  const fetchOffers = useCallback(async (t) => {
    if (!t) return;
    try {
      const res = await fetch(`${API}/api/admin/custom-offers`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      if (data.success) setOffers(data.offers);
    } catch (e) {
      console.error('Failed to load offers:', e);
    }
  }, []);

  const fetchSubmissions = useCallback(async (t) => {
    if (!t) return;
    try {
      const res = await fetch(`${API}/api/admin/custom-offers/submissions/all`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      if (data.success) setSubmissions(data.submissions);
    } catch (e) {
      console.error('Failed to load submissions:', e);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([fetchOffers(token), fetchSubmissions(token)]).finally(() => setLoading(false));
  }, [token, fetchOffers, fetchSubmissions, refreshSub]);

  const toggleOffer = async (offer) => {
    try {
      const res = await fetch(`${API}/api/admin/custom-offers/${offer._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive: !offer.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        setOffers((prev) => prev.map((o) => (o._id === offer._id ? data.offer : o)));
      }
    } catch (e) {
      console.error('Toggle failed:', e);
    }
  };

  const deleteOffer = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this offer?')) return;
    try {
      const res = await fetch(`${API}/api/admin/custom-offers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setOffers((prev) => prev.filter((o) => o._id !== id));
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  const handleSubmissionAction = (subId, newStatus) => {
    setSubmissions((prev) =>
      prev.map((s) => (s._id === subId ? { ...s, status: newStatus } : s))
    );
  };

  const pendingCount = submissions.filter((s) => s.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-white flex items-center gap-2">
            <FiStar className="text-amber-400" />
            Featured Offers
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Create and manage direct partnership offers. Approve user proof submissions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setRefreshSub((n) => n + 1)}
            className="p-2.5 rounded-xl border border-white/[0.08] text-slate-400 hover:text-white hover:border-white/20 transition-all"
            title="Refresh"
          >
            <FiRefreshCw className="text-sm" />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-300 font-semibold text-sm hover:bg-amber-500/25 transition-all"
          >
            <FiPlus /> Create Offer
          </button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 p-1 bg-white/[0.02] border border-white/[0.06] rounded-2xl w-fit">
        {['offers', 'submissions'].map((view) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 ${
              activeView === view
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            {view === 'offers' ? <FiEye /> : <FiInbox />}
            {view === 'offers' ? 'Manage Offers' : 'Review Submissions'}
            {view === 'submissions' && pendingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/20">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── OFFERS VIEW ─── */}
      <AnimatePresence mode="wait">
        {activeView === 'offers' && (
          <motion.div
            key="offers"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-4"
          >
            {offers.length === 0 ? (
              <div className="border border-dashed border-white/[0.08] rounded-2xl p-16 text-center flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/[0.06] border border-amber-500/[0.12] flex items-center justify-center">
                  <FiStar className="text-amber-500/40 text-xl" />
                </div>
                <div>
                  <p className="text-slate-300 font-semibold mb-1">No Featured Offers Yet</p>
                  <p className="text-slate-500 text-sm">Click "Create Offer" to add your first partnership offer.</p>
                </div>
              </div>
            ) : (
              offers.map((offer) => (
                <motion.div
                  key={offer._id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white/[0.02] border rounded-2xl p-5 transition-all ${
                    offer.isActive ? 'border-amber-500/15 hover:border-amber-500/30' : 'border-white/[0.05] opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-white font-bold font-display text-base">{offer.title}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          offer.isActive
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                            : 'text-slate-500 bg-white/5 border-white/10'
                        }`}>
                          {offer.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 text-amber-400">
                          {offer.trackingType === 'manual_approval' ? 'Manual' : 'Click'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mb-2 leading-relaxed">{offer.description}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="text-emerald-400 font-bold font-mono">+{offer.rewardAmount?.toLocaleString()} Coins</span>
                        <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-slate-300">
                          {offer.clicks || 0} Click{(offer.clicks !== 1) ? 's' : ''}
                        </span>
                        <a href={offer.externalLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors">
                          <FiExternalLink className="text-[10px]" /> View Link
                        </a>
                        {offer.expirationDate && (
                          <span className="flex items-center gap-1">
                            <FiClock className="text-[10px]" />
                            Expires {new Date(offer.expirationDate).toLocaleDateString()}
                          </span>
                        )}
                        <span>Created {new Date(offer.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => toggleOffer(offer)}
                        title={offer.isActive ? 'Deactivate offer' : 'Activate offer'}
                        className={`p-2 rounded-lg border transition-all ${
                          offer.isActive
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-white/[0.04] border-white/[0.08] text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {offer.isActive ? <FiToggleRight className="text-base" /> : <FiToggleLeft className="text-base" />}
                      </button>
                      <button
                        onClick={() => deleteOffer(offer._id)}
                        title="Delete offer"
                        className="p-2 rounded-lg bg-rose-500/[0.08] border border-rose-500/20 text-rose-500 hover:bg-rose-500/15 hover:text-rose-400 transition-all"
                      >
                        <FiTrash2 className="text-base" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}

        {/* ─── SUBMISSIONS VIEW ─── */}
        {activeView === 'submissions' && (() => {
          const filteredSubmissions = submissionFilter === 'all' 
            ? submissions 
            : submissions.filter(s => s.status === submissionFilter);
            
          return (
          <motion.div
            key="submissions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 border-b border-white/[0.06]">
              <h2 className="text-sm font-bold text-white flex items-center">
                User Submissions
                {pendingCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/20">
                    {pendingCount} Pending
                  </span>
                )}
              </h2>
              
              <div className="flex items-center gap-2">
                <select 
                  value={submissionFilter}
                  onChange={(e) => setSubmissionFilter(e.target.value)}
                  className="bg-slate-900 border border-white/[0.08] rounded-xg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500/40"
                >
                  <option className="bg-slate-900" value="all">All Submissions</option>
                  <option className="bg-slate-900" value="pending">Pending</option>
                  <option className="bg-slate-900" value="approved">Approved</option>
                  <option className="bg-slate-900" value="rejected">Rejected</option>
                </select>
                <span className="text-xs text-slate-500">{filteredSubmissions.length} showing</span>
              </div>
            </div>

            {filteredSubmissions.length === 0 ? (
              <div className="p-16 text-center flex flex-col items-center gap-3">
                <FiInbox className="text-slate-600 text-3xl" />
                <p className="text-slate-500 text-sm">No submissions found for the current filter.</p>
              </div>
            ) : (
              <div className="px-5 divide-y divide-white/[0.04]">
                {filteredSubmissions.map((sub) => (
                  <SubmissionRow key={sub._id} sub={sub} onAction={handleSubmissionAction} token={token} />
                ))}
              </div>
            )}
          </motion.div>
        )})()}
      </AnimatePresence>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateOfferModal
            token={token}
            onClose={() => setShowCreate(false)}
            onCreated={(offer) => setOffers((prev) => [offer, ...prev])}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminCustomOffers;
