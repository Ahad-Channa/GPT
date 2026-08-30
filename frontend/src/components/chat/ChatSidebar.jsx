import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import SupportChat from '../SupportChat';
import { FiX, FiSend, FiTrash2, FiMessageSquare } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import PublicProfileModal from '../PublicProfileModal';
import { getLevelFromEarned, getLevelLabel } from '../../utils/vipLevels';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = API.replace(/\/api\/?$/, '');

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
    pillBg: 'linear-gradient(180deg, #7E83F1 0%, #7941BB 100%), linear-gradient(180deg, #E92BFF 0%, #31BDFF 100%)',
    borderColor: '#E92BFF',
  },
};

const AvatarWithBadge = ({ user, size = 33 }) => {
  const photo = user?.avatarUrl || user?.photoURL || '/avatars/avatar1.png';
  const vipLevel = getLevelFromEarned(user?.totalEarned || 0);
  const tierName = vipLevel?.tier || 'Bronze';
  const tierMeta = TIER_BADGES[tierName] || TIER_BADGES.Bronze;

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

const RoleBadges = ({ user }) => {
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
            background: '#CC001C',
            color: '#FFFFFF',
            fontSize: '11px',
            fontWeight: 700,
            lineHeight: '1',
            borderRadius: '100px',
            padding: '4px 10px',
            fontFamily: '"Poppins", sans-serif',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          Admin
        </span>
      )}

      {/* Moderator badge */}
      {role === 'moderator' && (
        <span
          style={{
            background: '#0284C7',
            color: '#FFFFFF',
            fontSize: '11px',
            fontWeight: 700,
            lineHeight: '1',
            borderRadius: '100px',
            padding: '4px 10px',
            fontFamily: '"Poppins", sans-serif',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          Mod
        </span>
      )}

      {/* Tier Badge */}
      <span
        style={{
          background: tierMeta.pillBg,
          color: '#FFFFFF',
          fontSize: '11px',
          fontWeight: 600,
          lineHeight: '1',
          borderRadius: '100px',
          padding: '4px 10px',
          fontFamily: '"Poppins", sans-serif',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {rankLabel}
      </span>
    </div>
  );
};

const MessageRow = ({ msg, canModerate, onDelete, deletingId, onUserClick }) => {
  const [hov, setHov] = useState(false);
  const isDeleting = deletingId === msg._id;

  const date = new Date(msg.createdAt || Date.now());
  const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="relative flex items-start gap-3 w-full pb-3.5 mb-3.5 border-b border-[#EFEFEF] transition-opacity"
      style={{ opacity: isDeleting ? 0.4 : 1 }}
    >
      {/* Left Column: Avatar with mini tier badge (33x33) */}
      <button
        onClick={() => msg.user?._id && onUserClick(msg.user._id)}
        className="cursor-pointer bg-transparent border-none p-0 outline-none mt-0.5"
      >
        <AvatarWithBadge user={msg.user} size={33} />
      </button>

      {/* Right Column: Name, Timestamp, Badges & Message */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center justify-between gap-2 w-full">
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
              minWidth: 0,
              opacity: 1,
              transform: 'rotate(0deg)',
            }}
          >
            <button
              onClick={() => msg.user?._id && onUserClick(msg.user._id)}
              style={{
                fontFamily: '"Bricolage Grotesque", sans-serif',
                fontWeight: 700,
                fontSize: '18px',
                lineHeight: '100%',
                letterSpacing: '0%',
                color: '#000000',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                opacity: 1,
                transform: 'rotate(0deg)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              className="hover:underline"
            >
              {msg.user?.displayName || msg.user?.username || (msg.user?.email ? msg.user.email.split('@')[0] : '') || msg.senderName || 'Ahad'}
            </button>
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

          {/* Badges on right */}
          <RoleBadges user={msg.user} />
        </div>

        {/* Message Text */}
        <p
          style={{
            fontFamily: '"Poppins", sans-serif',
            fontWeight: 400,
            fontSize: '13.5px',
            lineHeight: '1.45',
            color: '#18181B',
            margin: 0,
            marginTop: '6px',
            wordBreak: 'break-word',
          }}
        >
          {msg.message}
        </p>
      </div>

      {canModerate && hov && (
        <button
          onClick={() => onDelete(msg._id)}
          disabled={isDeleting}
          title="Delete"
          className="absolute right-1 bottom-2 p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors border-none cursor-pointer"
        >
          <FiTrash2 size={13} />
        </button>
      )}
    </div>
  );
};

const ChatSidebar = ({ isOpen, onClose }) => {
  const { mongoUser, currentUser, isAdmin } = useAuth();
  const { setHasUnreadChat } = useNotifications();
  const isMod = mongoUser?.role === 'moderator';
  const canModerate = isAdmin || isMod;

  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'support'
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [socket, setSocket] = useState(null);
  const [liveCount, setLiveCount] = useState(9);
  const [deletingId, setDeletingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(null);

  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const endRef = useRef(null);
  const inputRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    endRef.current?.scrollIntoView({ behavior });
  }, []);

  const isInitialScroll = useRef(true);

  useEffect(() => {
    if (isOpen) {
      isInitialScroll.current = true;
    }
  }, [isOpen, activeTab]);

  useLayoutEffect(() => {
    if (!loading && messages.length > 0 && isInitialScroll.current && activeTab === 'chat') {
      const container = scrollContainerRef.current;
      if (container) {
        const snap = () => {
          if (container) container.scrollTop = container.scrollHeight;
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
      }
    }
  }, [loading, messages, activeTab]);

  useEffect(() => {
    if (isOpen) {
      setHasUnreadChat(false);
    }
  }, [isOpen, setHasUnreadChat]);

  /* fetch history when first opened */
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const startTime = Date.now();
    (async () => {
      try {
        const res = await fetch(`${API}/chat/history`);
        const data = await res.json();
        if (data.status === 'success') {
          setMessages(data.data);
          if (data.data.length < 50) setHasMore(false);
        }
      } catch (e) { console.error(e); }
      finally {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 400 - elapsed);
        setTimeout(() => setLoading(false), remaining);
      }
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
        if (isNearBottom) setTimeout(() => scrollToBottom('smooth'), 50);
      }
    });
    sock.on('messageDeleted', ({ _id }) => setMessages(p => p.filter(m => m._id !== _id)));
    sock.on('liveCount', ({ count }) => setLiveCount(count || 1));
    return () => sock.disconnect();
  }, [isOpen, scrollToBottom]);

  useEffect(() => {
    if (isOpen && activeTab === 'chat') setTimeout(() => inputRef.current?.focus(), 350);
  }, [isOpen, activeTab]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !socket || !mongoUser) return;
    socket.emit('sendMessage', { userId: mongoUser._id, message: newMsg.trim() });
    setNewMsg('');
    setTimeout(() => scrollToBottom('smooth'), 50);
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
          {/* Backdrop (closes chat on click outside on mobile) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 45 }}
            className="lg:bg-transparent bg-black/40 backdrop-blur-sm lg:backdrop-blur-none lg:pointer-events-none"
          />

          {/* ── Main Chat Container (width: 370, height: 100vh, top: 0, right: 0, bottom: 0) ── */}
          <motion.div
            initial={{ x: '110%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '110%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            style={{
              position: 'fixed',
              top: '0px',
              right: '0px',
              bottom: '0px',
              width: '100%',
              maxWidth: '370px',
              height: '100vh',
              borderRadius: '30px 0 0 30px',
              background: '#FFFFFF',
              boxShadow: '-8px 0px 36px 0px rgba(0, 0, 0, 0.12)',
              borderLeft: '1px solid rgba(0, 0, 0, 0.05)',
              opacity: 1,
              transform: 'rotate(0deg)',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            {/* ── Header Area ── */}
            <div className="p-4 pb-3 flex flex-col gap-3 shrink-0">
              {/* Row 1: Tab Pills (Live Chat / Support) & Close Button */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('chat')}
                    style={{
                      width: '99px',
                      height: '39px',
                      borderRadius: '100px',
                      background: activeTab === 'chat' ? 'rgba(36, 50, 77, 1)' : 'rgba(249, 247, 241, 1)',
                      color: activeTab === 'chat' ? '#FFFFFF' : '#000000',
                      padding: '15px 18px',
                      gap: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxSizing: 'border-box',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      fontWeight: 700,
                      fontSize: '14px',
                      lineHeight: '100%',
                      letterSpacing: '0%',
                      textAlign: 'center',
                      opacity: 1,
                      transform: 'rotate(0deg)',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Live Chat
                  </button>
                  <button
                    onClick={() => setActiveTab('support')}
                    style={{
                      width: '99px',
                      height: '39px',
                      borderRadius: '100px',
                      background: activeTab === 'support' ? 'rgba(36, 50, 77, 1)' : 'rgba(249, 247, 241, 1)',
                      color: activeTab === 'support' ? '#FFFFFF' : '#000000',
                      padding: '15px 18px',
                      gap: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxSizing: 'border-box',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      fontWeight: 700,
                      fontSize: '14px',
                      lineHeight: '100%',
                      letterSpacing: '0%',
                      textAlign: 'center',
                      opacity: 1,
                      transform: 'rotate(0deg)',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Support
                  </button>
                </div>

                {/* Close Button (Black Circle with White X - 22x22) */}
                <button
                  onClick={onClose}
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: '#000000',
                    color: '#FFFFFF',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'transform 0.15s, opacity 0.15s',
                    flexShrink: 0,
                    opacity: 1,
                    transform: 'rotate(0deg)',
                  }}
                  className="hover:opacity-85 active:scale-95"
                >
                  <FiX size={12} />
                </button>
              </div>

              {/* Row 2: Online Status Banner (Green pill - 341x29) */}
              {activeTab === 'chat' && (
                <div
                  style={{
                    width: '100%',
                    maxWidth: '341px',
                    height: '29px',
                    borderRadius: '40px',
                    background: 'rgba(198, 248, 211, 1)',
                    padding: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxSizing: 'border-box',
                    opacity: 1,
                    transform: 'rotate(0deg)',
                    margin: '0 auto',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: '#10B981',
                        display: 'inline-block',
                        flexShrink: 0,
                        opacity: 1,
                        transform: 'rotate(0deg)',
                      }}
                    />
                    <span
                      style={{
                        fontFamily: '"Bricolage Grotesque", sans-serif',
                        fontWeight: 700,
                        fontSize: '14px',
                        lineHeight: '100%',
                        letterSpacing: '0%',
                        color: '#000000',
                      }}
                    >
                      Online
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      fontWeight: 700,
                      fontSize: '14px',
                      lineHeight: '100%',
                      letterSpacing: '0%',
                      color: '#000000',
                    }}
                  >
                    {String(liveCount).padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>

            {/* ── Body Area ── */}
            {activeTab === 'support' ? (
              <SupportChat socket={socket} />
            ) : loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    border: '2.5px solid #24324D',
                    borderTopColor: 'transparent',
                    animation: 'sidebarSpin 0.8s linear infinite',
                  }}
                />
              </div>
            ) : (
              <>
                {/* Message List */}
                <div
                  ref={scrollContainerRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto px-4 py-2 flex flex-col no-scrollbar"
                  style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                  }}
                >
                  {loadingMore && (
                    <div className="flex justify-center py-2">
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          border: '2px solid #24324D',
                          borderTopColor: 'transparent',
                          animation: 'sidebarSpin 0.8s linear infinite',
                        }}
                      />
                    </div>
                  )}

                  {messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 gap-2 py-12">
                      <FiMessageSquare size={28} className="text-gray-300" />
                      <p className="text-sm font-medium text-gray-500 m-0">No messages yet — say hi! 👋</p>
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

                {/* ── Bottom Input Area ── */}
                <div className="p-4 pt-2 shrink-0">
                  {mongoUser ? (
                    <form onSubmit={sendMessage} className="w-full">
                      <div
                        style={{
                          width: '100%',
                          height: '48px',
                          borderRadius: '100px',
                          background: 'rgba(239, 239, 239, 1)',
                          padding: '4px 6px 4px 18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          boxSizing: 'border-box',
                          gap: '8px',
                        }}
                      >
                        <input
                          ref={inputRef}
                          type="text"
                          value={newMsg}
                          onChange={e => setNewMsg(e.target.value)}
                          placeholder="Massage everyone..."
                          maxLength={500}
                          style={{
                            flex: 1,
                            minWidth: 0,
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            fontFamily: '"Poppins", sans-serif',
                            fontWeight: 400,
                            fontSize: '14px',
                            color: '#000000',
                          }}
                        />

                        <button
                          type="submit"
                          disabled={!newMsg.trim()}
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: '#24324D',
                            border: 'none',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: newMsg.trim() ? 'pointer' : 'default',
                            opacity: newMsg.trim() ? 1 : 0.85,
                            transition: 'transform 0.15s, opacity 0.15s',
                            flexShrink: 0,
                          }}
                          className="hover:opacity-90 active:scale-95"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            style={{ transform: 'rotate(45deg) translate(-1px, 1px)' }}
                          >
                            <path
                              d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z"
                              fill="currentColor"
                            />
                          </svg>
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="text-center py-2 text-xs font-semibold text-gray-500">
                      Log in to join the conversation
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>

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
