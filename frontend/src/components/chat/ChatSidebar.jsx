import { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { useAuth } from '../../contexts/AuthContext';
import SupportChat from '../SupportChat';
import {
  FiX, FiSend, FiTrash2, FiUsers,
  FiMessageSquare, FiHeadphones, FiZap,
  FiShield
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = API.replace('/api', '');

import { useNavigate } from 'react-router-dom';
import { FaCrown } from 'react-icons/fa';
import PublicProfileModal from '../PublicProfileModal';
import VipBadge from '../VipBadge';
import { getLevelFromEarned, getLevelLabel, TIER_STYLES } from '../../utils/vipLevels';

const getInitials = (name) => (name || '?').slice(0, 2).toUpperCase();
const getHue = (name) => name ? [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360 : 210;

const AvatarCircle = ({ user, size = 20 }) => {
  const dName = user?.displayName || 'Unknown';
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
  const [hover, setHover] = useState(false);

  /* ── owner ── */
  if (role === 'owner') {
    const color = '#fbbf24';
    return (
      <div
        onMouseEnter={() => {}}
        onMouseLeave={() => {}}
        style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'default' }}
      >
        <SymbolWithHover
          icon={<FaCrown size={13} />}
          label="Owner"
          color={color}
          shift={0}
        />
      </div>
    );
  }

  /* ── admin: Admin badge AND VIP badge separately ── */
  if (role === 'admin') {
    const vipLevel = getLevelFromEarned(user?.totalEarned || 0);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <HoverBadge
          badge={
            <span style={{
              background: 'rgba(239,68,68,0.15)', color: '#ef4444',
              fontSize: '0.65rem', fontWeight: 'bold', padding: '1px 5px',
              borderRadius: '4px', border: '1px solid rgba(239,68,68,0.3)'
            }}>ADMIN</span>
          }
          label="Admin"
          color="#ef4444"
          shift={10}
        />
        {vipLevel && (
          <HoverBadge
            badge={<VipBadge tier={vipLevel.tier} rank={vipLevel.rank} size="xs" />}
            label={`VIP: ${getLevelLabel(vipLevel)}`}
            color={TIER_STYLES[vipLevel.tier]?.border || '#94a3b8'}
            shift={20}
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
          <span style={{
            background: 'rgba(56,189,248,0.15)', color: '#38bdf8',
            fontSize: '0.65rem', fontWeight: 'bold', padding: '1px 5px',
            borderRadius: '4px', border: '1px solid rgba(56,189,248,0.3)'
          }}>MOD</span>
        }
        label="Moderator"
        color={color}
        shift={10}
      />
    );
  }

  /* ── regular user: VIP badge with styled hover popup ── */
  const vipLevel = getLevelFromEarned(user?.totalEarned || 0);
  if (!vipLevel) return null;

  const tierStyle = TIER_STYLES[vipLevel.tier];
  const color = tierStyle?.border || '#94a3b8';
  return (
    <HoverBadge
      badge={<VipBadge tier={vipLevel.tier} rank={vipLevel.rank} size="xs" />}
      label={`VIP: ${getLevelLabel(vipLevel)}`}
      color={color}
      shift={20}
    />
  );
};

/* ── reusable hover-popup wrapper ── */
const HoverBadge = ({ badge, label, color, shift = 0 }) => {
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
          transform: `translate(calc(-50% + ${shift}px), -8px)`,
          background: '#0b101e', border: `1px solid ${color}80`, color: '#f8fafc',
          padding: '5px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600,
          whiteSpace: 'nowrap', zIndex: 9999, boxShadow: `0 4px 15px ${color}40`,
          pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '4px'
        }}>
          {label}
          <div style={{
            position: 'absolute', top: '100%', left: `calc(50% - ${shift}px)`,
            transform: 'translateX(-50%)',
            borderWidth: '5px', borderStyle: 'solid',
            borderColor: `${color}80 transparent transparent transparent`
          }} />
        </div>
      )}
    </div>
  );
};

