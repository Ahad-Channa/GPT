import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiX, FiBell, FiTrash2 } from 'react-icons/fi';
import { useNotifications } from '../contexts/NotificationContext';

/**
 * Renders notification message text, replacing the linkText (e.g. "VIP page")
 * with a clickable anchor when metadata.link and metadata.linkText are present.
 */
function NotificationMessage({ message, metadata, onLinkClick }) {
  if (!metadata?.link || !metadata?.linkText) {
    return (
      <div
        style={{
          width: '100%',
          fontFamily: '"Poppins", sans-serif',
          fontWeight: 400,
          fontSize: '13px',
          lineHeight: '20px',
          color: '#18181B',
          wordBreak: 'break-word',
        }}
      >
        {message}
      </div>
    );
  }

  const { linkText, link } = metadata;
  const parts = message.split(linkText);

  if (parts.length < 2) {
    return (
      <div
        style={{
          width: '100%',
          fontFamily: '"Poppins", sans-serif',
          fontWeight: 400,
          fontSize: '13px',
          lineHeight: '20px',
          color: '#18181B',
          wordBreak: 'break-word',
        }}
      >
        {message}
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        fontFamily: '"Poppins", sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        lineHeight: '20px',
        color: '#18181B',
        wordBreak: 'break-word',
      }}
    >
      {parts[0]}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onLinkClick(link);
        }}
        className="text-indigo-600 hover:text-indigo-800 underline underline-offset-2 font-semibold transition-colors"
        style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, fontSize: '13px' }}
      >
        {linkText}
      </button>
      {parts.slice(1).join(linkText)}
    </div>
  );
}

export default function NotificationPanel() {
  const {
    notifications,
    isPanelOpen,
    closePanel,
    markAsRead,
    dismissNotification,
    dismissAllNotifications,
  } = useNotifications();
  const panelRef = useRef(null);
  const navigate = useNavigate();

  // Auto mark as read when panel opens
  useEffect(() => {
    if (isPanelOpen) {
      markAsRead();
    }
  }, [isPanelOpen]);

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        closePanel();
      }
    }

    if (isPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPanelOpen, closePanel]);

  const handleLinkClick = (path) => {
    closePanel();
    navigate(path);
  };

  return (
    <AnimatePresence>
      {isPanelOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closePanel}
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] cursor-pointer"
          />

          {/* ── Main Notification Sidebar (width: 370, height: 100vh, top: 0, right: 0, bottom: 0) ── */}
          <motion.div
            ref={panelRef}
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
            {/* ── Top Header Area ── */}
            <div
              className="flex items-center justify-between shrink-0"
              style={{
                padding: '22px 20px 16px',
                boxSizing: 'border-box',
              }}
            >
              <h2
                style={{
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  fontWeight: 700,
                  fontSize: '20px',
                  lineHeight: '100%',
                  color: '#000000',
                  margin: 0,
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                Notifications
              </h2>

              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm('Clear all notifications?')) {
                        dismissAllNotifications();
                      }
                    }}
                    style={{
                      background: 'rgba(36, 50, 77, 1)',
                      color: '#FFFFFF',
                      borderRadius: '100px',
                      padding: '6px 14px',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      fontWeight: 700,
                      fontSize: '12px',
                      lineHeight: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'opacity 0.2s',
                    }}
                    className="hover:opacity-85 active:scale-95"
                  >
                    Clear All
                  </button>
                )}

                {/* Close Button (Black Circle with White X - 22x22) */}
                <button
                  onClick={closePanel}
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
                    padding: 0,
                  }}
                  className="hover:opacity-85 active:scale-95"
                  title="Close"
                >
                  <FiX size={12} />
                </button>
              </div>
            </div>

            {/* ── Content / Notification Items List ── */}
            <div
              className="flex-1 overflow-y-auto no-scrollbar"
              style={{
                padding: '12px 20px',
                display: 'flex',
                flexDirection: 'column',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 py-16 text-center text-gray-400 gap-2">
                  <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center mb-2">
                    <FiBell size={22} className="text-gray-400" />
                  </div>
                  <h4
                    style={{
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      fontWeight: 700,
                      fontSize: '16px',
                      color: '#000000',
                      margin: 0,
                    }}
                  >
                    No notifications yet
                  </h4>
                  <p
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      fontSize: '12px',
                      color: 'rgba(14, 15, 12, 0.5)',
                      margin: 0,
                      maxWidth: '220px',
                    }}
                  >
                    You're all caught up! New alerts and reward updates will show up here.
                  </p>
                </div>
              ) : (
                notifications.map((notif, idx) => (
                  <motion.div
                    key={notif._id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => {
                      if (notif.metadata?.link) {
                        handleLinkClick(notif.metadata.link);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '16px 0',
                      borderBottom:
                        idx !== notifications.length - 1
                          ? '1px solid rgba(0, 0, 0, 0.07)'
                          : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      boxSizing: 'border-box',
                      cursor: notif.metadata?.link ? 'pointer' : 'default',
                      position: 'relative',
                    }}
                  >
                    {/* Title and Dismiss Button Row */}
                    <div className="flex items-start justify-between gap-2 w-full">
                      <h3
                        style={{
                          fontFamily: '"Bricolage Grotesque", sans-serif',
                          fontWeight: 700,
                          fontSize: '16px',
                          lineHeight: '120%',
                          color: '#000000',
                          margin: 0,
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          flex: 1,
                        }}
                      >
                        {notif.title}
                      </h3>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissNotification(notif._id);
                        }}
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: '#000000',
                          color: '#FFFFFF',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          padding: 0,
                          transition: 'transform 0.15s, opacity 0.15s',
                        }}
                        className="hover:opacity-85 active:scale-90"
                        title="Dismiss"
                      >
                        <FiX size={10} />
                      </button>
                    </div>

                    {/* Message Body */}
                    <NotificationMessage
                      message={notif.message}
                      metadata={notif.metadata}
                      onLinkClick={handleLinkClick}
                    />

                    {/* Date / Timestamp */}
                    <span
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 400,
                        fontSize: '12px',
                        color: 'rgba(14, 15, 12, 0.5)',
                        lineHeight: '100%',
                        marginTop: '4px',
                      }}
                    >
                      {(() => {
                        const date = new Date(notif.createdAt);
                        return (
                          date.toLocaleDateString(undefined, {
                            day: 'numeric',
                            month: 'short',
                          }) +
                          ', ' +
                          date.toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          })
                        );
                      })()}
                    </span>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
