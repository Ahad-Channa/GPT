import { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { useAuth } from '../../contexts/AuthContext';
import SupportChat from '../SupportChat';
import {
  FiX, FiSend, FiTrash2, FiUsers,
  FiMessageSquare, FiHeadphones, FiZap
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const API        = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = API.replace('/api', '');

/* ─── tiny helpers ──────────────────────────────────────── */
const getInitials = (n) => (n || '?').slice(0, 2).toUpperCase();
const getHue      = (n) => n ? [...n].reduce((a, c) => a + c.charCodeAt(0), 0) % 360 : 210;

const AvatarCircle = ({ user, size = 30 }) => {
  const src = user?.avatarUrl;
  const hue = getHue(user?.displayName);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
      background: src ? 'transparent' : `hsl(${hue},50%,26%)`,
      border: '2px solid rgba(255,255,255,0.1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, color: 'rgba(255,255,255,0.8)', userSelect: 'none'
    }}>
      {src
        ? <img src={src} alt={user?.displayName || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : getInitials(user?.displayName)}
    </div>
  );
};

const roleMeta = {
  admin:     { label: 'ADMIN', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  moderator: { label: 'MOD',   color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
};

const RoleBadge = ({ role }) => {
  const m = roleMeta[role];
  if (!m) return null;
  return (
    <span style={{
      fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.06em',
      padding: '1px 4px', borderRadius: 4,
      background: m.bg, color: m.color, marginLeft: 3,
      border: `1px solid ${m.color}30`
    }}>{m.label}</span>
  );
};

/* ─── message row ───────────────────────────────────────── */
const MessageRow = ({ msg, isOwn, showAvatar, canModerate, onDelete, deletingId }) => {
  const [hov, setHov] = useState(false);
  const meta      = roleMeta[msg.user?.role];
  const nameColor = meta?.color ?? (isOwn ? '#a5b4fc' : '#94a3b8');
  const isDeleting = deletingId === msg._id;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', flexDirection: isOwn ? 'row-reverse' : 'row',
        gap: 8, marginTop: showAvatar ? 12 : 2, alignItems: 'flex-start',
        opacity: isDeleting ? 0.45 : 1, transition: 'opacity 0.2s'
      }}
    >
      <div style={{ width: 28, flexShrink: 0, marginTop: 1 }}>
        {showAvatar ? <AvatarCircle user={msg.user} size={28} /> : <span style={{ display: 'block', width: 28 }} />}
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: isOwn ? 'flex-end' : 'flex-start',
        maxWidth: '78%', gap: 2
      }}>
        {showAvatar && (
          <div style={{ display: 'flex', alignItems: 'center', flexDirection: isOwn ? 'row-reverse' : 'row', gap: 4 }}>
            <span style={{ fontSize: '0.73rem', fontWeight: 700, color: nameColor }}>
              {msg.user?.displayName || 'Unknown'}
            </span>
            <RoleBadge role={msg.user?.role} />
            <span style={{ fontSize: '0.62rem', color: '#334155' }}>
              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexDirection: isOwn ? 'row' : 'row-reverse' }}>
          {canModerate && (
            <button
              onClick={() => onDelete(msg._id)}
              disabled={isDeleting}
              title="Delete"
              style={{
                opacity: hov ? 1 : 0, transition: 'opacity 0.18s',
                padding: '2px 4px', borderRadius: 5,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0
              }}
            >
              <FiTrash2 style={{ fontSize: 10 }} />
            </button>
          )}
          <div style={{
            background: isOwn
              ? 'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.2))'
              : 'rgba(255,255,255,0.045)',
            border: isOwn ? '1px solid rgba(99,102,241,0.28)' : '1px solid rgba(255,255,255,0.06)',
            borderRadius: isOwn ? '12px 3px 12px 12px' : '3px 12px 12px 12px',
            padding: '7px 11px', color: '#e2e8f0', fontSize: '0.84rem',
            lineHeight: 1.45, wordBreak: 'break-word'
          }}>
            {msg.message}
          </div>
        </div>

        {!showAvatar && hov && (
          <span style={{ fontSize: '0.6rem', color: '#334155' }}>
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
};

/* ─── main sidebar component ────────────────────────────── */
const ChatSidebar = ({ isOpen, onClose }) => {
  const { mongoUser, currentUser, isAdmin } = useAuth();
  const isMod       = mongoUser?.role === 'moderator';
  const canModerate = isAdmin || isMod;

  const [activeTab,  setActiveTab]  = useState('chat');   // 'chat' | 'support'
  const [messages,   setMessages]   = useState([]);
  const [newMsg,     setNewMsg]     = useState('');
  const [socket,     setSocket]     = useState(null);
  const [liveCount,  setLiveCount]  = useState(0);
  const [deletingId, setDeletingId] = useState(null);
  const [loading,    setLoading]    = useState(true);

  const endRef   = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  /* fetch history when first opened */
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const res  = await fetch(`${API}/chat/history`);
        const data = await res.json();
        if (data.status === 'success') setMessages(data.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [isOpen]);

  /* socket */
  useEffect(() => {
    if (!isOpen) return;
    const sock = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    setSocket(sock);
    sock.on('newMessage',     (m)       => setMessages(p => [...p, m]));
    sock.on('messageDeleted', ({ _id }) => setMessages(p => p.filter(m => m._id !== _id)));
    sock.on('liveCount',      ({ count }) => setLiveCount(count));
    return () => sock.disconnect();
  }, [isOpen]);

  useEffect(() => { scrollToBottom(); }, [messages]);
  useEffect(() => {
    if (isOpen && activeTab === 'chat') setTimeout(() => inputRef.current?.focus(), 350);
  }, [isOpen, activeTab]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !socket || !mongoUser) return;
    socket.emit('sendMessage', { userId: mongoUser._id, message: newMsg.trim() });
    setNewMsg('');
  };

  const deleteMessage = async (id) => {
    if (!canModerate || !currentUser) return;
    setDeletingId(id);
    try {
      const token = await currentUser.getIdToken();
      const res   = await fetch(`${API}/chat/messages/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status !== 'success') toast.error(data.message || 'Delete failed');
    } catch { toast.error('Failed to delete message'); }
    finally { setDeletingId(null); }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.55)',
              zIndex: 40, backdropFilter: 'blur(3px)'
            }}
            className="lg:hidden"
          />

          {/* ── Sidebar panel ───────────────────────── */}
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 240 }}
            style={{
              position: 'fixed', right: 0, top: 0, height: '100%',
              width: 360, maxWidth: '92vw',
              background: 'linear-gradient(180deg,#090d1a 0%,#080b17 100%)',
              borderLeft: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '-8px 0 40px rgba(0,0,0,0.65)',
              zIndex: 50, display: 'flex', flexDirection: 'column',
              fontFamily: "'Inter', system-ui, sans-serif"
            }}
          >
            {/* ── Header ─────────────────────────────── */}
            <div style={{
              padding: '0 16px',
              height: 60, minHeight: 60,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.025)',
              flexShrink: 0
            }}>
              {/* Left: online count */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 9,
                  background: 'linear-gradient(135deg,rgba(99,102,241,0.28),rgba(139,92,246,0.18))',
                  border: '1px solid rgba(99,102,241,0.32)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <FiUsers style={{ color: '#a5b4fc', fontSize: 14 }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>
                      {liveCount}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>online</span>
                    {/* live dot */}
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: '#10b981', display: 'inline-block',
                      boxShadow: '0 0 5px #10b981',
                      animation: 'sidebarPulse 2s ease-in-out infinite'
                    }} />
                  </div>
                  <span style={{ fontSize: '0.65rem', color: '#475569' }}>Public Chat Room</span>
                </div>
              </div>

              {/* Right: tab switcher + close */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Tab pills */}
                <div style={{
                  display: 'flex', gap: 3,
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 9, padding: '3px'
                }}>
                  {[
                    { key: 'chat',    icon: FiMessageSquare, title: 'Public Chat' },
                    { key: 'support', icon: FiHeadphones,    title: 'Support' }
                  ].map(({ key, icon: Icon, title }) => {
                    const active = activeTab === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        title={title}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 30, height: 30, borderRadius: 7, border: 'none', cursor: 'pointer',
                          background: active ? 'rgba(99,102,241,0.3)' : 'transparent',
                          color: active ? '#a5b4fc' : '#475569',
                          transition: 'all 0.18s',
                          boxShadow: active ? 'inset 0 0 0 1px rgba(99,102,241,0.4)' : 'none'
                        }}
                        onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#94a3b8'; }}
                        onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#475569'; }}
                      >
                        <Icon style={{ fontSize: 14 }} />
                      </button>
                    );
                  })}
                </div>

                {/* Close */}
                <button
                  onClick={onClose}
                  style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#64748b', cursor: 'pointer', transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#f1f5f9'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                >
                  <FiX style={{ fontSize: 14 }} />
                </button>
              </div>
            </div>

            {/* ── Tab label strip ─────────────────────── */}
            <div style={{
              padding: '6px 16px',
              background: 'rgba(255,255,255,0.015)',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0
            }}>
              {activeTab === 'chat' ? (
                <>
                  <FiMessageSquare style={{ color: '#6366f1', fontSize: 12 }} />
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8' }}>
                    Global Chat
                  </span>
                </>
              ) : (
                <>
                  <FiHeadphones style={{ color: '#6366f1', fontSize: 12 }} />
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8' }}>
                    Support Chat
                  </span>
                </>
              )}
            </div>

            {/* ── Body ────────────────────────────────── */}
            {activeTab === 'support' ? (
              <SupportChat socket={socket} />
            ) : (
              <>
                {/* Messages */}
                <div
                  style={{ flex: 1, overflowY: 'auto', padding: '12px 14px 6px', display: 'flex', flexDirection: 'column', gap: 0 }}
                  className="custom-scrollbar"
                >
                  {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '3rem' }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        border: '2px solid rgba(99,102,241,0.35)',
                        borderTopColor: '#6366f1',
                        animation: 'sidebarSpin 0.8s linear infinite'
                      }} />
                    </div>
                  ) : messages.length === 0 ? (
                    <div style={{
                      flex: 1, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      gap: 10, color: '#334155', paddingTop: '3rem'
                    }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: 13,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <FiMessageSquare style={{ fontSize: 20, color: '#334155' }} />
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569' }}>
                        No messages yet — say hi! 👋
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isOwn      = msg.user?._id === mongoUser?._id;
                      const showAvatar = idx === 0 || messages[idx - 1]?.user?._id !== msg.user?._id;
                      return (
                        <MessageRow
                          key={msg._id || idx}
                          msg={msg}
                          isOwn={isOwn}
                          showAvatar={showAvatar}
                          canModerate={canModerate}
                          onDelete={deleteMessage}
                          deletingId={deletingId}
                        />
                      );
                    })
                  )}
                  <div ref={endRef} />
                </div>

                {/* char counter */}
                {newMsg.length > 400 && (
                  <div style={{ padding: '3px 16px 0', display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '0.62rem', color: newMsg.length >= 500 ? '#ef4444' : '#64748b' }}>
                      {500 - newMsg.length} left
                    </span>
                  </div>
                )}

                {/* Input */}
                <div style={{
                  padding: '9px 12px 14px',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.015)',
                  flexShrink: 0
                }}>
                  {mongoUser ? (
                    <form onSubmit={sendMessage} style={{ display: 'flex', gap: 7, alignItems: 'flex-end' }}>
                      <div style={{ paddingBottom: 2, flexShrink: 0 }}>
                        <AvatarCircle user={mongoUser} size={28} />
                      </div>
                      <div style={{ flex: 1, position: 'relative' }}>
                        <input
                          ref={inputRef}
                          type="text"
                          value={newMsg}
                          onChange={e => setNewMsg(e.target.value)}
                          placeholder="Message everyone…"
                          maxLength={500}
                          style={{
                            width: '100%', boxSizing: 'border-box',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.09)',
                            borderRadius: 11, padding: '9px 40px 9px 12px',
                            color: '#f1f5f9', fontSize: '0.85rem',
                            outline: 'none', transition: 'border 0.15s',
                            caretColor: '#a5b4fc'
                          }}
                          onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; }}
                          onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; }}
                        />
                        <button
                          type="submit"
                          disabled={!newMsg.trim()}
                          style={{
                            position: 'absolute', right: 5, top: '50%',
                            transform: 'translateY(-50%)',
                            width: 28, height: 28, borderRadius: 7,
                            background: newMsg.trim()
                              ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                              : 'rgba(255,255,255,0.07)',
                            border: 'none',
                            cursor: newMsg.trim() ? 'pointer' : 'default',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', transition: 'all 0.18s'
                          }}
                        >
                          <FiSend style={{ fontSize: 12 }} />
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p style={{ textAlign: 'center', fontSize: '0.78rem', color: '#475569', margin: 0, padding: '6px 0' }}>
                      <FiZap style={{ display: 'inline', marginRight: 5, color: '#6366f1' }} />
                      Log in to join the conversation
                    </p>
                  )}
                  {canModerate && (
                    <p style={{ margin: '5px 0 0 35px', fontSize: '0.62rem', color: '#1e293b' }}>
                      Hover messages to moderate
                    </p>
                  )}
                </div>
              </>
            )}
          </motion.div>

          <style>{`
            @keyframes sidebarPulse {
              0%, 100% { opacity: 1; box-shadow: 0 0 5px #10b981; }
              50%       { opacity: 0.5; box-shadow: 0 0 2px #10b981; }
            }
            @keyframes sidebarSpin {
              from { transform: rotate(0deg); }
              to   { transform: rotate(360deg); }
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChatSidebar;
