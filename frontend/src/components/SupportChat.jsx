import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FiHeadphones } from 'react-icons/fi';
import { getLevelFromEarned } from '../utils/vipLevels';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const TIER_BADGES = {
  Bronze: {
    icon: '/coins/VIPbronze.png',
    pillBg: 'linear-gradient(180deg, #F3B60A -26.79%, #BE6708 158.93%)',
    borderColor: '#BE6708',
  },
  Silver: {
    icon: '/coins/VIPsilver.png',
    pillBg: 'linear-gradient(180deg, #D6D6D6 -26.79%, #929292 158.93%)',
    borderColor: '#929292',
  },
  Gold: {
    icon: '/coins/VIPgold.png',
    pillBg: 'linear-gradient(180deg, #FEDD72 -23.08%, #FCBA21 74.64%)',
    borderColor: '#FCBA21',
  },
  Platinum: {
    icon: '/coins/VIPplatinum.png',
    pillBg: 'linear-gradient(180deg, #1FC4DE 0%, #207985 100%)',
    borderColor: '#207985',
  },
  Diamond: {
    icon: '/coins/VIPdimond.png',
    pillBg: 'linear-gradient(180deg, #7E83F1 0%, #7941BB 100%)',
    borderColor: '#7941BB',
  },
  Opal: {
    icon: '/coins/VIPopel.png',
    pillBg: 'linear-gradient(180deg, #E92BFF 0%, #31BDFF 100%)',
    borderColor: '#E92BFF',
  },
};

const AvatarWithBadge = ({ user, isSupport = false, size = 33 }) => {
  const photo = isSupport ? '/coins/headp.png' : (user?.avatarUrl || user?.photoURL || '/avatars/avatar1.png');
  const vipLevel = getLevelFromEarned(user?.totalEarned || 0);
  const tierName = vipLevel?.tier || 'Bronze';
  const tierMeta = TIER_BADGES[tierName] || TIER_BADGES.Bronze;

  if (isSupport) {
    return (
      <div
        className="relative shrink-0 flex items-center justify-center"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          background: 'linear-gradient(180deg, #0284C7 0%, #0369A1 100%)',
          padding: '2px',
          boxSizing: 'border-box',
        }}
      >
        <div
          className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-white p-1"
          style={{ boxSizing: 'border-box' }}
        >
          <img
            src={photo}
            alt="Support"
            className="w-full h-full object-contain"
            onError={(e) => { e.currentTarget.src = '/avatars/avatar1.png'; }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative shrink-0 flex items-center justify-center"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: tierMeta.pillBg,
        padding: '2px',
        boxSizing: 'border-box',
        opacity: 1,
        transform: 'rotate(0deg)',
      }}
    >
      {/* Inner White Space Gap + Avatar Image */}
      <div
        className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-white"
        style={{
          padding: '1.5px',
          boxSizing: 'border-box',
        }}
      >
        <img
          src={photo}
          alt={user?.displayName || 'User'}
          className="w-full h-full rounded-full object-cover"
          onError={(e) => { e.currentTarget.src = '/avatars/avatar1.png'; }}
        />
      </div>

      {tierMeta?.icon && (
        <img
          src={tierMeta.icon}
          alt="VIP Tier"
          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 object-contain drop-shadow-sm pointer-events-none"
          style={{ width: '16px', height: '16px' }}
        />
      )}
    </div>
  );
};