/* ── owner icon with hover (kept for owner role) ── */
const SymbolWithHover = ({ icon, label, color, shift = 0 }) => {
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
          transform: `translate(calc(-50% + ${shift}px), -8px)`,
          background: '#0b101e', border: `1px solid ${color}80`, color: '#f8fafc',
          padding: '5px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600,
          whiteSpace: 'nowrap', zIndex: 9999, boxShadow: `0 4px 15px ${color}40`,
          pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '4px'
        }}>
          {label}
          <div style={{
            position: 'absolute', top: '100%', left: `calc(50% - ${shift}px)`,
            transform: 'translateX(-50%)',
            borderWidth: '5px', borderStyle: 'solid',
            borderColor: `${color}80 transparent transparent transparent`
          }} />
        </div>
      )}
    </div>
  );
};

/* ─── message row (boxed style) ─────────────────────────── */
const MessageRow = ({ msg, canModerate, onDelete, deletingId, onUserClick }) => {
  const [hov, setHov] = useState(false);
  const isDeleting = deletingId === msg._id;

  const nameColor = msg.user?.role === 'admin'     ? '#fbbf24'
                  : msg.user?.role === 'moderator' ? '#38bdf8'
                  : msg.user?.role === 'owner'     ? '#fbbf24'
                  : '#e2e8f0';

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', flexDirection: 'column',
        marginBottom: 8,
        opacity: isDeleting ? 0.4 : 1,
        transition: 'border-color 0.15s, background 0.15s, opacity 0.2s',
        padding: '8px 12px 9px',
        borderRadius: 10,
        border: `1px solid ${hov ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}`,
        background: hov ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
        position: 'relative',
        zIndex: hov ? 50 : 1,
        gap: 4,
      }}
    >
      {/* ── Line 1: avatar + username + badge ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <button
          onClick={() => msg.user?._id && onUserClick(msg.user._id)}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
        >
          <AvatarCircle user={msg.user} size={18} />
        </button>

        <button
          onClick={() => msg.user?._id && onUserClick(msg.user._id)}
          style={{
            fontWeight: 700, color: nameColor, cursor: 'pointer',
            background: 'none', border: 'none', padding: 0,
            fontFamily: 'inherit', fontSize: '0.82rem',
          }}
          onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
          onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
        >
          {msg.user?.displayName || 'Unknown'}
        </button>

        {/* Role / VIP badge */}
        <RoleSymbol user={msg.user} />

        {/* Timestamp */}
        <span style={{ fontSize: '0.62rem', color: '#334155', marginLeft: 'auto' }}>
          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* ── Line 2: message text ── */}
      <div style={{ color: '#cbd5e1', fontSize: '0.845rem', lineHeight: 1.45, wordBreak: 'break-word', paddingLeft: 24 }}>
        {msg.message}
      </div>

      {canModerate && hov && (
        <button
          onClick={() => onDelete(msg._id)}
          disabled={isDeleting}
          title="Delete"
          style={{
            position: 'absolute', right: 8, top: 8,
            padding: '2px 4px', borderRadius: 5,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center'
          }}
        >
          <FiTrash2 style={{ fontSize: 10 }} />
        </button>
      )}
    </div>
  );
};

