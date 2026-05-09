import { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/layout/Header';
import { FiSend, FiTrash2, FiUsers, FiMessageSquare, FiZap } from 'react-icons/fi';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = API.replace('/api', '');

/* ─── Helpers ────────────────────────────────── */
const getInitials = (name) => (name || '?').slice(0, 2).toUpperCase();
const getHue = (name) =>
  name ? [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360 : 210;

const AvatarCircle = ({ user, size = 36 }) => {
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
      userSelect: 'none', letterSpacing: '-0.5px'
    }}>
      {src
        ? <img src={src} alt={user?.displayName || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : getInitials(user?.displayName)}
    </div>
  );
};

const roleMeta = {
  admin:     { label: 'ADMIN', color: '#fbbf24' },
  moderator: { label: 'MOD',   color: '#38bdf8' },
};

/* ─── Message Bubble ─────────────────────────── */
const MessageBubble = ({ msg, isOwn, showHead, canModerate, onDelete, deletingId }) => {
  const [hov, setHov] = useState(false);
  const meta = roleMeta[msg.user?.role];
  const nameColor = meta?.color ?? (isOwn ? '#a5b4fc' : '#94a3b8');
  const isDeleting = deletingId === msg._id;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex',
        flexDirection: isOwn ? 'row-reverse' : 'row',
        gap: 10,
        marginTop: showHead ? 14 : 3,
        alignItems: 'flex-start',
        opacity: isDeleting ? 0.45 : 1,
        transition: 'opacity 0.2s'
      }}
    >
      {/* avatar slot — reserves width even when empty */}
      <div style={{ width: 36, flexShrink: 0, marginTop: 2 }}>
        {showHead && <AvatarCircle user={msg.user} size={36} />}
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: isOwn ? 'flex-end' : 'flex-start',
        maxWidth: '70%', gap: 3
      }}>
        {/* name row */}
        {showHead && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexDirection: isOwn ? 'row-reverse' : 'row' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: nameColor }}>
              {msg.user?.displayName || 'Unknown'}
            </span>
            {meta && (
              <span style={{
                fontSize: '0.6rem', fontWeight: 700, padding: '1px 5px',
                borderRadius: 4, background: `${meta.color}18`,
                color: meta.color, border: `1px solid ${meta.color}30`
              }}>{meta.label}</span>
            )}
            <span style={{ fontSize: '0.65rem', color: '#374151' }}>
              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}

        {/* bubble + delete */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexDirection: isOwn ? 'row' : 'row-reverse' }}>
          {canModerate && (
            <button
              onClick={() => onDelete(msg._id)}
              disabled={isDeleting}
              title="Delete message"
              style={{
                opacity: hov ? 1 : 0, transition: 'opacity 0.18s',
                padding: '3px 5px', borderRadius: 6,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                color: '#f87171', cursor: 'pointer',
                display: 'flex', alignItems: 'center', flexShrink: 0
              }}
            >
              <FiTrash2 style={{ fontSize: 11 }} />
            </button>
          )}
          <div style={{
            background: isOwn
              ? 'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.2))'
              : 'rgba(255,255,255,0.045)',
            border: isOwn ? '1px solid rgba(99,102,241,0.28)' : '1px solid rgba(255,255,255,0.06)',
            borderRadius: isOwn ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
            padding: '9px 13px',
            color: '#e2e8f0', fontSize: '0.9rem',
            lineHeight: 1.5, wordBreak: 'break-word'
          }}>
            {msg.message}
          </div>
        </div>

        {!showHead && hov && (
          <span style={{ fontSize: '0.62rem', color: '#374151' }}>
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
};

/* ─── Main Page ──────────────────────────────── */
const Chat = () => {
  const { mongoUser, currentUser, isAdmin } = useAuth();
  const isMod = mongoUser?.role === 'moderator';
  const canModerate = isAdmin || isMod;

  const [messages, setMessages]     = useState([]);
  const [newMsg, setNewMsg]         = useState('');
  const [socket, setSocket]         = useState(null);
  const [liveCount, setLiveCount]   = useState(0);
  const [deletingId, setDeletingId] = useState(null);
  const [loading, setLoading]       = useState(true);

  const endRef   = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  /* fetch history */
  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(`${API}/chat/history`);
        const data = await res.json();
        if (data.status === 'success') setMessages(data.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  /* socket */
  useEffect(() => {
    const sock = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    setSocket(sock);
    sock.on('newMessage',     (m)       => setMessages(p => [...p, m]));
    sock.on('messageDeleted', ({ _id }) => setMessages(p => p.filter(m => m._id !== _id)));
    sock.on('liveCount',      ({ count }) => setLiveCount(count));
    return () => sock.disconnect();
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages]);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 200); }, []);

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
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status !== 'success') toast.error(data.message || 'Delete failed');
    } catch { toast.error('Failed to delete'); }
    finally { setDeletingId(null); }
  };

  return (
    /*
      Fullscreen column: Header (66px) + chat body (remaining).
      overflow: hidden on root prevents ANY page-level scroll.
    */
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: '#080b14',
      fontFamily: "'Inter', system-ui, sans-serif"
    }}>
      {/* ambient glow */}
      <div className="ambient-bg" aria-hidden="true" />

      {/* ── Header ─────────────────────────────── */}
      <Header />

      {/* ── Chat shell (fills remaining height) ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>

        {/* ── Top bar ────────────────────────────── */}
        <div style={{
          padding: '0 20px',
          height: 54, minHeight: 54,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.02)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0
        }}>
          {/* title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FiMessageSquare style={{ color: '#6366f1', fontSize: 16 }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f1f5f9' }}>
              Live Chat
            </span>
            <span style={{
              fontSize: '0.62rem', background: 'rgba(16,185,129,0.12)',
              border: '1px solid rgba(16,185,129,0.25)',
              color: '#34d399', padding: '1px 7px', borderRadius: 100,
              fontWeight: 600, letterSpacing: '0.05em'
            }}>LIVE</span>
          </div>

          {/* online counter */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 99,
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.2)'
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#10b981', display: 'inline-block',
              boxShadow: '0 0 6px #10b981',
              animation: 'chatGlow 2s ease-in-out infinite'
            }} />
            <FiUsers style={{ color: '#10b981', fontSize: 12 }} />
            <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700 }}>{liveCount}</span>
            <span style={{ fontSize: '0.72rem', color: '#475569' }}>online</span>
          </div>
        </div>

        {/* ── Body row ─────────────────────────────── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

          {/* ── Online sidebar ──────────────────────── */}
          <aside style={{
            width: 210, flexShrink: 0,
            borderRight: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(255,255,255,0.015)',
            display: 'flex', flexDirection: 'column',
            overflowY: 'auto', padding: '14px 0'
          }} className="hidden lg:flex custom-scrollbar">
            <p style={{
              fontSize: '0.62rem', fontWeight: 700, color: '#374151',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              padding: '0 14px', marginBottom: 8
            }}>
              <FiUsers style={{ display: 'inline', marginRight: 4 }} />
              Online — {liveCount}
            </p>

            {/* you */}
            {mongoUser && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 14px', borderRadius: 8, margin: '0 6px 4px',
                background: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.15)'
              }}>
                <AvatarCircle user={mongoUser} size={26} />
                <div style={{ overflow: 'hidden' }}>
                  <p style={{ margin: 0, fontSize: '0.76rem', fontWeight: 600, color: '#c7d2fe', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {mongoUser.displayName}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.6rem', color: '#10b981' }}>You · Online</p>
                </div>
              </div>
            )}

            {/* recent active users */}
            {[...new Map(
              [...messages].reverse()
                .filter(m => m.user?._id !== mongoUser?._id)
                .map(m => [m.user?._id, m.user])
            ).values()].slice(0, 20).map(user => (
              <div key={user?._id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 14px', margin: '1px 0'
              }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <AvatarCircle user={user} size={26} />
                  <span style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#10b981', border: '2px solid #080b14'
                  }} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <p style={{
                    margin: 0, fontSize: '0.76rem', fontWeight: 500,
                    color: user?.role === 'admin' ? '#fbbf24' : user?.role === 'moderator' ? '#38bdf8' : '#94a3b8',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>
                    {user?.displayName || 'Unknown'}
                  </p>
                  {user?.role && user.role !== 'user' && (
                    <p style={{ margin: 0, fontSize: '0.58rem', color: roleMeta[user.role]?.color }}>
                      {roleMeta[user.role]?.label}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </aside>

          {/* ── Messages + Input column ──────────── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>

            {/* scrollable messages area — ONLY this scrolls */}
            <div
              style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '12px 18px 6px' }}
              className="custom-scrollbar"
            >
              {loading && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    border: '2px solid rgba(99,102,241,0.35)',
                    borderTopColor: '#6366f1',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                </div>
              )}

              {!loading && messages.length === 0 && (
                <div style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  height: '100%', gap: 10, paddingTop: '4rem'
                }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 14,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <FiMessageSquare style={{ fontSize: 24, color: '#334155' }} />
                  </div>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569' }}>
                    No messages yet — say hi 👋
                  </p>
                </div>
              )}

              {messages.map((msg, idx) => {
                const isOwn    = msg.user?._id === mongoUser?._id;
                const showHead = idx === 0 || messages[idx - 1]?.user?._id !== msg.user?._id;
                return (
                  <MessageBubble
                    key={msg._id || idx}
                    msg={msg}
                    isOwn={isOwn}
                    showHead={showHead}
                    canModerate={canModerate}
                    onDelete={deleteMessage}
                    deletingId={deletingId}
                  />
                );
              })}
              <div ref={endRef} />
            </div>

            {/* ── Input bar (fixed at bottom, no scroll) */}
            <div style={{
              padding: '10px 18px 14px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.015)',
              flexShrink: 0
            }}>
              {mongoUser ? (
                <form onSubmit={sendMessage} style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                  <AvatarCircle user={mongoUser} size={32} />

                  <div style={{ flex: 1, position: 'relative' }}>
                    <input
                      ref={inputRef}
                      type="text"
                      value={newMsg}
                      onChange={e => setNewMsg(e.target.value)}
                      placeholder="Type a message…"
                      maxLength={500}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.09)',
                        borderRadius: 11,
                        padding: '10px 48px 10px 14px',
                        color: '#f1f5f9', fontSize: '0.9rem',
                        outline: 'none', transition: 'border 0.15s',
                        caretColor: '#a5b4fc'
                      }}
                      onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; }}
                      onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; }}
                    />
                    {newMsg.length > 400 && (
                      <span style={{
                        position: 'absolute', right: 48, top: '50%', transform: 'translateY(-50%)',
                        fontSize: '0.63rem',
                        color: newMsg.length >= 500 ? '#ef4444' : '#64748b'
                      }}>
                        {500 - newMsg.length}
                      </span>
                    )}
                    <button
                      type="submit"
                      disabled={!newMsg.trim()}
                      style={{
                        position: 'absolute', right: 7, top: '50%',
                        transform: 'translateY(-50%)',
                        width: 32, height: 32, borderRadius: 8,
                        background: newMsg.trim()
                          ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                          : 'rgba(255,255,255,0.06)',
                        border: 'none',
                        cursor: newMsg.trim() ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', transition: 'all 0.18s',
                        boxShadow: newMsg.trim() ? '0 0 10px rgba(99,102,241,0.4)' : 'none'
                      }}
                    >
                      <FiSend style={{ fontSize: 13 }} />
                    </button>
                  </div>
                </form>
              ) : (
                <div style={{ textAlign: 'center', padding: '10px', color: '#475569', fontSize: '0.84rem' }}>
                  <FiZap style={{ display: 'inline', marginRight: 6, color: '#6366f1' }} />
                  Log in to join the conversation
                </div>
              )}

              {canModerate && (
                <p style={{ margin: '6px 0 0 41px', fontSize: '0.65rem', color: '#1e293b' }}>
                  Hover messages to moderate
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes chatGlow {
          0%,100% { opacity: 1; box-shadow: 0 0 6px #10b981; }
          50%      { opacity: 0.5; box-shadow: 0 0 2px #10b981; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Chat;
