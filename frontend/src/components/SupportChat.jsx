import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FiSend, FiHeadphones, FiClock, FiCheckCircle, FiAlertCircle, FiLoader } from 'react-icons/fi';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getInitials = (name) => (name || '?').slice(0, 2).toUpperCase();
const getHue = (name) => name ? [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360 : 210;

const AvatarCircle = ({ user, size = 34 }) => {
  const src = user?.avatarUrl;
  const hue = getHue(user?.displayName);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      overflow: 'hidden', flexShrink: 0,
      background: src ? 'transparent' : `hsl(${hue},50%,26%)`,
      border: '2px solid rgba(255,255,255,0.09)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, color: 'rgba(255,255,255,0.75)',
      userSelect: 'none'
    }}>
      {src
        ? <img src={src} alt={user?.displayName || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : getInitials(user?.displayName)}
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const map = {
    open:        { label: 'Open',        color: '#6366f1', bg: 'rgba(99,102,241,0.12)',   icon: FiAlertCircle },
    'in-progress':{ label: 'In Progress', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: FiClock },
    closed:      { label: 'Closed',      color: '#64748b', bg: 'rgba(100,116,139,0.12)', icon: FiCheckCircle }
  };
  const s = map[status] || map.open;
  const Icon = s.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px',
      borderRadius: 100, background: s.bg, color: s.color,
      border: `1px solid ${s.color}30`
    }}>
      <Icon style={{ fontSize: 10 }} />
      {s.label}
    </span>
  );
};

