import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FiTrash2, FiEdit2, FiPlus, FiImage, FiLoader } from 'react-icons/fi';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function AdminAvatars() {
  const { currentUser } = useAuth();
  const [avatars, setAvatars] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState(null);
  
  const [formData, setFormData] = useState({ name: '', isPremium: false, price: 0 });
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
      setFormData({ name: avatar.name, isPremium: avatar.isPremium, price: avatar.price });
      setFile(null);
    } else {
      setEditingAvatar(null);
      setFormData({ name: '', isPremium: false, price: 0 });
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

  if (loading) return <div className="p-8 text-center text-slate-400">Loading avatars...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Avatar Shop Management</h1>
          <p className="text-slate-400 text-sm mt-1">Add, edit, or remove user avatars.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors font-medium"
        >
          <FiPlus /> Add Avatar
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6">
        {avatars.map(avatar => (
          <div key={avatar._id} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex flex-col items-center p-4 relative group">
            <div className="w-20 h-20 rounded-full overflow-hidden mb-3 ring-2 ring-slate-700 bg-slate-900 flex-shrink-0">
              <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" />
            </div>
            <h3 className="text-white font-medium text-sm text-center truncate w-full">{avatar.name}</h3>
            
            {avatar.isPremium ? (
              <div className="flex items-center gap-1 text-yellow-400 text-xs font-bold mt-1">
                🪙 {avatar.price}
              </div>
            ) : (
              <div className="text-emerald-400 text-xs font-bold mt-1">FREE</div>
            )}

            {/* Actions overlay */}
            <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
              <button onClick={() => openModal(avatar)} className="p-2 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white rounded-lg transition-colors">
                <FiEdit2 />
              </button>
              <button onClick={() => handleDelete(avatar._id)} className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors">
                <FiTrash2 />
              </button>
            </div>
          </div>
        ))}
        {avatars.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-slate-800/50 rounded-xl border border-slate-700/50">
            No avatars found. Click "Add Avatar" to create one.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-800 rounded-xl shadow-xl w-full max-w-md border border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
              <h2 className="text-lg font-bold text-white">
                {editingAvatar ? 'Edit Avatar' : 'Add New Avatar'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Avatar Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="e.g. Cyber Punk Girl"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Avatar Image</label>
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
                    className="flex items-center justify-center gap-2 w-full bg-slate-900 border border-slate-700 border-dashed rounded-lg px-4 py-6 text-slate-400 hover:text-white hover:border-indigo-500 cursor-pointer transition-colors"
                  >
                    <FiImage className="w-5 h-5" />
                    <span>{file ? file.name : (editingAvatar ? 'Upload new to replace' : 'Click to select image')}</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                <input
                  type="checkbox"
                  id="isPremium"
                  checked={formData.isPremium}
                  onChange={(e) => setFormData({...formData, isPremium: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                />
                <label htmlFor="isPremium" className="text-sm font-medium text-white cursor-pointer select-none">
                  Is Premium Avatar?
                </label>
              </div>

              {formData.isPremium && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Coin Price 🪙</label>
                  <input
                    type="number"
                    min="0"
                    required={formData.isPremium}
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {saving && <FiLoader className="animate-spin" />}
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
