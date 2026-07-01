import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { useAuth } from '../../contexts/AuthContext';
import { FiX, FiSend, FiMessageSquare, FiTrash2, FiUsers, FiSmile } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import VipBadge from '../VipBadge';
import { getLevelFromEarned } from '../../utils/vipLevels';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = API.replace('/api', '');

/* ─── helpers ─────────────────────────────── */
const getAvatar = (user) => user?.avatarUrl || null;

const AvatarCircle = ({ user, size = 32 }) => {
  const src = getAvatar(user);
  const initials = (user?.displayName || '?').slice(0, 2).toUpperCase();
  const hue = user?.displayName
    ? [...user.displayName].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
    : 200;

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      overflow: 'hidden', flexShrink: 0,
      background: src ? 'transparent' : `hsl(${hue},55%,28%)`,
      border: '2px solid rgba(255,255,255,0.1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, color: 'rgba(255,255,255,0.8)'
    }}>
      {src
        ? <img src={src} alt={user?.displayName || 'User'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initials}
    </div>
  );
};

const roleMeta = {
  admin:     { label: 'ADMIN', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  moderator: { label: 'MOD',   color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
};

const RoleBadge = ({ role }) => {
  const meta = roleMeta[role];
  if (!meta) return null;
  return (
    <span style={{
      fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.06em',
      padding: '1px 5px', borderRadius: 4,
      background: meta.bg, color: meta.color, marginLeft: 4,
      border: `1px solid ${meta.color}30`
    }}>
      {meta.label}
    </span>
  );
};

/* ─── main component ─────────────────────── */
const LiveChat = ({ isOpen, onClose }) => {
  const { mongoUser, currentUser, isAdmin } = useAuth();
  const isMod = mongoUser?.role === 'moderator';
  const canModerate = isAdmin || isMod;

  const [messages, setMessages]   = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket]       = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [liveCount, setLiveCount] = useState(0);
  const [isTyping, setIsTyping]   = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  const scrollToBottom = useCallback((instant = false) => {
    messagesEndRef.current?.scrollIntoView({ behavior: instant === true ? 'auto' : 'smooth' });
  }, []);

  /* fetch history */
  useEffect(() => {
    if (!isOpen) return;
    const fetchHistory = async () => {
      try {
        const res  = await fetch(`${API}/chat/history`);
        const data = await res.json();
        if (data.status === 'success') {
          setMessages(data.data);
          setTimeout(() => scrollToBottom(true), 120);
        }
      } catch (err) { console.error('Chat history fetch error:', err); }
    };
    if (messages.length === 0) fetchHistory();
  }, [isOpen]);

  /* socket */
  useEffect(() => {
    if (!isOpen) return;
    const sock = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    setSocket(sock);

    sock.on('newMessage',    (msg) => setMessages((p) => [...p, msg]));
    sock.on('messageDeleted', ({ _id }) => setMessages((p) => p.filter((m) => m._id !== _id)));
    sock.on('liveCount',     ({ count }) => setLiveCount(count));

    return () => sock.disconnect();
  }, [isOpen]);

  /* scroll on new msg */
  useEffect(() => { scrollToBottom(); }, [messages]);

  /* focus input & scroll to bottom when opens synchronously */
  useLayoutEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 350);
    }
  }, [isOpen]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !mongoUser) return;
    socket.emit('sendMessage', { userId: mongoUser._id, message: newMessage.trim() });
    setNewMessage('');
  };

  const handleDelete = async (msgId) => {
    if (!canModerate || !currentUser) return;
    setDeletingId(msgId);
    try {
      const token = await currentUser.getIdToken();
      const res  = await fetch(`${API}/chat/messages/${msgId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status !== 'success') toast.error(data.message || 'Delete failed');
    } catch { toast.error('Failed to delete message'); }
    finally { setDeletingId(null); }
  };

  /* ── render ───────────────────────────── */
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* mobile backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40, backdropFilter: 'blur(4px)' }}
            className="lg:hidden"
          />

          {/* ── Panel ───────────────────────── */}
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            style={{
              position: 'fixed', right: 0, top: 0, height: '100%',
              width: 360, maxWidth: '92vw',
              background: 'linear-gradient(180deg, #090d1a 0%, #080b17 100%)',
              borderLeft: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '-8px 0 40px rgba(0,0,0,0.6)',
              zIndex: 50, display: 'flex', flexDirection: 'column',
              fontFamily: "'Barlow', system-ui, sans-serif"
            }}
          >

            {/* ─── Header ────────────────────── */}
            <div style={{
              padding: '0 20px',
              height: 64, minHeight: 64,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.025)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.2))',
                  border: '1px solid rgba(99,102,241,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <FiMessageSquare style={{ color: '#a5b4fc', fontSize: 16 }} />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f1f5f9' }}>
                      Global Chat
                    </span>
                    {/* live dot */}
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: '#10b981', display: 'inline-block',
                      boxShadow: '0 0 6px #10b981',
                      animation: 'chatPulse 2s ease-in-out infinite'
                    }} />
                  </div>
                  {/* live count */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                    <FiUsers style={{ color: '#10b981', fontSize: 10 }} />
                    <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>
                      {liveCount} online
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem' }}>·</span>
                    <span style={{ fontSize: '0.7rem', color: '#475569' }}>Public Room</span>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                style={{
                  width: 32, height: 32, borderRadius: 9,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#64748b', cursor: 'pointer', transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#f1f5f9'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              >
                <FiX style={{ fontSize: 15 }} />
              </button>
            </div>

            {/* ─── Messages ──────────────────── */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '16px 16px 8px',
              display: 'flex', flexDirection: 'column', gap: 2
            }} className="custom-scrollbar">

              {messages.length === 0 && (
                <div style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 10, color: '#334155'
                }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <FiMessageSquare style={{ fontSize: 22, color: '#334155' }} />
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569' }}>No messages yet — say hi! 👋</p>
                </div>
              )}

              {messages.map((msg, idx) => {
                const isOwn     = msg.user?._id === mongoUser?._id;
                const isDeleting = deletingId === msg._id;
                const showAvatar = idx === 0 || messages[idx - 1]?.user?._id !== msg.user?._id;

                return (
                  <MessageRow
                    key={msg._id || idx}
                    msg={msg}
                    isOwn={isOwn}
                    isDeleting={isDeleting}
                    showAvatar={showAvatar}
                    canModerate={canModerate}
                    onDelete={handleDelete}
                    idx={idx}
                  />
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* ─── Divider with char counter ─── */}
            <div style={{
              padding: '6px 20px 0',
              display: 'flex', justifyContent: 'flex-end'
            }}>
              {newMessage.length > 400 && (
                <span style={{ fontSize: '0.65rem', color: newMessage.length >= 500 ? '#ef4444' : '#94a3b8' }}>
                  {500 - newMessage.length} left
                </span>
              )}
            </div>

            {/* ─── Input ─────────────────────── */}
            <div style={{
              padding: '10px 14px 16px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.015)'
            }}>
              {mongoUser ? (
                <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  {/* my avatar preview */}
                  <div style={{ paddingBottom: 2, flexShrink: 0 }}>
                    <AvatarCircle user={mongoUser} size={30} />
                  </div>

                  <div style={{ flex: 1, position: 'relative' }}>
                    <input
                      ref={inputRef}
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Message everyone…"
                      maxLength={500}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.09)',
                        borderRadius: 12,
                        padding: '10px 44px 10px 14px',
                        color: '#f1f5f9', fontSize: '0.875rem',
                        outline: 'none', transition: 'border 0.15s',
                        caretColor: '#a5b4fc'
                      }}
                      onFocus={(e) => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; }}
                      onBlur={(e)  => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; }}
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      style={{
                        position: 'absolute', right: 6, top: '50%',
                        transform: 'translateY(-50%)',
                        width: 30, height: 30,
                        borderRadius: 8,
                        background: newMessage.trim() ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.07)',
                        border: 'none', cursor: newMessage.trim() ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.18s', color: 'white'
                      }}
                    >
                      <FiSend style={{ fontSize: 13 }} />
                    </button>
                  </div>
                </form>
              ) : (
                <p style={{
                  textAlign: 'center', fontSize: '0.8rem',
                  color: '#475569', margin: 0, padding: '8px 0'
                }}>
                  Log in to send messages
                </p>
              )}
            </div>
          </motion.div>

          <style>{`
            @keyframes chatPulse {
              0%, 100% { opacity: 1; box-shadow: 0 0 6px #10b981; }
              50%       { opacity: 0.5; box-shadow: 0 0 2px #10b981; }
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
};

/* ─── MessageRow (extracted for cleanliness) ─── */
const MessageRow = ({ msg, isOwn, isDeleting, showAvatar, canModerate, onDelete, idx }) => {
  const [hovered, setHovered] = useState(false);

  const nameColor = msg.user?.role === 'admin'     ? '#fbbf24'
                  : msg.user?.role === 'moderator' ? '#38bdf8'
                  : isOwn                          ? '#a5b4fc'
                  : '#94a3b8';

  const bubbleBg   = isOwn
    ? 'linear-gradient(135deg, rgba(99,102,241,0.28), rgba(139,92,246,0.18))'
    : 'rgba(255,255,255,0.04)';
  const bubbleBorder = isOwn ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.06)';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: isOwn ? 'row-reverse' : 'row',
        gap: 9,
        marginTop: showAvatar ? 12 : 2,
        alignItems: 'flex-start',
        opacity: isDeleting ? 0.5 : 1,
        transition: 'opacity 0.2s'
      }}
    >
      {/* Avatar — only show for first in a group */}
      <div style={{ width: 32, flexShrink: 0, marginTop: 1 }}>
        {showAvatar ? (
          <AvatarCircle user={msg.user} size={32} />
        ) : (
          <span style={{ display: 'block', width: 32 }} />
        )}
      </div>

      {/* Content */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: isOwn ? 'flex-end' : 'flex-start',
        maxWidth: '76%', gap: 2
      }}>
        {/* Name row — only for first in group */}
        {showAvatar && (
          <div style={{
            display: 'flex', alignItems: 'center',
            flexDirection: isOwn ? 'row-reverse' : 'row',
            gap: 5
          }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: nameColor }}>
              {msg.user?.displayName || 'Unknown'}
            </span>
            <RoleBadge role={msg.user?.role} />
            {(() => {
                const vipLevel = getLevelFromEarned(msg.user?.totalEarned || 0);
                return vipLevel ? (
                  <VipBadge
                    tier={vipLevel.tier}
                    rank={vipLevel.rank}
                    size="xs"
                  />
                ) : null;
              })()}
            <span style={{ fontSize: '0.65rem', color: '#334155' }}>
              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}

        {/* Bubble row */}
        <div style={{
          display: 'flex', alignItems: 'center',
          gap: 5,
          flexDirection: isOwn ? 'row' : 'row-reverse'
        }}>
          {/* delete btn */}
          {canModerate && (
            <button
              onClick={() => onDelete(msg._id)}
              disabled={isDeleting}
              style={{
                opacity: hovered ? 1 : 0,
                transition: 'opacity 0.18s',
                padding: '3px 5px', borderRadius: 6,
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#f87171', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}
              title="Delete message"
            >
              <FiTrash2 style={{ fontSize: 11 }} />
            </button>
          )}

          {/* bubble */}
          <div style={{
            background: bubbleBg,
            border: bubbleBorder,
            borderRadius: isOwn ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
            padding: '8px 12px',
            color: '#e2e8f0',
            fontSize: '0.875rem',
            lineHeight: 1.45,
            wordBreak: 'break-word',
            maxWidth: '100%'
          }}>
            {msg.message}
          </div>
        </div>

        {/* timestamp if group continuation */}
        {!showAvatar && hovered && (
          <span style={{ fontSize: '0.62rem', color: '#334155' }}>
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
};

export default LiveChat;
