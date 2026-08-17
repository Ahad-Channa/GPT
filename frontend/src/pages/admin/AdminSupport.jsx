import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  FiHeadphones, FiSend, FiClock, FiCheckCircle,
  FiAlertCircle, FiRefreshCw, FiUser
} from 'react-icons/fi';
import io from 'socket.io-client';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = API.replace(/\/api\/?$/, '');

const getInitials = (name) => (name || '?').slice(0, 2).toUpperCase();
const getHue = (name) => name ? [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360 : 210;

const AvatarCircle = ({ user, size = 34 }) => {
  const src = user?.avatarUrl;
  const hue = getHue(user?.displayName);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
      background: src ? 'transparent' : `hsl(${hue},50%,26%)`,
      border: '2px solid rgba(255,255,255,0.09)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, color: 'rgba(255,255,255,0.75)', userSelect: 'none'
    }}>
      {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(user?.displayName)}
    </div>
  );
};

const STATUS_META = {
  open:         { label: 'Open',        color: '#6366f1', bg: 'rgba(99,102,241,0.12)',   icon: FiAlertCircle },
  'in-progress':{ label: 'In Progress', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: FiClock },
  closed:       { label: 'Closed',      color: '#64748b', bg: 'rgba(100,116,139,0.12)', icon: FiCheckCircle }
};

const StatusBadge = ({ status }) => {
  const s = STATUS_META[status] || STATUS_META.open;
  const Icon = s.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px',
      borderRadius: 100, background: s.bg, color: s.color, border: `1px solid ${s.color}30`
    }}>
      <Icon style={{ fontSize: 10 }} /> {s.label}
    </span>
  );
};

const FILTER_TABS = [
  { key: 'all',         label: 'All' },
  { key: 'unread',      label: 'Unread' },
  { key: 'open',        label: 'Open' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'closed',      label: 'Closed' }
];

