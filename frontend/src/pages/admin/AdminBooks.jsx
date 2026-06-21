import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  FiTrash2, FiEdit2, FiPlus, FiLoader, FiBook, FiGlobe, FiMapPin,
  FiPackage, FiX, FiCheck, FiEye, FiTruck, FiUpload, FiLink, FiImage
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BACKEND = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

const STATUS_COLORS = {
  pending:    'bg-amber-500/15 text-amber-300 border-amber-500/30',
  processing: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  shipped:    'bg-violet-500/15 text-violet-300 border-violet-500/30',
  delivered:  'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  cancelled:  'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

const EMPTY_FORM = {
  title: '', description: '', coinCost: '', available: true,
  // image state
  coverImageUrl: '',       // URL field
  coverImageFile: null,    // File object
  coverPreview: '',        // Local preview blob
  previewUrls: ['', '', '', '', ''],
  previewFiles: [null, null, null, null, null],
  previewPreviews: ['', '', '', '', ''],
};

/* ─── Small image picker (URL + Upload tabs) ─────────────────── */
function ImagePicker({ label, urlValue, onUrlChange, filePreview, onFileChange, accept = 'image/*' }) {
  const [mode, setMode] = useState(urlValue ? 'url' : 'upload');
  const inputRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    onFileChange(file, URL.createObjectURL(file));
  };

  return (
    <div>
      {label && <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{label}</p>}

      {/* Mode tabs */}
      <div className="flex gap-1 mb-2">
        {[{ key: 'upload', icon: FiUpload, text: 'Upload File' }, { key: 'url', icon: FiLink, text: 'Paste URL' }].map(m => (
          <button key={m.key} type="button" onClick={() => setMode(m.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === m.key ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40' : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:text-white'
            }`}>
            <m.icon size={11} /> {m.text}
          </button>
        ))}
      </div>

      {mode === 'upload' ? (
        <div>
          <div
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 h-28 bg-[#151b2b] border-2 border-dashed border-white/[0.12] hover:border-emerald-500/50 rounded-xl cursor-pointer transition-colors group"
          >
            {filePreview ? (
              <img src={filePreview} alt="" className="max-h-24 max-w-full object-contain rounded-lg" />
            ) : (
              <>
                <FiUpload className="text-slate-500 group-hover:text-emerald-400 transition-colors" size={20} />
                <p className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors">Click to upload image</p>
                <p className="text-xs text-slate-600">PNG, JPG, WEBP — max 10MB</p>
              </>
            )}
          </div>
          <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
        </div>
      ) : (
        <div>
          <input
            type="url"
            value={urlValue}
            onChange={e => onUrlChange(e.target.value)}
            placeholder="https://..."
            className="w-full bg-[#151b2b] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50"
          />
          {urlValue && (
            <img src={urlValue} alt="" onError={e => e.target.style.display='none'}
              className="mt-2 h-20 object-contain rounded-lg border border-white/[0.07]" />
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminBooks() {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState('books');
  const [books, setBooks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [booksGermanyOnly, setBooksGermanyOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderPage, setOrderPage] = useState(1);
  const [orderTotal, setOrderTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');

  // Book modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Order modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingOrder, setUpdatingOrder] = useState(false);
  const [orderNote, setOrderNote] = useState('');
  const [orderTracking, setOrderTracking] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [togglingGermany, setTogglingGermany] = useState(false);

  useEffect(() => { fetchBooks(); }, []);
  useEffect(() => { if (tab === 'orders') fetchOrders(); }, [tab, orderPage, statusFilter]);

  const getToken = () => currentUser.getIdToken();

  /* ── Fetch ─────────────────────────────── */
  const fetchBooks = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/books/admin/list`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) { setBooks(data.books); setBooksGermanyOnly(data.booksGermanyOnly); }
      else toast.error(data.error || 'Failed to load books');
    } catch { toast.error('Network error'); }
    finally { setLoading(false); }
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const token = await getToken();
      const params = new URLSearchParams({ page: orderPage, limit: 20 });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`${API}/books/admin/orders?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) { setOrders(data.orders); setOrderTotal(data.pagination.total); }
    } catch { toast.error('Network error'); }
    finally { setOrdersLoading(false); }
  };

  /* ── Germany toggle ──────────────────────── */
  const toggleGermanyOnly = async () => {
    setTogglingGermany(true);
    const newVal = !booksGermanyOnly;
    try {
      const token = await getToken();
      const res = await fetch(`${API}/books/admin/settings`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ booksGermanyOnly: newVal }),
      });
      const data = await res.json();
      if (data.success) {
        setBooksGermanyOnly(newVal);
        toast.success(newVal ? '🇩🇪 Books visible to Germany only' : '🌍 Books visible worldwide');
      }
    } catch { toast.error('Failed to update'); }
    finally { setTogglingGermany(false); }
  };

  /* ── Book CRUD ───────────────────────────── */
  const openModal = (book = null) => {
    if (book) {
      setEditing(book);
      const previews = [...(book.previewImages || [])];
      while (previews.length < 5) previews.push('');
      setForm({
        title: book.title,
        description: book.description || '',
        coinCost: book.coinCost,
        available: book.available,
        coverImageUrl: book.coverImage || '',
        coverImageFile: null,
        coverPreview: '',
        previewUrls: previews,
        previewFiles: [null, null, null, null, null],
        previewPreviews: ['', '', '', '', ''],
      });
    } else {
      setEditing(null);
      setForm(EMPTY_FORM);
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title || !form.coinCost) return toast.error('Title and coin cost are required');
    setSaving(true);
    try {
      const token = await getToken();
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('coinCost', form.coinCost);
      fd.append('available', form.available);

      // Cover — file or URL
      if (form.coverImageFile) {
        fd.append('coverImage', form.coverImageFile);
      } else {
        fd.append('coverImageUrl', form.coverImageUrl || '');
      }

      // Previews — mix of files and URLs
      const urlOnlyPreviews = [];
      form.previewFiles.forEach((file, i) => {
        if (file) {
          fd.append('previewImages', file);
        } else if (form.previewUrls[i]) {
          urlOnlyPreviews.push(form.previewUrls[i]);
        }
      });
      urlOnlyPreviews.forEach(url => fd.append('previewImageUrls', url));

      const url = editing ? `${API}/books/admin/${editing._id}` : `${API}/books/admin/create`;
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json();
      if (data.success) {
        toast.success(`Book ${editing ? 'updated' : 'created'} successfully`);
        fetchBooks();
        setShowModal(false);
      } else toast.error(data.error || 'Failed to save');
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this book?')) return;
    try {
      const token = await getToken();
      await fetch(`${API}/books/admin/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      toast.success('Book deleted');
      fetchBooks();
    } catch { toast.error('Network error'); }
  };

  /* ── Order update ─────────────────────────── */
  const openOrderModal = (order) => {
    setSelectedOrder(order);
    setOrderStatus(order.status);
    setOrderNote(order.adminNote || '');
    setOrderTracking(order.trackingNumber || '');
  };

  const handleUpdateOrder = async () => {
    setUpdatingOrder(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/books/admin/orders/${selectedOrder._id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: orderStatus, adminNote: orderNote, trackingNumber: orderTracking }),
      });
      const data = await res.json();
      if (data.success) { toast.success('Order updated'); setSelectedOrder(null); fetchOrders(); }
      else toast.error(data.error || 'Failed');
    } catch { toast.error('Network error'); }
    finally { setUpdatingOrder(false); }
  };

  /* ── UI ────────────────────────────────────── */
  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* ── Header ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FiBook className="text-emerald-400" /> Book Rewards
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage books users can redeem with coins.</p>
        </div>

        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-sm transition-colors"
        >
          <FiPlus /> Add Book
        </button>
      </div>

      {/* ── Book Visibility Setting ─────────────── */}
      <div className="bg-[#0c101b] border border-white/[0.1] rounded-2xl p-5 mb-6">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Book Visibility Setting</p>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">

          {/* Option A — Germany Only */}
          <button
            type="button"
            onClick={() => !booksGermanyOnly && toggleGermanyOnly()}
            disabled={togglingGermany}
            className={`flex-1 flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
              booksGermanyOnly
                ? 'border-amber-500/60 bg-amber-500/10'
                : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]'
            }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              booksGermanyOnly ? 'border-amber-400 bg-amber-400' : 'border-slate-600'
            }`}>
              {booksGermanyOnly && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
            <div>
              <p className={`font-bold text-sm ${booksGermanyOnly ? 'text-amber-300' : 'text-slate-400'}`}>
                🇩🇪 Germany Only
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Only users with a German IP can see and order books</p>
            </div>
          </button>

          {/* Divider */}
          <div className="flex sm:flex-col items-center gap-2 px-2 text-slate-600 text-xs font-bold">
            <div className="flex-1 h-px sm:h-auto sm:w-px bg-white/[0.07]" />
            OR
            <div className="flex-1 h-px sm:h-auto sm:w-px bg-white/[0.07]" />
          </div>

          {/* Option B — Worldwide */}
          <button
            type="button"
            onClick={() => booksGermanyOnly && toggleGermanyOnly()}
            disabled={togglingGermany}
            className={`flex-1 flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
              !booksGermanyOnly
                ? 'border-emerald-500/60 bg-emerald-500/10'
                : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]'
            }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              !booksGermanyOnly ? 'border-emerald-400 bg-emerald-400' : 'border-slate-600'
            }`}>
              {!booksGermanyOnly && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
            <div>
              <p className={`font-bold text-sm ${!booksGermanyOnly ? 'text-emerald-300' : 'text-slate-400'}`}>
                🌍 Worldwide
              </p>
              <p className="text-xs text-slate-500 mt-0.5">All users everywhere can see and order books</p>
            </div>
          </button>

        </div>
        {togglingGermany && (
          <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
            <FiLoader size={12} className="animate-spin" /> Saving setting...
          </div>
        )}
      </div>

      {/* ── Tabs ──────────────────────────────── */}
      <div className="flex gap-2 mb-6 border-b border-white/[0.07] pb-1">
        {[{ key: 'books', label: 'Books', icon: FiBook }, { key: 'orders', label: 'Orders', icon: FiPackage }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-semibold transition-all ${
              tab === t.key ? 'bg-white/[0.08] text-white' : 'text-slate-400 hover:text-white'
            }`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── Books Tab ─────────────────────────── */}
      {tab === 'books' && (
        loading ? (
          <div className="flex justify-center py-20"><FiLoader className="animate-spin text-3xl text-emerald-400" /></div>
        ) : books.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <FiBook className="mx-auto mb-3 text-4xl opacity-30" />
            <p>No books yet. Click "Add Book" to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {books.map(book => (
              <div key={book._id} className="bg-[#0c101b] border border-white/[0.08] rounded-2xl overflow-hidden group">
                <div className="relative h-52 bg-slate-900 flex items-center justify-center overflow-hidden">
                  {book.coverImage ? (
                    <img src={book.coverImage.startsWith('http') ? book.coverImage : `${BACKEND}${book.coverImage}`}
                      alt={book.title} className="h-full w-full object-contain p-4" />
                  ) : (
                    <FiBook className="text-slate-600 text-5xl" />
                  )}
                  {!book.available && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold px-3 py-1 rounded-full">UNAVAILABLE</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-white font-semibold text-sm leading-snug line-clamp-2 mb-2">{book.title}</p>
                  <div className="flex items-center gap-1 text-amber-400 font-bold text-sm">🪙 {book.coinCost?.toLocaleString()}</div>
                  {book.previewImages?.filter(Boolean).length > 0 && (
                    <p className="text-slate-500 text-xs mt-1">{book.previewImages.filter(Boolean).length} preview image(s)</p>
                  )}
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => openModal(book)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/[0.05] hover:bg-indigo-500/20 hover:text-indigo-300 text-slate-300 rounded-xl text-xs font-semibold transition-all">
                      <FiEdit2 size={12} /> Edit
                    </button>
                    <button onClick={() => handleDelete(book._id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/[0.05] hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 rounded-xl text-xs font-semibold transition-all">
                      <FiTrash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Orders Tab ────────────────────────── */}
      {tab === 'orders' && (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setOrderPage(1); }}
              className="bg-[#0c101b] border border-white/[0.08] text-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50">
              <option value="">All statuses</option>
              {['pending','processing','shipped','delivered','cancelled'].map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
              ))}
            </select>
            <span className="text-slate-500 text-sm">{orderTotal} total orders</span>
          </div>

          {ordersLoading ? (
            <div className="flex justify-center py-16"><FiLoader className="animate-spin text-2xl text-emerald-400" /></div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <FiPackage className="mx-auto mb-3 text-4xl opacity-30" /><p>No orders found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(order => (
                <div key={order._id} className="bg-[#0c101b] border border-white/[0.07] rounded-2xl p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex gap-4 items-start min-w-0">
                    {order.bookId?.coverImage && (
                      <img src={order.bookId.coverImage.startsWith('http') ? order.bookId.coverImage : `${BACKEND}${order.bookId.coverImage}`}
                        alt="" className="w-12 h-16 object-contain flex-shrink-0 rounded" />
                    )}
                    <div className="min-w-0">
                      <p className="text-white font-semibold text-sm leading-snug truncate">{order.bookTitle}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{order.userId?.displayName || 'Unknown'} · {order.fullName} · {order.city}</p>
                      <p className="text-slate-500 text-xs">{new Date(order.createdAt).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[order.status]}`}>
                          {order.status?.toUpperCase()}
                        </span>
                        {order.wantsSignature && <span className="text-[10px] text-violet-400 font-semibold">✍️ Signature</span>}
                        <span className="text-amber-400 text-xs font-bold">🪙 {order.coinCost?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => openOrderModal(order)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 rounded-xl text-xs font-semibold transition-all flex-shrink-0">
                    <FiEye size={12} /> Manage
                  </button>
                </div>
              ))}
              {orderTotal > 20 && (
                <div className="flex justify-center gap-3 pt-4">
                  <button onClick={() => setOrderPage(p => Math.max(1,p-1))} disabled={orderPage===1} className="px-4 py-2 bg-white/[0.05] text-slate-300 rounded-lg text-sm disabled:opacity-30">Prev</button>
                  <span className="px-4 py-2 text-slate-400 text-sm">Page {orderPage} / {Math.ceil(orderTotal/20)}</span>
                  <button onClick={() => setOrderPage(p=>p+1)} disabled={orderPage*20>=orderTotal} className="px-4 py-2 bg-white/[0.05] text-slate-300 rounded-lg text-sm disabled:opacity-30">Next</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Book Add/Edit Modal ──────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0c101b] border border-white/[0.1] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07] flex-shrink-0">
              <h2 className="text-lg font-bold text-white">{editing ? 'Edit Book' : 'Add New Book'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><FiX /></button>
            </div>

            <form onSubmit={handleSave} className="overflow-y-auto flex-1 p-6 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Book Title *</label>
                <input type="text" required value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  className="w-full bg-[#151b2b] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                  placeholder="e.g. So viel zu sagen, doch kein Plan wie" />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3}
                  className="w-full bg-[#151b2b] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50 resize-none"
                  placeholder="Short description of the book..." />
              </div>

              {/* Cover Image */}
              <ImagePicker
                label="Cover Image *"
                urlValue={form.coverImageUrl}
                onUrlChange={v => setForm({...form, coverImageUrl: v, coverImageFile: null, coverPreview: ''})}
                filePreview={form.coverPreview}
                onFileChange={(file, preview) => setForm({...form, coverImageFile: file, coverPreview: preview, coverImageUrl: ''})}
              />

              {/* Preview Images */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Preview Pages / Images <span className="text-slate-600 font-normal normal-case">(up to 5)</span>
                </label>
                <div className="space-y-4">
                  {[0,1,2,3,4].map(i => (
                    <div key={i} className="border border-white/[0.06] rounded-xl p-3 bg-[#0c101b]">
                      <p className="text-xs text-slate-500 mb-2">Preview {i+1}</p>
                      <ImagePicker
                        urlValue={form.previewUrls[i]}
                        onUrlChange={v => {
                          const arr = [...form.previewUrls]; arr[i] = v;
                          const files = [...form.previewFiles]; files[i] = null;
                          const prevs = [...form.previewPreviews]; prevs[i] = '';
                          setForm({...form, previewUrls: arr, previewFiles: files, previewPreviews: prevs});
                        }}
                        filePreview={form.previewPreviews[i]}
                        onFileChange={(file, preview) => {
                          const files = [...form.previewFiles]; files[i] = file;
                          const prevs = [...form.previewPreviews]; prevs[i] = preview;
                          const urls = [...form.previewUrls]; urls[i] = '';
                          setForm({...form, previewFiles: files, previewPreviews: prevs, previewUrls: urls});
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Coin Cost */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Coin Cost *</label>
                <input type="number" required min={1} value={form.coinCost} onChange={e => setForm({...form, coinCost: e.target.value})}
                  className="w-full bg-[#151b2b] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                  placeholder="e.g. 12500" />
              </div>

              {/* Available Toggle */}
              <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] p-4 rounded-xl">
                <button type="button" onClick={() => setForm({...form, available: !form.available})}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.available ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.available ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm text-white font-medium">Available for ordering</span>
              </div>
            </form>

            <div className="flex justify-end gap-3 px-6 py-5 border-t border-white/[0.07] flex-shrink-0">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-400 hover:text-white text-sm font-medium">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50">
                {saving ? <FiLoader className="animate-spin" /> : <FiCheck />}
                {saving ? 'Saving...' : editing ? 'Update Book' : 'Add Book'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Order Detail Modal ──────────────── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0c101b] border border-white/[0.1] rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07] flex-shrink-0">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><FiPackage className="text-emerald-400" /> Order Details</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-white"><FiX /></button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="flex gap-4 items-start">
                {selectedOrder.bookId?.coverImage && (
                  <img src={selectedOrder.bookId.coverImage.startsWith('http') ? selectedOrder.bookId.coverImage : `${BACKEND}${selectedOrder.bookId.coverImage}`}
                    alt="" className="w-16 h-20 object-contain flex-shrink-0 rounded-lg border border-white/[0.07]" />
                )}
                <div>
                  <p className="text-white font-bold text-sm">{selectedOrder.bookTitle}</p>
                  <p className="text-amber-400 text-sm font-bold mt-1">🪙 {selectedOrder.coinCost?.toLocaleString()}</p>
                  <p className="text-slate-500 text-xs mt-1">{new Date(selectedOrder.createdAt).toLocaleString('en-GB')}</p>
                </div>
              </div>
              <div className="bg-[#151b2b] rounded-xl p-4 space-y-1 text-sm">
                <p className="text-slate-400 font-semibold text-xs uppercase tracking-wider mb-2">Shipping Address</p>
                <p className="text-white font-semibold">{selectedOrder.fullName}</p>
                <p className="text-slate-300">{selectedOrder.email}</p>
                <p className="text-slate-300">{selectedOrder.address}</p>
                <p className="text-slate-300">{selectedOrder.city}, {selectedOrder.zipcode}</p>
                {selectedOrder.wantsSignature && (
                  <p className="text-violet-300 text-xs font-semibold mt-2">✍️ Signature for: {selectedOrder.signatureName || selectedOrder.fullName}</p>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Status</label>
                  <select value={orderStatus} onChange={e => setOrderStatus(e.target.value)}
                    className="w-full bg-[#151b2b] border border-white/[0.08] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50">
                    {['pending','processing','shipped','delivered','cancelled'].map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tracking Number</label>
                  <input type="text" value={orderTracking} onChange={e => setOrderTracking(e.target.value)}
                    className="w-full bg-[#151b2b] border border-white/[0.08] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50"
                    placeholder="Optional tracking number" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Admin Note</label>
                  <textarea value={orderNote} onChange={e => setOrderNote(e.target.value)} rows={2}
                    className="w-full bg-[#151b2b] border border-white/[0.08] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 resize-none"
                    placeholder="Internal note..." />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-5 border-t border-white/[0.07] flex-shrink-0">
              <button onClick={() => setSelectedOrder(null)} className="px-4 py-2 text-slate-400 hover:text-white text-sm">Cancel</button>
              <button onClick={handleUpdateOrder} disabled={updatingOrder}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-sm disabled:opacity-50">
                {updatingOrder ? <FiLoader className="animate-spin" /> : <FiTruck />}
                {updatingOrder ? 'Saving...' : 'Update Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