const RoleBadges = ({ user, isSupport = false }) => {
  if (isSupport) {
    return (
      <div className="flex items-center gap-1.5 shrink-0">
        <span
          style={{
            background: 'linear-gradient(180deg, #0284C7 0%, #0369A1 100%)',
            color: '#FFFFFF',
            fontSize: '11px',
            fontWeight: 700,
            lineHeight: '100%',
            letterSpacing: '0%',
            borderRadius: '100px',
            padding: '4px 10px',
            fontFamily: '"Bricolage Grotesque", sans-serif',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 1,
            transform: 'rotate(0deg)',
          }}
        >
          Support
        </span>
      </div>
    );
  }

  const role = user?.role || 'user';
  const vipLevel = getLevelFromEarned(user?.totalEarned || 0);
  const tierName = vipLevel?.tier || 'Bronze';
  const tierMeta = TIER_BADGES[tierName] || TIER_BADGES.Bronze;
  const rankLabel = vipLevel ? (vipLevel.rank ? `${vipLevel.tier} ${vipLevel.rank}` : vipLevel.tier) : 'Bronze';

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {/* Admin badge */}
      {role === 'admin' && (
        <span
          style={{
            background: 'linear-gradient(180deg, #FF1E38 0%, #B80016 100%)',
            color: '#FFFFFF',
            fontSize: '11px',
            fontWeight: 700,
            lineHeight: '100%',
            letterSpacing: '0%',
            borderRadius: '100px',
            padding: '4px 10px',
            fontFamily: '"Bricolage Grotesque", sans-serif',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 1,
            transform: 'rotate(0deg)',
          }}
        >
          Admin
        </span>
      )}

      {/* Moderator badge */}
      {role === 'moderator' && (
        <span
          style={{
            background: 'linear-gradient(180deg, #0284C7 0%, #0369A1 100%)',
            color: '#FFFFFF',
            fontSize: '11px',
            fontWeight: 700,
            lineHeight: '100%',
            letterSpacing: '0%',
            borderRadius: '100px',
            padding: '4px 10px',
            fontFamily: '"Bricolage Grotesque", sans-serif',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 1,
            transform: 'rotate(0deg)',
          }}
        >
          Mod
        </span>
      )}

      {/* VIP Tier Badge */}
      <span
        style={{
          background: tierMeta.pillBg,
          color: '#FFFFFF',
          fontSize: '11px',
          fontWeight: 700,
          lineHeight: '100%',
          letterSpacing: '0%',
          borderRadius: '100px',
          padding: '4px 10px',
          fontFamily: '"Bricolage Grotesque", sans-serif',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 1,
          transform: 'rotate(0deg)',
        }}
      >
        {rankLabel}
      </span>
    </div>
  );
};

/* ─── MessageRow (matching Live Chat exactly) ─── */
const MessageRow = ({ msg, isOwn, mongoUser }) => {
  const isSupport = !isOwn;
  const senderUser = isOwn ? mongoUser : { displayName: 'Support Team', role: 'moderator' };

  const date = new Date(msg.createdAt || Date.now());
  const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const displayName = isSupport
    ? 'Support Team'
    : (senderUser?.displayName || senderUser?.username || (senderUser?.email ? senderUser.email.split('@')[0] : '') || 'Ahad');

  return (
    <div className="relative flex flex-col w-full pb-3.5 mb-3.5 border-b border-[#EFEFEF] transition-opacity">
      {/* Top Row: Avatar + Name/Date on left, Badges on right */}
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Avatar with mini tier badge (33x33) */}
          <div className="shrink-0">
            <AvatarWithBadge user={senderUser} isSupport={isSupport} size={33} />
          </div>

          {/* Name and Date Column */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              minWidth: 0,
              opacity: 1,
              transform: 'rotate(0deg)',
            }}
          >
            <span
              style={{
                fontFamily: '"Bricolage Grotesque", sans-serif',
                fontWeight: 700,
                fontSize: '18px',
                lineHeight: '100%',
                letterSpacing: '0%',
                color: '#000000',
                textAlign: 'left',
                opacity: 1,
                transform: 'rotate(0deg)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {displayName}
            </span>
            <span
              style={{
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 500,
                fontSize: '12px',
                lineHeight: '18px',
                letterSpacing: '0%',
                color: 'rgba(14, 15, 12, 0.7)',
                opacity: 1,
                transform: 'rotate(0deg)',
              }}
            >
              {formattedDate}
            </span>
          </div>
        </div>

        {/* Badges on right */}
        <RoleBadges user={senderUser} isSupport={isSupport} />
      </div>

      {/* Bottom Message Text (Starts directly below image/avatar, full width) */}
      <p
        style={{
          fontFamily: '"Poppins", sans-serif',
          fontWeight: 400,
          fontSize: '13px',
          lineHeight: '20px',
          letterSpacing: '0%',
          color: '#18181B',
          margin: 0,
          marginTop: '8px',
          wordBreak: 'break-word',
          width: '100%',
          opacity: 1,
          transform: 'rotate(0deg)',
        }}
      >
        {msg.text || msg.message}
      </p>
    </div>
  );
};

