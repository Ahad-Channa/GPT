import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth } from '../../contexts/AuthContext';
import {
  FiMessageSquare, FiTrash2, FiRefreshCw, FiSearch,
  FiClock, FiAlertCircle, FiCheck
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = API.replace(/\/api\/?$/, '');

const AdminChat = () => {
  const { currentUser, isPrimaryAdmin } = useAuth();
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

    // Clear all event — nuke entire local state
    socket.on('chatCleared', () => {
      setMessages((prev) => prev.map(m => ({ ...m, isDeleted: true })));
      toast.success('Chat cleared!');
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

  const handleClearAll = async () => {
    if (!isPrimaryAdmin) return;
    if (!window.confirm('⚠️ This will DELETE ALL active messages in the live chat. This cannot be undone. Continue?')) return;
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API}/chat/clear-all`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success(`Chat cleared — ${data.clearedCount} messages removed`);
        setMessages(prev => prev.map(m => ({ ...m, isDeleted: true })));
      } else {
        toast.error('Failed to clear chat');
      }
    } catch (err) {
      console.error('Clear all error:', err);
      toast.error('Failed to clear chat');
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
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <FiMessageSquare style={{ color: '#2563EB' }} />
          Chat Moderation
        </h1>
        <p className="admin-page-sub">
          Monitor and moderate the live global chat room in real-time.
        </p>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Messages', value: messages.length, icon: FiMessageSquare, color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Active', value: activeCount, icon: FiCheck, color: '#059669', bg: '#ECFDF5' },
          { label: 'Deleted', value: deletedCount, icon: FiTrash2, color: '#DC2626', bg: '#FEF2F2' },
          { label: 'New This Session', value: liveCount, icon: FiClock, color: '#D97706', bg: '#FFFBEB' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '16px',
            padding: '1.1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)'
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: bg,
              border: `1px solid ${color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Icon style={{ color, fontSize: '1.1rem' }} />
            </div>
            <div>
              <p style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0E0F0C', margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif" }}>{value}</p>
              <p style={{ fontSize: '0.72rem', color: '#6B7280', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{
        display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem',
        alignItems: 'center'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontSize: '0.9rem' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages or users..."
            className="admin-input"
            style={{ paddingLeft: '2.3rem' }}
          />
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.35rem', background: '#F3F4F6', borderRadius: 12, padding: '0.25rem', border: '1px solid #E5E7EB' }}>
          {['all', 'active', 'deleted'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? '#1E2538' : 'transparent',
                border: 'none',
                color: filter === f ? '#FFFFFF' : '#4B5563',
                borderRadius: 8, padding: '0.4rem 0.9rem',
                fontSize: '0.78rem', fontWeight: filter === f ? 700 : 500,
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
          className="admin-btn-secondary"
          style={{ padding: '0.55rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <FiRefreshCw style={{ fontSize: '0.85rem', animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>

        {/* Clear Recent 30 Chat */}
        <button
          onClick={async () => {
            if (!window.confirm('Delete the last 30 messages?')) return;
            try {
              const token = await currentUser.getIdToken();
              const res = await fetch(`${API}/chat/clear-recent?count=30`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
              });
              const data = await res.json();
              if (data.status === 'success') {
                toast.success(`Cleared ${data.clearedCount} recent messages`);
                fetchMessages();
              } else {
                toast.error('Failed to clear recent chat');
              }
            } catch (err) {
              console.error(err);
              toast.error('Failed to clear recent chat');
            }
          }}
          style={{
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: 10, padding: '0.55rem 1rem',
            color: '#D97706', cursor: 'pointer',
            fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
            transition: 'all 0.15s', fontWeight: 600
          }}
          title="Delete the last 30 messages (useful for spam)"
        >
          <FiTrash2 style={{ fontSize: '0.85rem' }} />
          Clear Last 30
        </button>

        {/* Clear All Chat — primary admin only */}
        {isPrimaryAdmin && (
          <button
            onClick={handleClearAll}
            style={{
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 10, padding: '0.55rem 1rem',
              color: '#DC2626', cursor: 'pointer',
              fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
              transition: 'all 0.15s', fontWeight: 600
            }}
            title="Delete all active messages (emergency spam clear)"
          >
            <FiTrash2 style={{ fontSize: '0.85rem' }} />
            Clear All Chat
          </button>
        )}

        {/* Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: 'auto' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
          <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>LIVE</span>
        </div>
      </div>

      {/* Messages Table */}
      <div className="admin-table-container">
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '44px 1fr 160px 130px 90px 64px',
          padding: '0.75rem 1.25rem',
          background: '#F9FAFB',
          borderBottom: '1px solid #E5E7EB',
          fontSize: '0.7rem', fontWeight: 700,
          color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em',
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
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6B7280' }}>
            <FiRefreshCw style={{ fontSize: '1.5rem', animation: 'spin 1s linear infinite', marginBottom: '0.75rem' }} />
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Loading messages...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6B7280' }}>
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
                padding: '0.85rem 1.25rem',
                borderBottom: '1px solid #F3F4F6',
                gap: '0.75rem', alignItems: 'center',
                opacity: msg.isDeleted ? 0.6 : 1,
                background: msg.isDeleted ? '#FEF2F2' : '#FFFFFF',
                transition: 'background 0.15s'
              }}
            >
              {/* Index */}
              <div style={{ fontSize: '0.75rem', color: '#9CA3AF', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                {idx + 1}
              </div>

              {/* Message */}
              <div style={{
                fontSize: '0.85rem', color: msg.isDeleted ? '#DC2626' : '#1F2937',
                fontStyle: msg.isDeleted ? 'italic' : 'normal',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {msg.isDeleted ? '[Message Deleted]' : msg.message}
              </div>

              {/* User */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', overflow: 'hidden',
                  background: '#F3F4F6', border: '1px solid #E5E7EB', flexShrink: 0
                }}>
                  <img
                    src={msg.user?.avatarUrl || '/avatars/avatar1.png'}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#0E0F0C', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {msg.user?.displayName || 'Unknown'}
                  </p>
                  {msg.user?.role && msg.user.role !== 'user' && (
                    <span style={{
                      fontSize: '0.65rem',
                      color: msg.user.role === 'admin' ? '#D97706' : '#2563EB',
                      textTransform: 'uppercase', fontWeight: 700
                    }}>
                      {msg.user.role}
                    </span>
                  )}
                </div>
              </div>

              {/* Sent At */}
              <div style={{ fontSize: '0.75rem', color: '#6B7280', fontVariantNumeric: 'tabular-nums' }}>
                {new Date(msg.createdAt).toLocaleString([], {
                  month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </div>

              {/* Status Badge */}
              <div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                  fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                  padding: '0.2rem 0.6rem', borderRadius: 100,
                  background: msg.isDeleted ? '#FEE2E2' : '#D1FAE5',
                  color: msg.isDeleted ? '#DC2626' : '#059669',
                  border: `1px solid ${msg.isDeleted ? '#FECACA' : '#A7F3D0'}`
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
                      width: 30, height: 30,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: '#FEF2F2',
                      border: '1px solid #FECACA',
                      borderRadius: 8, cursor: deletingId === msg._id ? 'wait' : 'pointer',
                      color: '#DC2626', transition: 'all 0.15s',
                      opacity: deletingId === msg._id ? 0.5 : 1
                    }}
                  >
                    <FiTrash2 style={{ fontSize: '0.85rem' }} />
                  </button>
                ) : (
                  <span style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>—</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer count */}
      {!loading && (
        <p style={{ textAlign: 'right', fontSize: '0.75rem', color: '#6B7280', marginTop: '0.6rem' }}>
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

