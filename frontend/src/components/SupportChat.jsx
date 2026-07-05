import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FiSend, FiHeadphones, FiClock, FiCheckCircle, FiAlertCircle, FiLoader } from 'react-icons/fi';
import { FaCrown } from 'react-icons/fa';
import VipBadge from './VipBadge';
import { getLevelFromEarned, getLevelLabel, TIER_STYLES } from '../utils/vipLevels';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AvatarCircle = ({ user, size = 20 }) => {
  const photo = user?.avatarUrl || user?.photoURL || `/avatars/avatar1.png`;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'transparent',
      color: 'white', fontSize: size * 0.45, fontWeight: 'bold'
    }}>
      <img src={photo} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  );
};

const RoleSymbol = ({ user }) => {
  const role = user?.role || 'user';

  /* ── owner ── */
  if (role === 'owner') {
    const color = '#fbbf24';
    return (
      <SymbolWithHover
        icon={<FaCrown size={13} />}
        label="Owner"
        color={color}
      />
    );
  }

  if (role === 'admin') {
    const vipLevel = getLevelFromEarned(user?.totalEarned || 0);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <HoverBadge
          badge={
            <div style={{
              minWidth: '44px', height: '18px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(180deg, #FE7777 0%, #FC1E1E 100%)', color: '#ffffff',
              fontSize: '10px', fontWeight: 600,
              borderRadius: '59.47px', border: 'none',
              padding: '0 7.94px',
              gap: '2.63px',
              boxSizing: 'border-box',
              fontFamily: '"Barlow Condensed", sans-serif', letterSpacing: '0px'
            }}>Admin</div>
          }
          label="Admin"
          color="#ef4444"
        />
        {vipLevel && (
          <HoverBadge
            badge={<VipBadge tier={vipLevel.tier} rank={vipLevel.rank} size="xs" />}
            label={`VIP: ${getLevelLabel(vipLevel)}`}
            color={TIER_STYLES[vipLevel.tier]?.border || '#94a3b8'}
          />
        )}
      </div>
    );
  }

  /* ── moderator ── */
  if (role === 'moderator') {
    const color = '#38bdf8';
    return (
      <HoverBadge
        badge={
          <div style={{
            width: '49px', height: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(56,189,248,0.05)', color: '#38bdf8',
            fontSize: '11px', fontWeight: 600,
            borderRadius: '59.47px', border: '1px solid #38bdf8',
            fontFamily: '"Barlow Condensed", sans-serif', letterSpacing: '0px'
          }}>Mod</div>
        }
        label="Moderator"
        color={color}
      />
    );
  }

  /* ── regular user ── */
  const vipLevel = getLevelFromEarned(user?.totalEarned || 0);
  if (!vipLevel) return null;

  const tierStyle = TIER_STYLES[vipLevel.tier];
  const color = tierStyle?.border || '#94a3b8';
  return (
    <HoverBadge
      badge={<VipBadge tier={vipLevel.tier} rank={vipLevel.rank} size="xs" />}
      label={`VIP: ${getLevelLabel(vipLevel)}`}
      color={color}
    />
  );
};

const HoverBadge = ({ badge, label, color }) => {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'default' }}
    >
      {badge}
      {hover && (
        <div style={{
          position: 'absolute', bottom: '100%', left: '50%',
          transform: `translate(-50%, -8px)`,
          background: '#0b101e', border: `1px solid ${color}80`, color: '#f8fafc',
          padding: '5px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600,
          whiteSpace: 'nowrap', zIndex: 9999, boxShadow: `0 4px 15px ${color}40`,
          pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '4px'
        }}>
          {label}
          <div style={{
            position: 'absolute', top: '100%', left: `50%`,
            transform: 'translateX(-50%)',
            borderWidth: '5px', borderStyle: 'solid',
            borderColor: `${color}80 transparent transparent transparent`
          }} />
        </div>
      )}
    </div>
  );
};

