import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FiTrash2, FiEdit2, FiPlus, FiImage, FiLoader, FiUser, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function AdminAvatars() {
  const { currentUser } = useAuth();
  const [avatars, setAvatars] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState(null);
  const [totalCoinsEarned, setTotalCoinsEarned] = useState(0);
  
  const [formData, setFormData] = useState({ name: '', isPremium: false, price: 0, quantity: '', description: '', rarity: '' });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAvatars();
  }, []);

  const fetchAvatars = async () => {
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API}/admin/avatars`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAvatars(data.avatars);
        setTotalCoinsEarned(data.totalCoinsEarned || 0);
      } else {
        toast.error('Failed to load avatars');
      }
    } catch (e) {
      toast.error('Network error loading avatars');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (avatar = null) => {
    if (avatar) {
      setEditingAvatar(avatar);
      setFormData({ name: avatar.name, isPremium: avatar.isPremium, price: avatar.price, quantity: avatar.quantity === null || avatar.quantity === undefined ? '' : avatar.quantity, description: avatar.description || '', rarity: avatar.rarity || '' });
      setFile(null);
    } else {
      setEditingAvatar(null);
      setFormData({ name: '', isPremium: false, price: 0, quantity: '', description: '', rarity: '' });
      setFile(null);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAvatar(null);
    setFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return toast.error('Name is required');
    if (!editingAvatar && !file) return toast.error('Image file is required for new avatars');

    setSaving(true);
    try {
      const token = await currentUser.getIdToken();
      const url = editingAvatar 
        ? `${API}/admin/avatars/${editingAvatar._id}`
        : `${API}/admin/avatars`;
      const method = editingAvatar ? 'PUT' : 'POST';

      const fd = new FormData();
      fd.append('name', formData.name);
      fd.append('isPremium', formData.isPremium);
      fd.append('price', formData.price);
      fd.append('description', formData.description || '');
      fd.append('rarity', formData.rarity || '');
      if (formData.quantity !== '') {
        fd.append('quantity', formData.quantity);
      } else {
        fd.append('quantity', 'null');
      }
      if (file) {
        fd.append('image', file);
      }

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Avatar ${editingAvatar ? 'updated' : 'created'} successfully`);
        fetchAvatars();
        closeModal();
      } else {
        toast.error(data.error || 'Failed to save avatar');
      }
    } catch (err) {
      toast.error('Network error while saving avatar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this avatar?')) return;
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API}/admin/avatars/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Avatar deleted');
        fetchAvatars();
      } else {
        toast.error(data.error || 'Failed to delete avatar');
      }
    } catch (e) {
      toast.error('Network error');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Loading avatars...</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FiUser style={{ color: '#2563EB' }} />
            Avatar Shop Management
          </h1>
          <p className="admin-page-sub">Add, edit, or remove user avatars.</p>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl shadow-sm">
             <span className="text-amber-800 font-bold text-xs uppercase tracking-wider">Total Earned:</span>
             <span className="text-amber-900 font-bold font-display">{totalCoinsEarned.toLocaleString()} 🪙</span>
          </div>
        </div>
        <button
          onClick={() => openModal()}
          className="admin-btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <FiPlus size={16} /> Add Avatar
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {avatars.map(avatar => (
          <div key={avatar._id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col items-center p-4 relative group shadow-sm hover:shadow-md transition-all">
            <div className="w-20 h-20 rounded-full overflow-hidden mb-3 ring-2 ring-gray-100 bg-gray-50 flex-shrink-0">
              <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" />
            </div>
            <h3 className="text-gray-900 font-bold text-xs text-center truncate w-full">{avatar.name}</h3>
            
            {avatar.isPremium ? (
              <div className="flex items-center gap-1 text-amber-700 text-xs font-bold font-display mt-1">
                🪙 {avatar.price}
              </div>
            ) : (
              <div className="text-emerald-700 text-xs font-bold uppercase tracking-wider mt-1">FREE</div>
            )}
            <div className="text-[11px] text-gray-500 mt-1 font-medium">
              {avatar.quantity === null || avatar.quantity === undefined ? 'Unlimited' : (avatar.quantity <= 0 ? <span className="text-rose-600 font-bold">Sold Out</span> : `${avatar.quantity} left`)}
            </div>

            {/* Actions overlay */}
            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-xs rounded-2xl">
              <button onClick={() => openModal(avatar)} className="p-2 bg-white text-gray-800 hover:bg-gray-100 rounded-xl transition-all shadow-sm">
                <FiEdit2 size={14} />
              </button>
              <button onClick={() => handleDelete(avatar._id)} className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition-all shadow-sm">
                <FiTrash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {avatars.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-200 shadow-sm">
            No avatars found. Click "Add Avatar" to create one.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" style={{ maxWidth: '440px' }}>
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900 font-display">
                {editingAvatar ? 'Edit Avatar' : 'Add New Avatar'}
              </h2>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-all"
              >
                <FiX size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="admin-label">Avatar Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="admin-input"
                  placeholder="e.g. Cyber Punk Girl"
                />
              </div>

              <div>
                <label className="admin-label">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="admin-input resize-none"
                  rows={2}
                  placeholder="e.g. Rare Mythic Edition"
                />
              </div>

              <div>
                <label className="admin-label">Rarity</label>
                <input
                  type="text"
                  value={formData.rarity}
                  onChange={(e) => setFormData({...formData, rarity: e.target.value})}
                  className="admin-input"
                  placeholder="e.g. Limited Edition"
                />
              </div>

              <div>
                <label className="admin-label">Avatar Image</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <label 
                    htmlFor="avatar-upload" 
                    className="flex items-center justify-center gap-2 w-full bg-gray-50 border border-gray-300 border-dashed rounded-xl px-4 py-5 text-gray-600 hover:border-[#1E2538] hover:text-[#1E2538] cursor-pointer transition-colors text-xs font-medium"
                  >
                    <FiImage className="w-5 h-5 text-gray-400" />
                    <span>{file ? file.name : (editingAvatar ? 'Upload new to replace' : 'Click to select image')}</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <input
                  type="checkbox"
                  id="isPremium"
                  checked={formData.isPremium}
                  onChange={(e) => setFormData({...formData, isPremium: e.target.checked})}
                  className="w-4 h-4 rounded border-gray-300 text-[#1E2538] focus:ring-[#1E2538]"
                />
                <label htmlFor="isPremium" className="text-xs font-bold text-gray-800 cursor-pointer select-none">
                  Is Premium Avatar?
                </label>
              </div>

              {formData.isPremium && (
                <div>
                  <label className="admin-label">Coin Price 🪙 *</label>
                  <input
                    type="number"
                    min="0"
                    required={formData.isPremium}
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
                    className="admin-input"
                  />
                </div>
              )}

              <div>
                <label className="admin-label">Quantity / Stock Limit</label>
                <input
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  className="admin-input"
                  placeholder="Leave empty for unlimited"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2.5 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="admin-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="admin-btn-primary"
                >
                  {saving && <FiLoader className="animate-spin text-xs" />}
                  {saving ? 'Saving...' : 'Save Avatar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

