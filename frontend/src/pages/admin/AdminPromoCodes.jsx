import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { FiTag, FiPlus, FiTrash2, FiEdit2, FiCheck, FiX, FiLoader, FiAlertCircle } from 'react-icons/fi';
import CoinDisplay from '../../components/CoinDisplay';

const AdminPromoCodes = () => {
  const { currentUser, isPrimaryAdmin, mongoUser } = useAuth();
  
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ code: '', rewardCoins: '', maxUses: '', expiresAt: '', minEarningsLast7Days: '' });
  const [creating, setCreating] = useState(false);

  const fetchCodes = useCallback(async (p = 1) => {
    try {
      setLoading(true);
      const token = await currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/promo-codes?page=${p}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setCodes(data.codes);
      setTotalPages(data.totalPages);
      setPage(p);
    } catch (err) {
      toast.error('Failed to load promo codes');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchCodes(); }, [fetchCodes]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.code || !createForm.rewardCoins) return toast.error('Code and Reward are required');
    
    setCreating(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/promo-codes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: createForm.code.trim().toUpperCase(),
          rewardCoins: Number(createForm.rewardCoins),
          maxUses: createForm.maxUses ? Number(createForm.maxUses) : 0,
          expiresAt: createForm.expiresAt || null,
          minEarningsLast7Days: createForm.minEarningsLast7Days ? Number(createForm.minEarningsLast7Days) : 0
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      
      toast.success('Promo code created!');
      setShowCreateModal(false);
      setCreateForm({ code: '', rewardCoins: '', maxUses: '', expiresAt: '', minEarningsLast7Days: '' });
      fetchCodes(1);
    } catch (err) {
      toast.error(err.message || 'Failed to create code');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/promo-codes/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      
      setCodes(prev => prev.map(c => c._id === id ? { ...c, isActive: !currentStatus } : c));
      toast.success('Code updated');
    } catch (err) {
      toast.error(err.message || 'Update failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this promo code permanently?')) return;
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/promo-codes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      
      setCodes(prev => prev.filter(c => c._id !== id));
      toast.success('Code deleted');
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const canManage = isPrimaryAdmin || mongoUser?.adminPermissions?.includes('manage_offerwalls');

  if (!canManage) {
    return (
      <div>
        <h1 className="admin-page-title">Promo Codes</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1.5rem', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '14px', marginTop: '1rem' }}>
          <FiAlertCircle style={{ color: '#f87171', fontSize: '1.25rem' }} />
          <p style={{ color: '#f87171', fontWeight: 600 }}>Access Restricted. You need 'manage_offerwalls' permission.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
        <div>
          <h1 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FiTag style={{ color: '#3b82f6' }} />
            Promo Codes
          </h1>
          <p className="admin-page-sub">Manage promotional codes, rewards, and redemption limits.</p>
        </div>
        <button 
          className="action-btn" 
          onClick={() => setShowCreateModal(true)}
          style={{ background: '#3b82f6', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <FiPlus /> New Code
        </button>
      </div>

      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>CODE</th>
              <th>REWARD</th>
              <th>7D REQ</th>
              <th>USES</th>
              <th>EXPIRES</th>
              <th>STATUS</th>
              <th style={{ textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}><FiLoader className="spin" /></td></tr>
            ) : codes.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>No promo codes found</td></tr>
            ) : (
               codes.map(c => {
                 const isExpired = c.expiresAt && new Date(c.expiresAt) < new Date();
                 const isMaxedOut = c.maxUses > 0 && c.usedCount >= c.maxUses;
                 const active = c.isActive && !isExpired && !isMaxedOut;

                 return (
                  <tr key={c._id}>
                    <td><strong style={{ color: '#e2e8f0', letterSpacing: '1px' }}>{c.code}</strong></td>
                    <td style={{ display: 'flex', alignItems: 'center' }}><CoinDisplay amount={c.rewardCoins} size={12} /></td>
                    <td style={{ color: c.minEarningsLast7Days > 0 ? '#facc15' : '#64748b' }}>{c.minEarningsLast7Days > 0 ? <CoinDisplay amount={c.minEarningsLast7Days} size={12} /> : '—'}</td>
                    <td>{c.usedCount} {c.maxUses > 0 ? `/ ${c.maxUses}` : ''}</td>
                    <td>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'Never'}</td>
                    <td>
                      <span className={`status-pill ${active ? 'completed' : 'rejected'}`} style={{ cursor: 'pointer' }} onClick={() => handleToggleActive(c._id, c.isActive)}>
                        {active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => handleDelete(c._id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.4rem' }}>
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                 );
               })
            )}
          </tbody>
        </table>
        
        {totalPages > 1 && (
          <div className="admin-pagination">
            <button disabled={page === 1} onClick={() => fetchCodes(page - 1)}>Prev</button>
            <span>Page {page} of {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => fetchCodes(page + 1)}>Next</button>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '14px', width: '90%', maxWidth: '400px', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <h3 style={{ color: 'white', marginTop: 0, display: 'flex', justifyContent: 'space-between' }}>
              Create Promo Code
              <FiX style={{ cursor: 'pointer', color: '#94a3b8' }} onClick={() => setShowCreateModal(false)} />
            </h3>
            
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <label className="admin-label">Code (Text)</label>
                <input 
                  type="text" 
                  className="admin-input" 
                  value={createForm.code} 
                  onChange={e => setCreateForm({...createForm, code: e.target.value.toUpperCase()})}
                  placeholder="e.g. WELCOME100" 
                  required 
                />
              </div>
              
              <div>
                <label className="admin-label">Reward Amount (Coins)</label>
                <input 
                  type="number" 
                  className="admin-input" 
                  value={createForm.rewardCoins} 
                  onChange={e => setCreateForm({...createForm, rewardCoins: e.target.value})}
                  min="1" 
                  required 
                />
              </div>

              <div>
                <label className="admin-label">Max Uses (0 = unlimited)</label>
                <input 
                  type="number" 
                  className="admin-input" 
                  value={createForm.maxUses} 
                  onChange={e => setCreateForm({...createForm, maxUses: e.target.value})}
                  min="0" 
                />
              </div>

              <div>
                <label className="admin-label">Min Coins Earned (Last 7 Days)</label>
                <input 
                  type="number" 
                  className="admin-input" 
                  value={createForm.minEarningsLast7Days} 
                  onChange={e => setCreateForm({...createForm, minEarningsLast7Days: e.target.value})}
                  min="0" 
                  placeholder="0 = no restriction"
                />
              </div>

              <div>
                <label className="admin-label">Expiration Date (Optional)</label>
                <input 
                  type="datetime-local" 
                  className="admin-input" 
                  value={createForm.expiresAt} 
                  onChange={e => setCreateForm({...createForm, expiresAt: e.target.value})}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="action-btn" style={{ flex: 1 }} onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="action-btn" style={{ flex: 1, background: '#3b82f6', color: 'white', border: 'none' }} disabled={creating}>
                  {creating ? <FiLoader className="spin" /> : 'Create'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default AdminPromoCodes;
