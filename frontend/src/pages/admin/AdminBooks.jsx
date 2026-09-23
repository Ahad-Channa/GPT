import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  FiTrash2, FiEdit2, FiPlus, FiLoader, FiBook,
  FiPackage, FiX, FiCheck, FiEye, FiTruck, FiUpload, FiLink
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BACKEND = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

const STATUS_COLORS = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  processing: 'bg-blue-50 text-blue-700 border-blue-200',
  shipped: 'bg-purple-50 text-purple-700 border-purple-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
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
      {label && <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 font-['Poppins']">{label}</p>}

      {/* Mode tabs */}
      <div className="flex gap-1 mb-2">
        {[{ key: 'upload', icon: FiUpload, text: 'Upload File' }, { key: 'url', icon: FiLink, text: 'Paste URL' }].map(m => (
          <button key={m.key} type="button" onClick={() => setMode(m.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === m.key ? 'bg-[#1E2538] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
            <m.icon size={12} /> {m.text}
          </button>
        ))}
      </div>

      {mode === 'upload' ? (
        <div>
          <div
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 h-28 bg-gray-50 border-2 border-dashed border-gray-300 hover:border-[#1E2538] rounded-xl cursor-pointer transition-colors group"
          >
            {filePreview ? (
              <img src={filePreview} alt="" className="max-h-24 max-w-full object-contain rounded-lg" />
            ) : (
              <>
                <FiUpload className="text-gray-400 group-hover:text-[#1E2538] transition-colors" size={20} />
                <p className="text-xs text-gray-600 group-hover:text-gray-900 transition-colors font-medium">Click to upload image</p>
                <p className="text-[11px] text-gray-400">PNG, JPG, WEBP — max 10MB</p>
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
            className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-[#0E0F0C] text-sm focus:outline-none focus:border-[#1E2538]"
          />
          {urlValue && (
            <img src={urlValue.startsWith('data:') || urlValue.startsWith('http') ? urlValue : `${BACKEND}${urlValue}`} alt="" onError={e => e.target.style.display = 'none'}
              className="mt-2 h-20 object-contain rounded-lg border border-gray-200" />
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
    <div>
      {/* ── Header ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="admin-page-title flex items-center gap-2">
            <FiBook style={{ color: '#1E2538' }} /> Book Rewards
          </h1>
          <p className="admin-page-sub mb-0">Manage physical books users can redeem with coins.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openModal()}
            className="action-btn primary"
            style={{ height: '40px', padding: '0 1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <FiPlus /> Add Book
          </button>
        </div>
      </div>

      {/* ── Book Visibility Setting ─────────────── */}
      <div className="admin-card mb-6">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 font-['Poppins']">Book Visibility Setting</p>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

          {/* Option A — Germany Only */}
          <button
            type="button"
            onClick={() => !booksGermanyOnly && toggleGermanyOnly()}
            disabled={togglingGermany}
            className={`flex-1 flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${booksGermanyOnly
                ? 'border-amber-500 bg-amber-50/50'
                : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
              }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${booksGermanyOnly ? 'border-amber-500 bg-amber-500' : 'border-gray-400'
              }`}>
              {booksGermanyOnly && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
            <div>
              <p className={`font-bold text-sm ${booksGermanyOnly ? 'text-amber-800' : 'text-gray-700'}`}>
                🇩🇪 Germany Only
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Only users with a German IP can see and order books</p>
            </div>
          </button>

          {/* Divider */}
          <div className="flex sm:flex-col items-center gap-2 px-2 text-gray-400 text-xs font-bold">
            <div className="flex-1 h-px sm:h-auto sm:w-px bg-gray-200" />
            OR
            <div className="flex-1 h-px sm:h-auto sm:w-px bg-gray-200" />
          </div>

          {/* Option B — Worldwide */}
          <button
            type="button"
            onClick={() => booksGermanyOnly && toggleGermanyOnly()}
            disabled={togglingGermany}
            className={`flex-1 flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${!booksGermanyOnly
                ? 'border-emerald-500 bg-emerald-50/50'
                : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
              }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${!booksGermanyOnly ? 'border-emerald-500 bg-emerald-500' : 'border-gray-400'
              }`}>
              {!booksGermanyOnly && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
            <div>
              <p className={`font-bold text-sm ${!booksGermanyOnly ? 'text-emerald-800' : 'text-gray-700'}`}>
                🌍 Worldwide
              </p>
              <p className="text-xs text-gray-500 mt-0.5">All users everywhere can see and order books</p>
            </div>
          </button>

        </div>
        {togglingGermany && (
          <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
            <FiLoader size={12} className="animate-spin" /> Saving setting...
          </div>
        )}
      </div>

      {/* ── Tabs ──────────────────────────────── */}
      <div className="flex gap-2 mb-6">
        {[{ key: 'books', label: 'Books Catalog', icon: FiBook }, { key: 'orders', label: 'Book Orders', icon: FiPackage }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`filter-pill ${tab === t.key ? 'active' : ''} flex items-center gap-2`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── Books Tab ─────────────────────────── */}
      {tab === 'books' && (
        loading ? (
          <div className="admin-card flex justify-center py-20"><FiLoader className="animate-spin text-3xl text-[#1E2538]" /></div>
        ) : books.length === 0 ? (
          <div className="admin-card text-center py-20 text-gray-400">
            <FiBook className="mx-auto mb-3 text-4xl opacity-30" />
            <p className="font-medium text-sm">No books yet. Click "Add Book" to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {books.map(book => (
              <div key={book._id} className="admin-card p-0 overflow-hidden mb-0 flex flex-col justify-between group">
                <div className="relative h-52 bg-gray-50 flex items-center justify-center overflow-hidden border-b border-gray-100">
                  {book.coverImage ? (
                    <img
                      src={book.coverImage.startsWith('data:') || book.coverImage.startsWith('http') ? book.coverImage : `${BACKEND}${book.coverImage}`}
                      alt={book.title} className="h-full w-full object-contain p-4"
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex'); }} />
                  ) : null}
                  <div className="text-gray-300 text-5xl flex items-center justify-center h-full" style={{ display: book.coverImage ? 'none' : 'flex' }}>
                    <FiBook /></div>
                  {!book.available && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center">
                      <span className="bg-rose-100 border border-rose-300 text-rose-700 text-xs font-bold px-3 py-1 rounded-full">UNAVAILABLE</span>
                    </div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-[#0E0F0C] font-bold text-sm leading-snug line-clamp-2 mb-2 font-['Bricolage_Grotesque']">{book.title}</p>
                    <div className="flex items-center gap-1 text-[#D97706] font-bold text-sm">🪙 {book.coinCost?.toLocaleString()} Coins</div>
                    {book.previewImages?.filter(Boolean).length > 0 && (
                      <p className="text-gray-500 text-xs mt-1">{book.previewImages.filter(Boolean).length} preview image(s)</p>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                    <button onClick={() => openModal(book)}
                      className="action-btn flex-1">
                      <FiEdit2 size={12} /> Edit
                    </button>
                    <button onClick={() => handleDelete(book._id)}
                      className="action-btn danger flex-1">
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
              className="bg-white border border-gray-300 text-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1E2538]">
              <option value="">All statuses</option>
              {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <span className="text-gray-500 text-sm font-medium">{orderTotal} total orders</span>
          </div>

          {ordersLoading ? (
            <div className="admin-card flex justify-center py-16"><FiLoader className="animate-spin text-2xl text-[#1E2538]" /></div>
          ) : orders.length === 0 ? (
            <div className="admin-card text-center py-16 text-gray-400">
              <FiPackage className="mx-auto mb-3 text-4xl opacity-30" /><p className="font-medium text-sm">No orders found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(order => (
                <div key={order._id} className="admin-card p-4 mb-0 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex gap-4 items-start min-w-0">
                    {order.bookId?.coverImage && (
                      <img
                        src={order.bookId.coverImage.startsWith('data:') || order.bookId.coverImage.startsWith('http') ? order.bookId.coverImage : `${BACKEND}${order.bookId.coverImage}`}
                        alt="" className="w-12 h-16 object-contain flex-shrink-0 rounded bg-gray-50 border border-gray-200" />
                    )}
                    <div className="min-w-0">
                      <p className="text-[#0E0F0C] font-bold text-sm leading-snug truncate font-['Bricolage_Grotesque']">{order.bookTitle}</p>
                      <p className="text-gray-600 text-xs mt-0.5">{order.userId?.displayName || 'Unknown'} · {order.fullName} · {order.city}</p>
                      <p className="text-gray-400 text-xs">{new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[order.status]}`}>
                          {order.status?.toUpperCase()}
                        </span>
                        {order.wantsSignature && <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full font-semibold">✍️ Signature</span>}
                        <span className="text-[#D97706] text-xs font-bold">🪙 {order.coinCost?.toLocaleString()} Coins</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => openOrderModal(order)}
                    className="action-btn flex-shrink-0">
                    <FiEye size={13} /> Manage
                  </button>
                </div>
              ))}
              {orderTotal > 20 && (
                <div className="flex justify-center gap-3 pt-4">
                  <button onClick={() => setOrderPage(p => Math.max(1, p - 1))} disabled={orderPage === 1} className="action-btn disabled:opacity-40">Prev</button>
                  <span className="px-4 py-2 text-gray-500 text-sm font-medium">Page {orderPage} / {Math.ceil(orderTotal / 20)}</span>
                  <button onClick={() => setOrderPage(p => p + 1)} disabled={orderPage * 20 >= orderTotal} className="action-btn disabled:opacity-40">Next</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Book Add/Edit Modal ──────────────── */}
      {showModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-lg font-bold text-[#0E0F0C] font-['Bricolage_Grotesque']">{editing ? 'Edit Book' : 'Add New Book'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700"><FiX size={18} /></button>
            </div>

            <form onSubmit={handleSave} className="overflow-y-auto flex-1 p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 font-['Poppins']">Book Title *</label>
                <input type="text" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-[#0E0F0C] text-sm focus:outline-none focus:border-[#1E2538]"
                  placeholder="e.g. So viel zu sagen, doch kein Plan wie" />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 font-['Poppins']">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
                  className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-[#0E0F0C] text-sm focus:outline-none focus:border-[#1E2538] resize-none"
                  placeholder="Short description of the book..." />
              </div>

              {/* Cover Image */}
              <ImagePicker
                label="Cover Image *"
                urlValue={form.coverImageUrl}
                onUrlChange={v => setForm({ ...form, coverImageUrl: v, coverImageFile: null, coverPreview: '' })}
                filePreview={form.coverPreview}
                onFileChange={(file, preview) => setForm({ ...form, coverImageFile: file, coverPreview: preview, coverImageUrl: '' })}
              />

              {/* Preview Images */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3 font-['Poppins']">
                  Preview Pages / Images <span className="text-gray-400 font-normal normal-case">(up to 5)</span>
                </label>
                <div className="space-y-3">
                  {[0, 1, 2, 3, 4].map(i => (
                    <div key={i} className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                      <p className="text-xs text-gray-500 mb-2 font-medium">Preview {i + 1}</p>
                      <ImagePicker
                        urlValue={form.previewUrls[i]}
                        onUrlChange={v => {
                          const arr = [...form.previewUrls]; arr[i] = v;
                          const files = [...form.previewFiles]; files[i] = null;
                          const prevs = [...form.previewPreviews]; prevs[i] = '';
                          setForm({ ...form, previewUrls: arr, previewFiles: files, previewPreviews: prevs });
                        }}
                        filePreview={form.previewPreviews[i]}
                        onFileChange={(file, preview) => {
                          const files = [...form.previewFiles]; files[i] = file;
                          const prevs = [...form.previewPreviews]; prevs[i] = preview;
                          const urls = [...form.previewUrls]; urls[i] = '';
                          setForm({ ...form, previewFiles: files, previewPreviews: prevs, previewUrls: urls });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Coin Cost */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 font-['Poppins']">Coin Cost *</label>
                <input type="number" required min={1} value={form.coinCost} onChange={e => setForm({ ...form, coinCost: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-[#0E0F0C] text-sm focus:outline-none focus:border-[#1E2538]"
                  placeholder="e.g. 12500" />
              </div>

              {/* Available Toggle */}
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 p-4 rounded-xl">
                <button type="button" onClick={() => setForm({ ...form, available: !form.available })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.available ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.available ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm text-[#0E0F0C] font-semibold">Available for ordering</span>
              </div>
            </form>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0 bg-gray-50">
              <button type="button" onClick={() => setShowModal(false)} className="action-btn">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="action-btn primary"
                style={{ padding: '0 1.25rem' }}>
                {saving ? <FiLoader className="animate-spin" /> : <FiCheck />}
                {saving ? 'Saving...' : editing ? 'Update Book' : 'Add Book'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Order Detail Modal ──────────────── */}
      {selectedOrder && (
        <div className="admin-modal-overlay">
          <div className="admin-modal max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-lg font-bold text-[#0E0F0C] flex items-center gap-2 font-['Bricolage_Grotesque']"><FiPackage /> Order Details</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-700"><FiX size={18} /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="flex gap-4 items-start">
                {selectedOrder.bookId?.coverImage && (
                  <img
                    src={selectedOrder.bookId.coverImage.startsWith('data:') || selectedOrder.bookId.coverImage.startsWith('http') ? selectedOrder.bookId.coverImage : `${BACKEND}${selectedOrder.bookId.coverImage}`}
                    alt="" className="w-16 h-20 object-contain flex-shrink-0 rounded-lg border border-gray-200 bg-gray-50" />
                )}
                <div>
                  <p className="text-[#0E0F0C] font-bold text-sm font-['Bricolage_Grotesque']">{selectedOrder.bookTitle}</p>
                  <p className="text-[#D97706] text-sm font-bold mt-1">🪙 {selectedOrder.coinCost?.toLocaleString()} Coins</p>
                  <p className="text-gray-400 text-xs mt-1">{new Date(selectedOrder.createdAt).toLocaleString('en-GB')}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-1 text-sm border border-gray-200">
                <p className="text-gray-500 font-semibold text-xs uppercase tracking-wider mb-2 font-['Poppins']">Shipping Address</p>
                <p className="text-[#0E0F0C] font-bold">{selectedOrder.fullName}</p>
                <p className="text-gray-600">{selectedOrder.email}</p>
                <p className="text-gray-600">{selectedOrder.address}</p>
                <p className="text-gray-600">{selectedOrder.city}, {selectedOrder.zipcode}</p>
                {selectedOrder.wantsSignature && (
                  <p className="text-purple-700 text-xs font-semibold mt-2">✍️ Signature for: {selectedOrder.signatureName || selectedOrder.fullName}</p>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 font-['Poppins']">Status</label>
                  <select value={orderStatus} onChange={e => setOrderStatus(e.target.value)}
                    className="w-full bg-white border border-gray-300 text-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1E2538]">
                    {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 font-['Poppins']">Tracking Number</label>
                  <input type="text" value={orderTracking} onChange={e => setOrderTracking(e.target.value)}
                    className="w-full bg-white border border-gray-300 text-[#0E0F0C] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1E2538]"
                    placeholder="Optional tracking number" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 font-['Poppins']">Admin Note</label>
                  <textarea value={orderNote} onChange={e => setOrderNote(e.target.value)} rows={2}
                    className="w-full bg-white border border-gray-300 text-[#0E0F0C] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1E2538] resize-none"
                    placeholder="Internal note..." />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0 bg-gray-50">
              <button onClick={() => setSelectedOrder(null)} className="action-btn">Cancel</button>
              <button onClick={handleUpdateOrder} disabled={updatingOrder}
                className="action-btn primary"
                style={{ padding: '0 1.25rem' }}>
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
