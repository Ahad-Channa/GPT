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
        onMouseEnter={() => { }}
        onMouseLeave={() => { }}
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
            <div style={{
              width: '49px', height: '18px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(239,68,68,0.05)', color: '#ef4444',
              fontSize: '11px', fontWeight: 600,
              borderRadius: '59.47px', border: '1px solid #ef4444',
              fontFamily: '"Barlow Condensed", sans-serif', letterSpacing: '0px'
            }}>Admin</div>
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

  const nameColor = msg.user?.role === 'admin' ? '#fbbf24'
    : msg.user?.role === 'moderator' ? '#38bdf8'
      : msg.user?.role === 'owner' ? '#fbbf24'
        : '#e2e8f0';

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex',
        marginBottom: 12,
        opacity: isDeleting ? 0.4 : 1,
        transition: 'background 0.15s, opacity 0.2s',
        padding: '14px 12px',
        borderRadius: '12px',
        background: 'rgba(0, 0, 0, 0.36)',
        backdropFilter: 'blur(44px)',
        position: 'relative',
        zIndex: hov ? 50 : 1,
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
        <button
          onClick={() => msg.user?._id && onUserClick(msg.user._id)}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <AvatarCircle user={msg.user} size={24} />
        </button>
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
          <button
            onClick={() => msg.user?._id && onUserClick(msg.user._id)}
            style={{
              width: '249px', height: '13px',
              display: 'flex', alignItems: 'center',
              fontWeight: 600, color: 'rgba(255, 255, 255, 1)', cursor: 'pointer',
              background: 'none', border: 'none', padding: 0,
              fontFamily: '"Barlow Condensed", sans-serif', fontSize: '18px',
              lineHeight: '120%', letterSpacing: '0px',
              textAlign: 'left',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
            }}
            onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
            onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
          >
            {msg.user?.displayName || 'Unknown'}
          </button>

          {/* Role / VIP badge on Top Right */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <RoleSymbol user={msg.user} />
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
          {msg.message}
        </div>
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

  // Prevent page scroll when chat is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

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
          {/* Backdrop (closes chat on click outside) */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'transparent',
              zIndex: 40,
            }}
            className="lg:bg-transparent bg-black/50 backdrop-blur-sm lg:backdrop-blur-none lg:pointer-events-none"
          />

          {/* ── Sidebar panel ───────────────────────── */}
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 240 }}
            style={{
              position: 'fixed', right: 0, top: 84, bottom: 0,
              width: 400, maxWidth: '100vw',
              background: 'rgba(26, 27, 26, 1)',
              borderLeft: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '-20px 4px 34px 0px rgba(0, 0, 0, 0.6)',
              opacity: 1,
              zIndex: 50, display: 'flex', flexDirection: 'column',
              fontFamily: "'Barlow', system-ui, sans-serif"
            }}
          >
            {/* ── Header ─────────────────────────────── */}
            <div style={{
              padding: '20px 20px 12px',
              display: 'flex', flexDirection: 'column', gap: '12px',
              background: 'transparent',
              flexShrink: 0
            }}>
              {/* Top Row: Tabs Container */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                <div style={{
                  width: '360px', height: '84px',
                  background: 'rgba(44, 45, 44, 1)',
                  borderRadius: '10px',
                  padding: '18px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div style={{
                    width: '324px', height: '48px',
                    display: 'flex',
                    borderRadius: '10px'
                  }}>
                    {[
                      { key: 'chat', title: 'Live Chat' },
                      { key: 'support', title: 'Support' }
                    ].map(({ key, title }) => {
                      const active = activeTab === key;
                      return (
                        <button
                          key={key}
                          onClick={() => setActiveTab(key)}
                          style={{
                            width: '162px', height: '48px',
                            padding: '10px 20px', gap: '10px',
                            border: 'none', cursor: 'pointer',
                            fontSize: '20px', fontWeight: 700, lineHeight: '32px',
                            borderRadius: '10px',
                            background: active ? 'rgba(73, 178, 101, 1)' : 'transparent',
                            color: active ? '#ffffff' : '#94a3b8',
                            boxShadow: active ? '0px 4px 0px 0px rgba(39, 109, 58, 1)' : 'none',
                            transition: 'all 0.2s',
                            fontFamily: '"Barlow Condensed", sans-serif',
                            letterSpacing: '0px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          {title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom Row: Online Count */}
              {activeTab === 'chat' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginRight: '-20px' }}>
                  <div style={{
                    width: '108px', height: '30px',
                    boxSizing: 'border-box',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: 'rgba(73, 178, 101, 0.23)', 
                    padding: '8px 28px 8px 8px',
                    borderTopLeftRadius: '100px',
                    borderBottomLeftRadius: '100px',
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0
                  }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(73, 178, 101, 1)', flexShrink: 0 }} />
                    <span style={{ 
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 600,
                      fontSize: '20px',
                      lineHeight: '32px',
                      letterSpacing: '0px',
                      color: 'rgba(255, 255, 255, 1)',
                      whiteSpace: 'nowrap',
                      display: 'flex', alignItems: 'center', height: '14px'
                    }}>
                      {liveCount} online
                    </span>
                  </div>
                </div>
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
                  padding: '12px 20px 20px',
                  background: 'transparent',
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
                            width: '360px', height: '48px', boxSizing: 'border-box',
                            background: 'transparent',
                            border: '1px solid rgba(73, 178, 101, 1)',
                            borderRadius: '10px', padding: '10px 40px 10px 20px',
                            color: 'rgba(255, 255, 255, 1)', fontSize: '16px',
                            fontWeight: 500, lineHeight: '100%',
                            outline: 'none', transition: 'border 0.15s',
                            caretColor: '#49B265',
                            fontFamily: '"Barlow Condensed", sans-serif',
                            letterSpacing: '0px'
                          }}
                          onFocus={e => { e.target.style.boxShadow = '0 0 0 1px rgba(73, 178, 101, 0.5)'; }}
                          onBlur={e => { e.target.style.boxShadow = 'none'; }}
                        />
                        <button
                          type="submit"
                          disabled={!newMsg.trim()}
                          style={{
                            position: 'absolute', right: 12, top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'transparent',
                            border: 'none',
                            cursor: newMsg.trim() ? 'pointer' : 'default',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: newMsg.trim() ? '#49B265' : 'rgba(73, 178, 101, 0.5)',
                            transition: 'all 0.18s'
                          }}
                        >
                          <img 
                            src="/coins/send.png" 
                            alt="Send" 
                            style={{ 
                              width: '24px', height: '24px',
                              opacity: newMsg.trim() ? 1 : 0.5,
                              transition: 'opacity 0.18s'
                            }} 
                          />
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
