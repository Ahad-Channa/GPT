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
      background: src ? 'transparent' : `hsl(${hue}, 45%, 90%)`,
      border: '1px solid #E5E7EB',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, color: src ? 'inherit' : `hsl(${hue}, 60%, 30%)`, userSelect: 'none'
    }}>
      {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(user?.displayName)}
    </div>
  );
};

const STATUS_META = {
  open:         { label: 'Open',        color: '#2563EB', bg: '#EFF6FF', border: '#DBEAFE', icon: FiAlertCircle },
  'in-progress':{ label: 'In Progress', color: '#D97706', bg: '#FFFBEB', border: '#FEF3C7', icon: FiClock },
  closed:       { label: 'Closed',      color: '#4B5563', bg: '#F3F4F6', border: '#E5E7EB', icon: FiCheckCircle }
};

const StatusBadge = ({ status }) => {
  const s = STATUS_META[status] || STATUS_META.open;
  const Icon = s.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px',
      borderRadius: 100, background: s.bg, color: s.color, border: `1px solid ${s.border}`
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
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', minHeight: '600px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FiHeadphones style={{ color: '#1E2538', fontSize: '1.25rem' }} />
            Support Center
          </h1>
          <p className="admin-page-sub">Live chat with users and manage support inquiries.</p>
        </div>
      </div>

      {/* Main Split-Pane Card */}
      <div className="admin-card" style={{
        flex: 1, display: 'flex', padding: 0, overflow: 'hidden',
        border: '1px solid #E5E7EB', background: '#FFFFFF'
      }}>

        {/* ── LEFT: Ticket List ─────────────────────────────────── */}
        <div style={{
          width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column',
          borderRight: '1px solid #E5E7EB',
          background: '#FAFAFA'
        }}>
          {/* Header */}
          <div style={{ padding: '16px', borderBottom: '1px solid #E5E7EB', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827', fontFamily: "'Bricolage Grotesque', sans-serif" }}>Inboxes</span>
                {counts.unread > 0 && (
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: 100,
                    background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2'
                  }}>{counts.unread} new</span>
                )}
              </div>
              <button onClick={fetchTickets} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4, display: 'flex', alignItems: 'center'
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
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`filter-pill ${active ? 'active' : ''}`}
                    style={{ fontSize: '0.72rem', padding: '3px 9px' }}
                  >
                    {tab.label}{cnt > 0 ? ` · ${cnt}` : ''}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ticket list */}
          <div style={{ flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
            {loadingList ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2.5rem 0' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid #E5E7EB', borderTopColor: '#1E2538', animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : tickets.length === 0 ? (
              <div style={{ padding: '2.5rem 16px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.85rem' }}>
                No tickets found
              </div>
            ) : tickets.map(t => {
              const isSel = selected?._id === t._id;
              return (
                <div
                  key={t._id}
                  onClick={() => openTicket(t)}
                  style={{
                    padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #F3F4F6',
                    background: isSel ? '#FFFFFF' : t.unreadByAdmin ? '#F0F9FF' : 'transparent',
                    borderLeft: isSel ? '3px solid #1E2538' : '3px solid transparent',
                    boxShadow: isSel ? '0 1px 3px rgba(0,0,0,0.03)' : 'none',
                    transition: 'all 0.15s',
                    position: 'relative'
                  }}
                >
                  {t.unreadByAdmin && (
                    <span style={{
                      position: 'absolute', top: 14, right: 14,
                      width: 8, height: 8, borderRadius: '50%',
                      background: '#DC2626'
                    }} />
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <AvatarCircle user={t.userId} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.userId?.displayName || 'Unknown'}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: '#6B7280' }}>
                        #{String(t._id).slice(-6).toUpperCase()} · {timeAgo(t.updatedAt)}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <StatusBadge status={t.status} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT: Conversation ───────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, background: '#FFFFFF' }}>
          {!selected && !loadingTicket && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: '#F3F4F6', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiHeadphones style={{ fontSize: 26, color: '#6B7280' }} />
              </div>
              <p style={{ margin: 0, color: '#6B7280', fontSize: '0.9rem', fontWeight: 500 }}>Select a ticket to view the conversation</p>
            </div>
          )}

          {loadingTicket && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', border: '2px solid #E5E7EB', borderTopColor: '#1E2538', animation: 'spin 0.8s linear infinite' }} />
            </div>
          )}

          {selected && !loadingTicket && (
            <>
              {/* Ticket top bar */}
              <div style={{
                padding: '14px 20px', borderBottom: '1px solid #E5E7EB',
                background: '#FAFAFA',
                display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0
              }}>
                <AvatarCircle user={selected.userId} size={36} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#111827', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                    {selected.userId?.displayName || 'Unknown'}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#6B7280' }}>
                    {selected.userId?.email} · Ticket #{String(selected._id).slice(-6).toUpperCase()}
                  </p>
                </div>
                <StatusBadge status={selected.status} />

                {/* Status change buttons */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {selected.status !== 'open' && (
                    <button onClick={() => changeStatus('open')} style={statusBtnStyle('#2563EB', '#EFF6FF', '#DBEAFE')}>
                      Reopen
                    </button>
                  )}
                  {selected.status === 'open' && (
                    <button onClick={() => changeStatus('in-progress')} style={statusBtnStyle('#D97706', '#FFFBEB', '#FEF3C7')}>
                      Mark In Progress
                    </button>
                  )}
                  {selected.status !== 'closed' && (
                    <button onClick={() => changeStatus('closed')} style={statusBtnStyle('#059669', '#ECFDF5', '#D1FAE5')}>
                      Close Ticket
                    </button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 12px', background: '#FFFFFF' }} className="custom-scrollbar">
                {(selected.messages || []).map((msg, idx) => {
                  const isAdmin = msg.sender === 'admin';
                  const showHead = idx === 0 || (selected.messages)[idx - 1]?.sender !== msg.sender;
                  return (
                    <div key={msg._id || idx} style={{
                      display: 'flex',
                      flexDirection: isAdmin ? 'row-reverse' : 'row',
                      gap: 10, marginTop: showHead ? 16 : 6, alignItems: 'flex-end'
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
                          <span style={{ fontSize: '0.72rem', fontWeight: 600,
                            color: '#6B7280', marginBottom: 2 }}>
                            {isAdmin ? `${mongoUser?.displayName || 'Admin'} (Support)` : selected.userId?.displayName}
                          </span>
                        )}
                        <div style={{
                          background: isAdmin ? '#1E2538' : '#F3F4F6',
                          color: isAdmin ? '#FFFFFF' : '#111827',
                          border: isAdmin ? '1px solid #1E2538' : '1px solid #E5E7EB',
                          borderRadius: isAdmin ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                          padding: '10px 14px', fontSize: '0.88rem',
                          lineHeight: 1.5, wordBreak: 'break-word',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                        }}>
                          {msg.text}
                        </div>
                        <span style={{ fontSize: '0.65rem', color: '#9CA3AF', marginTop: 1 }}>
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
                <div style={{ padding: '12px 20px 16px', borderTop: '1px solid #E5E7EB', background: '#FAFAFA', flexShrink: 0 }}>
                  <form onSubmit={sendReply} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <AvatarCircle user={mongoUser} size={34} />
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input
                        ref={inputRef}
                        type="text"
                        value={reply}
                        onChange={e => setReply(e.target.value)}
                        placeholder="Reply to user…"
                        disabled={sending}
                        className="admin-input"
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          paddingRight: '48px', marginBottom: 0,
                          opacity: sending ? 0.6 : 1
                        }}
                      />
                      <button type="submit" disabled={!reply.trim() || sending} style={{
                        position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                        width: 34, height: 34, borderRadius: 8,
                        background: reply.trim() && !sending ? '#1E2538' : '#E5E7EB',
                        border: 'none', cursor: reply.trim() && !sending ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: reply.trim() && !sending ? '#FFFFFF' : '#9CA3AF',
                        transition: 'all 0.15s'
                      }}>
                        <FiSend style={{ fontSize: 14 }} />
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div style={{ padding: '14px 20px', borderTop: '1px solid #E5E7EB', textAlign: 'center', color: '#6B7280', fontSize: '0.82rem', background: '#F9FAFB' }}>
                  This ticket is closed. The user can open a new ticket by sending another message.
                </div>
              )}
            </>
          )}
        </div>

      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const statusBtnStyle = (color, bg, border) => ({
  fontSize: '0.72rem', fontWeight: 600, padding: '4px 11px', borderRadius: 8,
  background: bg, color: color, border: `1px solid ${border}`,
  cursor: 'pointer', transition: 'all 0.15s'
});

export default AdminSupport;