/* ─── main sidebar component ────────────────────────────── */
const ChatSidebar = ({ isOpen, onClose }) => {
  const { mongoUser, currentUser, isAdmin } = useAuth();
  const isMod = mongoUser?.role === 'moderator';
  const canModerate = isAdmin || isMod;

  const [activeTab, setActiveTab] = useState('chat');   // 'chat' | 'support'
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [socket, setSocket] = useState(null);
  const [liveCount, setLiveCount] = useState(0);
  const [deletingId, setDeletingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(null);

  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const endRef = useRef(null);
  const inputRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  /* fetch history when first opened */
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const res = await fetch(`${API}/chat/history`);
        const data = await res.json();
        if (data.status === 'success') {
          setMessages(data.data);
          if (data.data.length < 50) setHasMore(false);
          setTimeout(scrollToBottom, 100);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [isOpen]);

  /* socket */
  useEffect(() => {
    if (!isOpen) return;
    const sock = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    setSocket(sock);
    sock.on('newMessage', (m) => {
      setMessages(p => [...p, m]);
      const el = scrollContainerRef.current;
      if (el) {
        const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
        if (isNearBottom) setTimeout(scrollToBottom, 50);
      }
    });
    sock.on('messageDeleted', ({ _id }) => setMessages(p => p.filter(m => m._id !== _id)));
    sock.on('liveCount', ({ count }) => setLiveCount(count));
    return () => sock.disconnect();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && activeTab === 'chat') setTimeout(() => inputRef.current?.focus(), 350);
  }, [isOpen, activeTab]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !socket || !mongoUser) return;
    socket.emit('sendMessage', { userId: mongoUser._id, message: newMsg.trim() });
    setNewMsg('');
    setTimeout(scrollToBottom, 50);
  };

  const handleScroll = async (e) => {
    if (activeTab !== 'chat') return;
    if (e.target.scrollTop === 0 && hasMore && !loadingMore && messages.length > 0) {
      setLoadingMore(true);
      const oldestId = messages[0]._id;
      try {
        const res = await fetch(`${API}/chat/history?before=${oldestId}`);
        const data = await res.json();
        if (data.status === 'success') {
          if (data.data.length < 50) setHasMore(false);

          const container = scrollContainerRef.current;
          const previousScrollHeight = container?.scrollHeight;

          setMessages(prev => [...data.data, ...prev]);

          setTimeout(() => {
            if (container) {
              container.scrollTop = container.scrollHeight - previousScrollHeight;
            }
          }, 0);
        }
      } catch (err) { console.error(err); }
      finally { setLoadingMore(false); }
    }
  };

  const deleteMessage = async (id) => {
    if (!canModerate || !currentUser) return;
    setDeletingId(id);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API}/chat/messages/${id}`, {
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

              {/* Right: tab switcher + close */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Tab buttons */}
                <div style={{
                  display: 'flex', gap: 6,
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: 12, padding: '4px',
                  border: '1px solid rgba(255,255,255,0.04)'
                }}>
                  {[
                    { key: 'chat', icon: FiMessageSquare, title: 'Live Chat' },
                    { key: 'support', icon: FiHeadphones, title: 'Support' }
                  ].map(({ key, icon: Icon, title }) => {
                    const active = activeTab === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                          background: active ? '#6366f1' : 'transparent',
                          color: active ? '#ffffff' : '#64748b',
                          fontWeight: 600, fontSize: '0.75rem',
                          transition: 'all 0.2s ease',
                          boxShadow: active ? '0 2px 8px rgba(99,102,241,0.3)' : 'none'
                        }}
                        onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#94a3b8'; }}
                        onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#64748b'; }}
                      >
                        <Icon style={{ fontSize: 14 }} />
                        {title}
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
                  ref={scrollContainerRef}
                  onScroll={handleScroll}
                  style={{ flex: 1, overflowY: 'auto', padding: '12px 14px 6px', display: 'flex', flexDirection: 'column', gap: 0 }}
                  className="custom-scrollbar"
                >
                  {loadingMore && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%',
                        border: '2px solid rgba(99,102,241,0.35)',
                        borderTopColor: '#6366f1',
                        animation: 'sidebarSpin 0.8s linear infinite'
                      }} />
                    </div>
                  )}
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
                    messages.map((msg, idx) => (
                      <MessageRow
                        key={msg._id || idx}
                        msg={msg}
                        canModerate={canModerate}
                        onDelete={deleteMessage}
                        deletingId={deletingId}
                        onUserClick={setSelectedUserId}
                      />
                    ))
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
                          onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; }}
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

      {/* Public Profile Modal */}
      {selectedUserId && (
        <PublicProfileModal
          userId={selectedUserId}
          isOpen={!!selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </AnimatePresence>
  );
};

export default ChatSidebar;