const SupportChat = ({ socket }) => {
  const { mongoUser, currentUser } = useAuth();
  const [ticket, setTicket]       = useState(null);
  const [messages, setMessages]   = useState([]);
  const [text, setText]           = useState('');
  const [loading, setLoading]     = useState(true);
  const [sending, setSending]     = useState(false);
  const [resetKey, setResetKey]   = useState(0);
  const endRef  = useRef(null);
  const inputRef = useRef(null);

  const isInitialScroll = useRef(true);

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
          setTicket(data.data.ticket);
          setMessages(data.data.ticket.messages || []);
        }
        setText('');
      }
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  // ── Loading ──
  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          border: '2.5px solid #24324D',
          borderTopColor: 'transparent',
          animation: 'supportSpin 0.8s linear infinite',
        }}
      />
    </div>
  );

  // ── Not logged in ──
  if (!mongoUser) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
      <FiHeadphones size={36} className="text-gray-400" />
      <p
        style={{
          fontFamily: '"Poppins", sans-serif',
          fontSize: '14px',
          fontWeight: 500,
          color: '#71717A',
          margin: 0,
        }}
      >
        Log in to contact support
      </p>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {/* ── Messages Area ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px 6px',
          display: 'flex',
          flexDirection: 'column',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        className="no-scrollbar"
      >
        {/* Empty state — no ticket yet */}
        {!ticket && messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center py-8">
            <div className="flex flex-col items-center justify-center text-center gap-4 max-w-[300px]">
              {/* Headset Icon Container */}
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '20px',
                  background: 'rgba(213, 248, 216, 0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src="/coins/headp.png"
                  alt="Support"
                  style={{ width: '42px', height: '42px', objectFit: 'contain' }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>

              <div className="flex flex-col gap-1.5 text-center">
                <h3
                  style={{
                    margin: 0,
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: '24px',
                    lineHeight: '120%',
                    color: '#000000',
                  }}
                >
                  Contact Support
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 400,
                    fontSize: '13px',
                    lineHeight: '20px',
                    color: 'rgba(14, 15, 12, 0.7)',
                  }}
                >
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

      {/* ── Input Bar (matches Live Chat exactly) ── */}
      <div className="p-4 pt-2 shrink-0">
        <form onSubmit={sendMessage}>
          <div
            style={{
              width: '100%',
              maxWidth: '338px',
              height: '49px',
              borderRadius: '50px',
              background: 'rgba(239, 239, 239, 1)',
              padding: '4px 6px 4px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxSizing: 'border-box',
              gap: '8px',
              margin: '0 auto',
              opacity: 1,
              transform: 'rotate(0deg)',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={ticket ? 'Reply to support...' : 'Describe your issue...'}
              maxLength={2000}
              disabled={sending}
              style={{
                flex: 1,
                minWidth: 0,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 400,
                fontSize: '13px',
                lineHeight: '26px',
                letterSpacing: '0%',
                color: 'rgba(0, 0, 0, 1)',
              }}
              className="placeholder:text-black/70"
            />

            <button
              type="submit"
              disabled={!text.trim() || sending}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(36, 50, 77, 1)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: text.trim() && !sending ? 'pointer' : 'default',
                opacity: text.trim() && !sending ? 1 : 0.8,
                transition: 'transform 0.15s, opacity 0.15s',
                flexShrink: 0,
                transform: 'rotate(0deg)',
              }}
              className="hover:opacity-90 active:scale-95"
            >
              <img
                src="/coins/ChatSend.png"
                alt="Send"
                style={{
                  width: '18px',
                  height: '18px',
                  objectFit: 'contain',
                  display: 'block',
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        .no-scrollbar {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
        @keyframes supportSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SupportChat;
