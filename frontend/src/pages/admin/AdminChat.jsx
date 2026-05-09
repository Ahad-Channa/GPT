import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth } from '../../contexts/AuthContext';
import {
  FiMessageSquare, FiTrash2, FiRefreshCw, FiSearch,
  FiUser, FiClock, FiAlertCircle, FiCheck
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = API.replace('/api', '');

const AdminChat = () => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [filter, setFilter] = useState('all'); // all | deleted | active
  const [search, setSearch] = useState('');
  const [liveCount, setLiveCount] = useState(0);
  const socketRef = useRef(null);

  const fetchMessages = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API}/chat/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setMessages(data.data);
      } else {
        toast.error('Failed to load chat messages');
      }
    } catch (err) {
      console.error('Fetch admin chat error:', err);
      toast.error('Failed to load chat messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Connect to socket for live updates
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on('newMessage', (msg) => {
      setMessages((prev) => [...prev, { ...msg, isDeleted: false }]);
      setLiveCount((c) => c + 1);
    });

    socket.on('messageDeleted', ({ _id }) => {
      setMessages((prev) =>
        prev.map((m) => m._id === _id ? { ...m, isDeleted: true } : m)
      );
    });

    return () => socket.disconnect();
  }, [currentUser]);

  const handleDelete = async (msgId) => {
    if (!currentUser) return;
    setDeletingId(msgId);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API}/chat/messages/${msgId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success('Message deleted');
        // Optimistically mark as deleted (socket event will also fire)
        setMessages((prev) => prev.map((m) => m._id === msgId ? { ...m, isDeleted: true } : m));
      } else {
        toast.error(data.message || 'Failed to delete');
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete message');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = messages.filter((msg) => {
    if (filter === 'deleted' && !msg.isDeleted) return false;
    if (filter === 'active' && msg.isDeleted) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const name = (msg.user?.displayName || '').toLowerCase();
      const text = (msg.message || '').toLowerCase();
      if (!name.includes(q) && !text.includes(q)) return false;
    }
    return true;
  });

  const activeCount = messages.filter((m) => !m.isDeleted).length;
  const deletedCount = messages.filter((m) => m.isDeleted).length;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9', margin: 0, letterSpacing: '-0.01em' }}>
          Chat Moderation
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.35rem' }}>
          Monitor and moderate the live global chat room in real-time.
        </p>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Messages', value: messages.length, icon: FiMessageSquare, color: '#6366f1' },
          { label: 'Active', value: activeCount, icon: FiCheck, color: '#10b981' },
          { label: 'Deleted', value: deletedCount, icon: FiTrash2, color: '#ef4444' },
          { label: 'New This Session', value: liveCount, icon: FiClock, color: '#f59e0b' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem'
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: `${color}20`,
              border: `1px solid ${color}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Icon style={{ color, fontSize: '1rem' }} />
            </div>
            <div>
              <p style={{ fontSize: '1.35rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{value}</p>
              <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{
        display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem',
        alignItems: 'center'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569', fontSize: '0.85rem' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages or users..."
            style={{
              width: '100%', background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
              padding: '0.55rem 0.75rem 0.55rem 2.2rem',
              color: '#e2e8f0', fontSize: '0.85rem', outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '0.25rem' }}>
          {['all', 'active', 'deleted'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? 'rgba(99,102,241,0.25)' : 'transparent',
                border: filter === f ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
                color: filter === f ? '#a5b4fc' : '#64748b',
                borderRadius: 6, padding: '0.35rem 0.85rem',
                fontSize: '0.78rem', fontWeight: filter === f ? 600 : 400,
                cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s'
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Refresh */}
        <button
          onClick={fetchMessages}
          disabled={loading}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8, padding: '0.55rem 1rem',
            color: '#94a3b8', cursor: loading ? 'wait' : 'pointer',
            fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.15s'
          }}
        >
          <FiRefreshCw style={{ fontSize: '0.85rem', animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>

        {/* Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: 'auto' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>LIVE</span>
        </div>
      </div>

      {/* Messages Table */}
      <div style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12, overflow: 'hidden'
      }}>
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '44px 1fr 160px 130px 90px 64px',
          padding: '0.65rem 1.25rem',
          background: 'rgba(255,255,255,0.03)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          fontSize: '0.7rem', fontWeight: 700,
          color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em',
          gap: '0.75rem', alignItems: 'center'
        }}>
          <div>#</div>
          <div>Message</div>
          <div>User</div>
          <div>Sent At</div>
          <div>Status</div>
          <div style={{ textAlign: 'center' }}>Action</div>
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>
            <FiRefreshCw style={{ fontSize: '1.5rem', animation: 'spin 1s linear infinite', marginBottom: '0.75rem' }} />
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Loading messages...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>
            <FiAlertCircle style={{ fontSize: '1.5rem', marginBottom: '0.75rem', display: 'block', margin: '0 auto 0.75rem' }} />
            <p style={{ margin: 0, fontSize: '0.85rem' }}>No messages found</p>
          </div>
        ) : (
          filtered.map((msg, idx) => (
            <div
              key={msg._id}
              style={{
                display: 'grid',
                gridTemplateColumns: '44px 1fr 160px 130px 90px 64px',
                padding: '0.75rem 1.25rem',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                gap: '0.75rem', alignItems: 'center',
                opacity: msg.isDeleted ? 0.5 : 1,
                background: msg.isDeleted ? 'rgba(239,68,68,0.04)' : 'transparent',
                transition: 'background 0.15s'
              }}
            >
              {/* Index */}
              <div style={{ fontSize: '0.72rem', color: '#334155', fontVariantNumeric: 'tabular-nums' }}>
                {idx + 1}
              </div>

              {/* Message */}
              <div style={{
                fontSize: '0.85rem', color: msg.isDeleted ? '#475569' : '#cbd5e1',
                fontStyle: msg.isDeleted ? 'italic' : 'normal',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {msg.isDeleted ? '[Message Deleted]' : msg.message}
              </div>

              {/* User */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', overflow: 'hidden',
                  background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0
                }}>
                  <img
                    src={msg.user?.avatarUrl || '/avatars/avatar1.png'}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {msg.user?.displayName || 'Unknown'}
                  </p>
                  {msg.user?.role && msg.user.role !== 'user' && (
                    <span style={{
                      fontSize: '0.65rem',
                      color: msg.user.role === 'admin' ? '#fbbf24' : '#38bdf8',
                      textTransform: 'uppercase', fontWeight: 700
                    }}>
                      {msg.user.role}
                    </span>
                  )}
                </div>
              </div>

              {/* Sent At */}
              <div style={{ fontSize: '0.75rem', color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                {new Date(msg.createdAt).toLocaleString([], {
                  month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </div>

              {/* Status Badge */}
              <div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                  fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase',
                  padding: '0.2rem 0.6rem', borderRadius: 100,
                  background: msg.isDeleted ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                  color: msg.isDeleted ? '#f87171' : '#34d399',
                  border: `1px solid ${msg.isDeleted ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`
                }}>
                  {msg.isDeleted ? 'Deleted' : 'Active'}
                </span>
              </div>

              {/* Action */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                {!msg.isDeleted ? (
                  <button
                    onClick={() => handleDelete(msg._id)}
                    disabled={deletingId === msg._id}
                    title="Delete message"
                    style={{
                      width: 32, height: 32,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.25)',
                      borderRadius: 7, cursor: deletingId === msg._id ? 'wait' : 'pointer',
                      color: '#f87171', transition: 'all 0.15s',
                      opacity: deletingId === msg._id ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.22)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                  >
                    <FiTrash2 style={{ fontSize: '0.85rem' }} />
                  </button>
                ) : (
                  <span style={{ color: '#334155', fontSize: '0.75rem' }}>—</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer count */}
      {!loading && (
        <p style={{ textAlign: 'right', fontSize: '0.75rem', color: '#334155', marginTop: '0.6rem' }}>
          Showing {filtered.length} of {messages.length} messages
        </p>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
};

export default AdminChat;