const SymbolWithHover = ({ icon, label, color }) => {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'default' }}
    >
      <span style={{ color, display: 'inline-flex', alignItems: 'center' }}>{icon}</span>
      {hover && (
        <div style={{
          position: 'absolute', bottom: '100%', left: '50%',
          transform: `translate(-50%, -8px)`,
          background: '#0b101e', border: `1px solid ${color}80`, color: '#f8fafc',
          padding: '5px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600,
          whiteSpace: 'nowrap', zIndex: 9999, boxShadow: `0 4px 15px ${color}40`,
          pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '4px'
        }}>
          {label}
          <div style={{
            position: 'absolute', top: '100%', left: `50%`,
            transform: 'translateX(-50%)',
            borderWidth: '5px', borderStyle: 'solid',
            borderColor: `${color}80 transparent transparent transparent`
          }} />
        </div>
      )}
    </div>
  );
};

/* ─── MessageRow (matching Live Chat exactly) ─── */
const MessageRow = ({ msg, isOwn, mongoUser }) => {
  const senderUser = isOwn ? mongoUser : { displayName: 'Support Team', role: 'moderator' };

  return (
    <div
      style={{
        display: 'flex',
        marginBottom: 12,
        padding: '14px 12px',
        borderRadius: '12px',
        background: 'rgba(0, 0, 0, 0.36)',
        backdropFilter: 'blur(44px)',
        position: 'relative',
        gap: '8px',
        minHeight: '71px',
        boxSizing: 'border-box',
        flexShrink: 0
      }}
    >
      {/* ── Left Column: Avatar & Timestamp ── */}
      <div style={{ 
        width: '24px', height: '43px', 
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', 
        flexShrink: 0 
      }}>
        <AvatarCircle user={senderUser} size={24} />
        <span style={{ 
          fontFamily: '"Barlow Condensed", sans-serif',
          fontWeight: 600,
          fontSize: '10px',
          lineHeight: '130%',
          color: 'rgba(73, 178, 101, 1)',
          letterSpacing: '0px',
          whiteSpace: 'nowrap'
        }}>
          {(() => {
            const date = new Date(msg.createdAt);
            const today = new Date();
            const isToday = date.getDate() === today.getDate() &&
              date.getMonth() === today.getMonth() &&
              date.getFullYear() === today.getFullYear();
            return isToday
              ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
          })()}
        </span>
      </div>

      {/* ── Right Column: Username, Role & Message ── */}
      <div style={{ display: 'flex', flexDirection: 'column', width: '304px', minHeight: '43px', gap: '6px' }}>
        <div style={{ 
          width: '304px', height: '18px', 
          display: 'flex', alignItems: 'center', gap: '6px' 
        }}>
          <div style={{
            flex: 1, minWidth: 0, height: '13px',
            display: 'flex', alignItems: 'center',
            fontWeight: 600, color: 'rgba(255, 255, 255, 1)',
            fontFamily: '"Barlow Condensed", sans-serif', fontSize: '18px',
            lineHeight: '120%', letterSpacing: '0px',
            textAlign: 'left',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
          }}>
            {senderUser?.displayName || 'Unknown'}
          </div>

          {/* Role / VIP badge on Top Right */}
          <div style={{ display: 'flex', alignItems: 'center', minWidth: '95px', justifyContent: 'flex-end' }}>
            <RoleSymbol user={senderUser} />
          </div>
        </div>

        {/* Message text */}
        <div style={{ 
          width: '304px',
          color: 'rgba(136, 136, 136, 1)', 
          fontSize: '16px', 
          fontWeight: 500,
          lineHeight: '130%', 
          letterSpacing: '0px',
          wordBreak: 'break-word',
          fontFamily: '"Barlow Condensed", sans-serif'
        }}>
          {msg.text}
        </div>
      </div>
    </div>
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

  const isInitialScroll = useRef(true);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    endRef.current?.scrollIntoView({ behavior });
  }, []);

  // Fetch active ticket
  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }
    setLoading(true);
    const startTime = Date.now();
    (async () => {
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
      finally {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 400 - elapsed);
        setTimeout(() => setLoading(false), remaining);
      }
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

  useLayoutEffect(() => {
    if (messages.length === 0) return;
    if (isInitialScroll.current) {
      const snap = () => {
        endRef.current?.scrollIntoView({ behavior: 'auto' });
      };
      snap();
      requestAnimationFrame(snap);
      const t1 = setTimeout(snap, 30);
      const t2 = setTimeout(snap, 80);
      const t3 = setTimeout(() => {
        snap();
        isInitialScroll.current = false;
      }, 150);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    } else {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
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
      <div style={{
        width: 22, height: 22, borderRadius: '50%',
        border: '2px solid rgba(99,102,241,0.35)',
        borderTopColor: '#6366f1',
        animation: 'sidebarSpin 0.8s linear infinite'
      }} />
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

      {/* ── Messages Area ───────────────────────────────── */}
      <div
        style={{ flex: 1, overflowY: 'auto', padding: '12px 14px 6px', display: 'flex', flexDirection: 'column', gap: 0 }}
        className="custom-scrollbar"
      >
        {/* Empty state — no ticket yet */}
        {!ticket && messages.length === 0 && (
          <div style={{
            height: '100%', width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{
              width: '360px', height: '206px',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '16px'
            }}>
              <div style={{
                width: '88px', height: '88px', borderRadius: '10px',
                padding: '10px 12px 10px 12px',
                background: 'rgba(41, 253, 152, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxSizing: 'border-box'
              }}>
                <img src="/coins/headp.png" alt="Support" style={{ width: '44px', height: '44px' }} />
              </div>
              <div style={{ 
                width: '360px', height: '102px', 
                display: 'flex', flexDirection: 'column', 
                gap: '6px', textAlign: 'center'
              }}>
                <p style={{ 
                  margin: 0, width: '360px', height: '38px',
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontWeight: 700, fontSize: '32px',
                  lineHeight: '120%', color: '#f8fafc',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  Contact Support
                </p>
                <p style={{ 
                  margin: 0, width: '360px', height: '58px',
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontWeight: 500, fontSize: '22px',
                  lineHeight: '130%', color: '#64748b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  Send us a message below and our team will respond as soon as possible.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, idx) => {
          const isOwn = msg.sender === 'user';
          return (
            <MessageRow
              key={msg._id || idx}
              msg={msg}
              isOwn={isOwn}
              mongoUser={mongoUser}
            />
          );
        })}
        <div ref={endRef} />
      </div>

      {/* ── Input Bar ───────────────────────────────────── */}
      <div style={{
        padding: '12px 20px 20px',
        background: 'transparent',
        flexShrink: 0
      }}>
        <form onSubmit={sendMessage} style={{ display: 'flex', gap: 7, alignItems: 'flex-end' }}>
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
                width: '360px', height: '48px', boxSizing: 'border-box',
                background: 'transparent',
                border: '1px solid rgba(73, 178, 101, 1)',
                borderRadius: '10px', padding: '10px 40px 10px 20px',
                color: 'rgba(255, 255, 255, 1)', fontSize: '16px',
                fontWeight: 500, lineHeight: '100%',
                outline: 'none', transition: 'border 0.15s',
                caretColor: '#49B265',
                fontFamily: '"Barlow Condensed", sans-serif',
                letterSpacing: '0px',
                opacity: sending ? 0.6 : 1
              }}
              onFocus={e => { e.target.style.boxShadow = '0 0 0 1px rgba(73, 178, 101, 0.5)'; }}
              onBlur={e => { e.target.style.boxShadow = 'none'; }}
            />
            <button
              type="submit"
              disabled={!text.trim() || sending}
              style={{
                position: 'absolute', right: 12, top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                cursor: text.trim() && !sending ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: text.trim() && !sending ? '#49B265' : 'rgba(73, 178, 101, 0.5)',
                transition: 'all 0.18s'
              }}
            >
              <img 
                src="/coins/send.png" 
                alt="Send" 
                style={{ 
                  width: '24px', height: '24px',
                  opacity: text.trim() && !sending ? 1 : 0.5,
                  transition: 'opacity 0.18s'
                }} 
              />
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default SupportChat;