const AdminSupport = () => {
  const { currentUser, mongoUser } = useAuth();
  const [tickets, setTickets]       = useState([]);
  const [filter, setFilter]         = useState('all');
  const [selected, setSelected]     = useState(null);
  const [reply, setReply]           = useState('');
  const [sending, setSending]       = useState(false);
  const [loadingList, setLoadingList]= useState(true);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [counts, setCounts]         = useState({});
  const [socket, setSocket]         = useState(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  // socket setup
  useEffect(() => {
    const sock = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    sock.emit('joinAdminSupport');
    setSocket(sock);
    sock.on('supportTicketUpdate', (update) => {
      setTickets(prev => {
        const idx = prev.findIndex(t => t._id === update.ticketId);
        if (idx === -1) {
          fetchTickets();
          return prev;
        }
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          status: update.status,
          unreadByAdmin: update.unreadByAdmin,
          updatedAt: update.updatedAt,
          _lastMsg: update.lastMessage
        };
        return copy;
      });
      fetchCounts();
    });
    sock.on('supportMessage', ({ ticketId, message }) => {
      setSelected(prev => {
        if (!prev || prev._id !== ticketId) return prev;
        return { ...prev, messages: [...(prev.messages || []), message] };
      });
    });
    return () => sock.disconnect();
  }, []);

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [selected?.messages]);

  const getToken = useCallback(async () => {
    if (!currentUser) return null;
    return currentUser.getIdToken();
  }, [currentUser]);

  const fetchTickets = useCallback(async () => {
    setLoadingList(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/support/tickets?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success') setTickets(data.data);
    } catch (e) { console.error(e); }
    finally { setLoadingList(false); }
  }, [filter, getToken]);

  const fetchCounts = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/support/tickets/counts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success') setCounts(data.data);
    } catch (e) { console.error(e); }
  }, [getToken]);

  useEffect(() => { fetchTickets(); }, [filter]);
  useEffect(() => { fetchCounts(); }, []);

  const openTicket = async (ticket) => {
    setLoadingTicket(true);
    setSelected(null);
    // Join socket room for this ticket
    if (socket) {
      if (selected) socket.emit('leaveSupportRoom', { ticketId: selected._id });
      socket.emit('joinSupportRoom', { ticketId: ticket._id });
    }
    try {
      const token = await getToken();
      const res = await fetch(`${API}/support/tickets/${ticket._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setSelected(data.data);
        // Mark as read in list
        setTickets(prev => prev.map(t => t._id === ticket._id ? { ...t, unreadByAdmin: false } : t));
        fetchCounts();
      }
    } catch (e) { console.error(e); }
    finally { setLoadingTicket(false); setTimeout(() => inputRef.current?.focus(), 200); }
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim() || !selected || sending) return;
    setSending(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/support/tickets/${selected._id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: reply.trim() })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setSelected(data.data.ticket);
        setReply('');
        fetchCounts();
      }
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  const changeStatus = async (status) => {
    if (!selected) return;
    try {
      const token = await getToken();
      await fetch(`${API}/support/tickets/${selected._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      setSelected(prev => ({ ...prev, status }));
      setTickets(prev => prev.map(t => t._id === selected._id ? { ...t, status } : t));
      fetchCounts();
    } catch (e) { console.error(e); }
  };

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div style={{
      display: 'flex', height: '100%', overflow: 'hidden',
      fontFamily: "'Barlow', system-ui, sans-serif",
      gap: 0
    }}>

      {/* ── LEFT: Ticket List ─────────────────────────────────── */}
      <div style={{
        width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.015)'
      }}>
        {/* Header */}
        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiHeadphones style={{ color: '#6366f1', fontSize: 16 }} />
              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#f1f5f9' }}>Support</span>
              {counts.unread > 0 && (
                <span style={{
                  fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px', borderRadius: 100,
                  background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)'
                }}>{counts.unread}</span>
              )}
            </div>
            <button onClick={fetchTickets} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 4
            }}>
              <FiRefreshCw style={{ fontSize: 13 }} />
            </button>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {FILTER_TABS.map(tab => {
              const cnt = tab.key === 'all' ? null
                : tab.key === 'unread' ? counts.unread
                : tab.key === 'open' ? counts.open
                : tab.key === 'in-progress' ? counts.inProgress
                : counts.closed;
              const active = filter === tab.key;
              return (
                <button key={tab.key} onClick={() => setFilter(tab.key)} style={{
                  fontSize: '0.68rem', fontWeight: active ? 700 : 500,
                  padding: '3px 9px', borderRadius: 99, cursor: 'pointer',
                  background: active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                  color: active ? '#a5b4fc' : '#64748b',
                  border: active ? '1px solid rgba(99,102,241,0.35)' : '1px solid rgba(255,255,255,0.06)',
                  transition: 'all 0.15s'
                }}>
                  {tab.label}{cnt > 0 ? ` · ${cnt}` : ''}
                </button>
              );
            })}
          </div>
        </div>

        {/* Ticket list */}
        <div style={{ flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
          {loadingList ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : tickets.length === 0 ? (
            <div style={{ padding: '2rem 16px', textAlign: 'center', color: '#374151', fontSize: '0.82rem' }}>
              No tickets found
            </div>
          ) : tickets.map(t => (
            <div
              key={t._id}
              onClick={() => openTicket(t)}
              style={{
                padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: selected?._id === t._id
                  ? 'rgba(99,102,241,0.08)'
                  : t.unreadByAdmin ? 'rgba(99,102,241,0.04)' : 'transparent',
                transition: 'background 0.15s',
                position: 'relative'
              }}
            >
              {t.unreadByAdmin && (
                <span style={{
                  position: 'absolute', top: 14, right: 14,
                  width: 7, height: 7, borderRadius: '50%',
                  background: '#6366f1', boxShadow: '0 0 8px rgba(99,102,241,0.6)'
                }} />
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
                <AvatarCircle user={t.userId} size={30} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.userId?.displayName || 'Unknown'}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.65rem', color: '#374151' }}>
                    #{String(t._id).slice(-6).toUpperCase()} · {timeAgo(t.updatedAt)}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <StatusBadge status={t.status} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT: Conversation ───────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        {!selected && !loadingTicket && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div style={{ width: 60, height: 60, borderRadius: 16, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiHeadphones style={{ fontSize: 24, color: '#6366f1' }} />
            </div>
            <p style={{ margin: 0, color: '#374151', fontSize: '0.88rem' }}>Select a ticket to view the conversation</p>
          </div>
        )}

        {loadingTicket && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}

        {selected && !loadingTicket && (
          <>
            {/* Ticket top bar */}
            <div style={{
              padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.02)',
              display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0
            }}>
              <AvatarCircle user={selected.userId} size={32} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#f1f5f9' }}>
                  {selected.userId?.displayName || 'Unknown'}
                </p>
                <p style={{ margin: 0, fontSize: '0.68rem', color: '#475569' }}>
                  {selected.userId?.email} · Ticket #{String(selected._id).slice(-6).toUpperCase()}
                </p>
              </div>
              <StatusBadge status={selected.status} />

              {/* Status change buttons */}
              <div style={{ display: 'flex', gap: 6 }}>
                {selected.status !== 'open' && (
                  <button onClick={() => changeStatus('open')} style={statusBtnStyle('#6366f1')}>
                    Reopen
                  </button>
                )}
                {selected.status === 'open' && (
                  <button onClick={() => changeStatus('in-progress')} style={statusBtnStyle('#f59e0b')}>
                    Mark In Progress
                  </button>
                )}
                {selected.status !== 'closed' && (
                  <button onClick={() => changeStatus('closed')} style={statusBtnStyle('#10b981')}>
                    Close Ticket
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 8px' }} className="custom-scrollbar">
              {(selected.messages || []).map((msg, idx) => {
                const isAdmin = msg.sender === 'admin';
                const showHead = idx === 0 || (selected.messages)[idx - 1]?.sender !== msg.sender;
                return (
                  <div key={msg._id || idx} style={{
                    display: 'flex',
                    flexDirection: isAdmin ? 'row-reverse' : 'row',
                    gap: 10, marginTop: showHead ? 16 : 4, alignItems: 'flex-end'
                  }}>
                    <div style={{ width: 32, flexShrink: 0 }}>
                      {showHead && (
                        isAdmin
                          ? <AvatarCircle user={mongoUser} size={32} />
                          : <AvatarCircle user={selected.userId} size={32} />
                      )}
                    </div>
                    <div style={{
                      display: 'flex', flexDirection: 'column',
                      alignItems: isAdmin ? 'flex-end' : 'flex-start',
                      maxWidth: '72%', gap: 2
                    }}>
                      {showHead && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 600,
                          color: isAdmin ? '#a5b4fc' : '#94a3b8', marginBottom: 2 }}>
                          {isAdmin ? `${mongoUser?.displayName} (Support)` : selected.userId?.displayName}
                        </span>
                      )}
                      <div style={{
                        background: isAdmin
                          ? 'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.2))'
                          : 'rgba(255,255,255,0.05)',
                        border: isAdmin ? '1px solid rgba(99,102,241,0.28)' : '1px solid rgba(255,255,255,0.07)',
                        borderRadius: isAdmin ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                        padding: '9px 13px', color: '#e2e8f0', fontSize: '0.88rem',
                        lineHeight: 1.5, wordBreak: 'break-word'
                      }}>
                        {msg.text}
                      </div>
                      <span style={{ fontSize: '0.62rem', color: '#1e293b', marginTop: 1 }}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            {/* Reply bar */}
            {selected.status !== 'closed' ? (
              <div style={{ padding: '10px 18px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)', flexShrink: 0 }}>
                <form onSubmit={sendReply} style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                  <AvatarCircle user={mongoUser} size={32} />
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input
                      ref={inputRef}
                      type="text"
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      placeholder="Reply to user…"
                      disabled={sending}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.09)',
                        borderRadius: 11, padding: '10px 48px 10px 14px',
                        color: '#f1f5f9', fontSize: '0.9rem', outline: 'none',
                        caretColor: '#a5b4fc', opacity: sending ? 0.6 : 1
                      }}
                      onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; }}
                      onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; }}
                    />
                    <button type="submit" disabled={!reply.trim() || sending} style={{
                      position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)',
                      width: 32, height: 32, borderRadius: 8,
                      background: reply.trim() && !sending ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.06)',
                      border: 'none', cursor: reply.trim() && !sending ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                    }}>
                      <FiSend style={{ fontSize: 13 }} />
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center', color: '#374151', fontSize: '0.82rem' }}>
                This ticket is closed. The user can open a new ticket by sending another message.
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const statusBtnStyle = (color) => ({
  fontSize: '0.68rem', fontWeight: 600, padding: '4px 10px', borderRadius: 8,
  background: `${color}15`, color, border: `1px solid ${color}30`,
  cursor: 'pointer', transition: 'all 0.15s'
});

export default AdminSupport;
