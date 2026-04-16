import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCheckCircle, FiXCircle, FiLoader, FiRefreshCw, FiImage, FiInbox, FiAlertTriangle
} from 'react-icons/fi';
import ImageModal from '../../components/ImageModal';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── Custom Rejection Reason Popup ────────────────────────────────────────────
const RejectReasonModal = ({ proofTitle, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    // Auto-focus textarea when modal opens
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);

  const handleConfirm = () => {
    onConfirm(reason.trim() || undefined);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleConfirm();
    if (e.key === 'Escape') onCancel();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="w-full max-w-md rounded-2xl border border-rose-500/20 shadow-2xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1a1f2e 0%, #13171f 100%)' }}
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
                <FiXCircle className="text-rose-400 text-lg" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base">Reject Proof</h3>
                <p className="text-slate-500 text-xs mt-0.5 truncate max-w-[260px]">{proofTitle}</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
              Rejection Reason
              <span className="ml-1 text-slate-600 font-normal normal-case tracking-normal">(optional – saved in audit log &amp; sent to user)</span>
            </label>
            <textarea
              ref={textareaRef}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Screenshot doesn't match the required offer step…"
              rows={4}
              className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-slate-200 placeholder-slate-600 px-4 py-3 resize-none outline-none focus:border-rose-500/40 focus:bg-white/[0.05] transition-all"
            />
            <p className="text-xs text-slate-600 mt-1.5">Tip: Press Ctrl+Enter to confirm</p>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex items-center justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.08] text-sm font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-5 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25 text-sm font-semibold transition-all flex items-center gap-2"
            >
              <FiXCircle />
              Confirm Reject
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ── Toast Error ───────────────────────────────────────────────────────────────
const Toast = ({ message, onClose }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 16 }}
    className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-sm shadow-xl max-w-xs"
  >
    <FiAlertTriangle className="flex-shrink-0" />
    <span>{message}</span>
    <button onClick={onClose} className="ml-auto text-rose-400/60 hover:text-rose-300">
      <FiXCircle />
    </button>
  </motion.div>
);

// ── Badge ─────────────────────────────────────────────────────────────────────
const Badge = ({ customClass, children }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${customClass}`}>
    {children}
  </span>
);

// ── Proof Row ─────────────────────────────────────────────────────────────────
const ProofRow = ({ proof, onAction, token, onError }) => {
  const { _id, type, user, offerTitle, rewardAmount, proofText, proofImage, submittedAt } = proof;
  const [loading, setLoading] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const submitAction = async (actionStatus, reason) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/proofs/${type}/${_id}/${actionStatus}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (data.success) {
        onAction(_id, actionStatus);
      } else {
        onError(data.error || 'Failed to process proof');
      }
    } catch (e) {
      console.error('Action failed', e);
      onError('Network error while processing proof.');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectConfirm = (reason) => {
    setShowRejectModal(false);
    submitAction('reject', reason);
  };

  return (
    <>
      {showRejectModal && (
        <RejectReasonModal
          proofTitle={offerTitle}
          onConfirm={handleRejectConfirm}
          onCancel={() => setShowRejectModal(false)}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-4 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.01] transition-colors px-2 rounded-xl">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-sm text-white font-semibold flex items-center gap-2 truncate">
              {user?.avatarUrl && <img src={user.avatarUrl} className="w-5 h-5 rounded-full" alt="" />}
              {user?.displayName || user?.email || 'Unknown User'}
            </span>
            <Badge customClass={type === 'custom_offer' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20'}>
              {type === 'custom_offer' ? 'Featured Offer' : 'General Transaction'}
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mb-1">
            Offer/Task: <span className="text-white">{offerTitle}</span>
            {' · '}
            <span className="text-emerald-400 font-bold">+{rewardAmount?.toLocaleString()} Coins</span>
            {' · '}
            <span>{new Date(submittedAt).toLocaleString()}</span>
          </p>

          {proofText && (
            <div className="mt-2 text-xs text-slate-300 p-2 bg-slate-900 border border-white/[0.08] rounded-lg">
              <span className="text-slate-500 block mb-1">User Note:</span>
              {proofText}
            </div>
          )}

          {proofImage && (
            <div className="mt-2">
              <button
                onClick={() => setImageModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-all text-xs flex items-center gap-2"
              >
                <FiImage className="text-indigo-400" /> View Image Proof
              </button>
              <ImageModal isOpen={imageModalOpen} onClose={() => setImageModalOpen(false)} imageUrl={proofImage} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => submitAction('approve')}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-sm font-semibold disabled:opacity-50 transition-all shadow-glow"
          >
            {loading ? <FiLoader className="animate-spin" /> : <FiCheckCircle />}
            Approve
          </button>
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-sm font-semibold disabled:opacity-50 transition-all"
          >
            <FiXCircle />
            Reject
          </button>
        </div>
      </div>
    </>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const AdminProofs = () => {
  const { currentUser } = useAuth();
  const [token, setToken] = useState(null);
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (currentUser) currentUser.getIdToken().then(setToken);
  }, [currentUser]);

  const fetchProofs = useCallback(async (t) => {
    if (!t) return;
    setError(null);
    try {
      const res = await fetch(`${API}/api/admin/proofs`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      if (data.success) {
        setProofs(data.proofs);
      } else {
        setError(data.error);
      }
    } catch (e) {
      console.error('Failed to load proofs:', e);
      setError('Network error');
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchProofs(token).finally(() => setLoading(false));
  }, [token, fetchProofs, refreshToken]);

  const handleAction = (id) => {
    setProofs((prev) => prev.filter((p) => p._id !== id));
  };

  if (loading && proofs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-white flex items-center gap-2">
            <FiInbox className="text-indigo-400" />
            Unified Inbox
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Review user-submitted proofs from featured offers or standard transactions all in one place.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setRefreshToken((n) => n + 1)}
            className="p-2.5 rounded-xl border border-white/[0.08] text-slate-400 hover:text-white hover:border-white/20 transition-all flex items-center gap-2"
          >
            <FiRefreshCw className="text-sm" /> <span className="text-sm font-semibold hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
          <FiAlertTriangle /> {error}
        </div>
      )}

      {/* List */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden shadow-card">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Pending Proofs</h2>
          <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-xs font-mono text-slate-400">
            {proofs.length} total
          </span>
        </div>

        {proofs.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-indigo-500/[0.05] border border-indigo-500/10 flex items-center justify-center">
              <FiCheckCircle className="text-indigo-500/40 text-2xl" />
            </div>
            <div>
              <p className="text-slate-300 font-semibold mb-1">Inbox Zero!</p>
              <p className="text-slate-500 text-sm">There are no pending proofs requiring your attention.</p>
            </div>
          </div>
        ) : (
          <div className="px-5 py-2 divide-y divide-white/[0.04]">
            {proofs.map((proof) => (
              <ProofRow
                key={proof._id}
                proof={proof}
                token={token}
                onAction={handleAction}
                onError={showToast}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminProofs;