const SupportChat = ({ socket }) => {
  const { mongoUser, currentUser } = useAuth();
  const [ticket, setTicket]       = useState(null);   // null = no active ticket
  const [messages, setMessages]   = useState([]);
  const [text, setText]           = useState('');
  const [loading, setLoading]     = useState(true);
  const [sending, setSending]     = useState(false);
  const [resetKey, setResetKey]   = useState(0);      // force re-fetch on reset
  const endRef  = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Fetch active ticket
  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const token = await currentUser.getIdToken();
        const res   = await fetch(`${API}/support/my-ticket`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.status === 'success' && data.data) {
          setTicket(data.data);
          setMessages(data.data.messages || []);
        } else {
          setTicket(null);
          setMessages([]);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [currentUser, resetKey]);

  // Socket: join room + listen for messages / close events
  useEffect(() => {
    if (!socket || !ticket) return;

    socket.emit('joinSupportRoom', { ticketId: ticket._id });

    const onMsg = ({ ticketId, message }) => {
      if (ticketId !== ticket._id) return;
      setMessages(prev => [...prev, message]);
    };

    const onClosed = ({ ticketId }) => {
      if (ticketId !== ticket._id) return;
      // Reset user side → next message will create new ticket
      setTicket(null);
      setMessages([]);
      setResetKey(k => k + 1);
    };

    socket.on('supportMessage', onMsg);
    socket.on('ticketClosed', onClosed);

    return () => {
      socket.emit('leaveSupportRoom', { ticketId: ticket._id });
      socket.off('supportMessage', onMsg);
      socket.off('ticketClosed', onClosed);
    };
  }, [socket, ticket]);

  useEffect(() => { scrollToBottom(); }, [messages]);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 150); }, [ticket]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending || !currentUser) return;
    setSending(true);
    try {
      const token = await currentUser.getIdToken();
      const res   = await fetch(`${API}/support/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: text.trim() })
      });
      const data = await res.json();
      if (data.status === 'success') {
        if (!ticket) {
          // First message created the ticket — set it + join room
          setTicket(data.data.ticket);
          setMessages(data.data.ticket.messages || []);
        }
        // The socket event will add the message, but if it's the first ticket
        // we need to set messages manually (socket room join happens after ticket is known)
        setText('');
      }
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  // ── Closed state ──────────────────────────────────────────────────────────
  // (not shown here — handled by resetting ticket to null)

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <FiLoader style={{ fontSize: 22, color: '#6366f1', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  // ── Not logged in ─────────────────────────────────────────────────────────
  if (!mongoUser) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 }}>
      <FiHeadphones style={{ fontSize: 36, color: '#334155' }} />
      <p style={{ color: '#475569', fontSize: '0.88rem', margin: 0 }}>Log in to contact support</p>
    </div>
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>

      {/* ── Ticket Header ───────────────────────────────── */}
      {ticket && (
        <div style={{
          padding: '10px 20px',
          background: 'rgba(255,255,255,0.02)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0
        }}>
          <FiHeadphones style={{ color: '#6366f1', fontSize: 14 }} />
          <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 500 }}>
            Ticket #{String(ticket._id).slice(-6).toUpperCase()}
          </span>
          <StatusBadge status={ticket.status} />
          <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#374151' }}>
            {new Date(ticket.createdAt).toLocaleDateString()}
          </span>
        </div>
      )}

      {/* ── Messages Area ───────────────────────────────── */}
      <div
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px 20px 8px' }}
        className="custom-scrollbar"
      >
        {/* Empty state — no ticket yet */}
        {!ticket && messages.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            height: '100%', gap: 14, paddingTop: '3rem'
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18,
              background: 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.1))',
              border: '1px solid rgba(99,102,241,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <FiHeadphones style={{ fontSize: 26, color: '#6366f1' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 6px', fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9' }}>
                Contact Support
              </p>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', maxWidth: 260 }}>
                Send us a message below and our team will respond as soon as possible.
              </p>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, idx) => {
          const isOwn = msg.sender === 'user';
          const showHead = idx === 0 || messages[idx - 1]?.sender !== msg.sender;
          const senderUser = isOwn ? mongoUser : { displayName: 'Support', avatarUrl: null };

          return (
            <div key={msg._id || idx} style={{
              display: 'flex',
              flexDirection: isOwn ? 'row-reverse' : 'row',
              gap: 10,
              marginTop: showHead ? 16 : 4,
              alignItems: 'flex-end'
            }}>
              <div style={{ width: 32, flexShrink: 0 }}>
                {showHead && <AvatarCircle user={senderUser} size={32} />}
              </div>
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: isOwn ? 'flex-end' : 'flex-start',
                maxWidth: '72%', gap: 2
              }}>
                {showHead && (
                  <span style={{ fontSize: '0.7rem', fontWeight: 600,
                    color: isOwn ? '#a5b4fc' : '#34d399', marginBottom: 2 }}>
                    {isOwn ? mongoUser?.displayName : 'Support Team'}
                  </span>
                )}
                <div style={{
                  background: isOwn
                    ? 'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.2))'
                    : 'rgba(255,255,255,0.05)',
                  border: isOwn ? '1px solid rgba(99,102,241,0.28)' : '1px solid rgba(255,255,255,0.07)',
                  borderRadius: isOwn ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                  padding: '9px 13px',
                  color: '#e2e8f0', fontSize: '0.88rem', lineHeight: 1.5,
                  wordBreak: 'break-word'
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

      {/* ── Input Bar ───────────────────────────────────── */}
      <div style={{
        padding: '10px 18px 14px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.015)',
        flexShrink: 0
      }}>
        <form onSubmit={sendMessage} style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
          <AvatarCircle user={mongoUser} size={32} />
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={ticket ? 'Reply to support…' : 'Describe your issue…'}
              maxLength={2000}
              disabled={sending}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 11,
                padding: '10px 48px 10px 14px',
                color: '#f1f5f9', fontSize: '0.9rem',
                outline: 'none', transition: 'border 0.15s',
                caretColor: '#a5b4fc',
                opacity: sending ? 0.6 : 1
              }}
              onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; }}
              onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; }}
            />
            <button
              type="submit"
              disabled={!text.trim() || sending}
              style={{
                position: 'absolute', right: 7, top: '50%',
                transform: 'translateY(-50%)',
                width: 32, height: 32, borderRadius: 8,
                background: text.trim() && !sending
                  ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                  : 'rgba(255,255,255,0.06)',
                border: 'none',
                cursor: text.trim() && !sending ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', transition: 'all 0.18s'
              }}
            >
              <FiSend style={{ fontSize: 13 }} />
            </button>
          </div>
        </form>
        <p style={{ margin: '6px 0 0 41px', fontSize: '0.65rem', color: '#1e293b' }}>
          Our team typically responds within a few hours
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default SupportChat;
