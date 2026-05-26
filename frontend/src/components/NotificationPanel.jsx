import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { IoClose, IoNotificationsOutline, IoTrashOutline } from 'react-icons/io5';
import { FiGift, FiCheckCircle, FiAward, FiUsers, FiDollarSign, FiMessageSquare, FiInfo, FiAlertCircle, FiStar, FiTarget } from 'react-icons/fi';
import { useNotifications } from '../contexts/NotificationContext';
import VipBadge from './VipBadge';

const getNotificationIcon = (type, metadata) => {
    switch (type) {
        case 'offer_reward':
        case 'offer_approved':
            return <FiCheckCircle className="text-emerald-400 mt-0.5" size={18} />;
        case 'leaderboard_reward':
            return <FiAward className="text-amber-400 mt-0.5" size={18} />;
        case 'referral_earning':
            return <FiUsers className="text-cyan-400 mt-0.5" size={18} />;
        case 'admin_adjustment':
        case 'daily_bonus':
            return <FiGift className="text-indigo-400 mt-0.5" size={18} />;
        case 'global_announcement':
        case 'admin_announcement':
            return <FiMessageSquare className="text-violet-400 mt-0.5" size={18} />;
        case 'offer_rejected':
            return <FiAlertCircle className="text-rose-400 mt-0.5" size={18} />;
        case 'mission_reward':
        case 'mission_completed':
        case 'mission_reminder':
        case 'mission_new':
            return <FiTarget className="text-indigo-400 mt-0.5" size={18} />;
        case 'vip_level_up':
            if (metadata?.tier) {
                return (
                    <span className="mt-0.5 flex-shrink-0">
                        <VipBadge tier={metadata.tier} rank={metadata.rank || ''} size="xs" />
                    </span>
                );
            }
            return <FiStar className="text-amber-400 mt-0.5" size={18} />;
        default:
            return <FiInfo className="text-blue-400 mt-0.5" size={18} />;
    }
};

/**
 * Renders notification message text, replacing the linkText (e.g. "VIP page")
 * with a clickable anchor when metadata.link and metadata.linkText are present.
 */
function NotificationMessage({ message, metadata, onLinkClick }) {
    if (!metadata?.link || !metadata?.linkText) {
        return <p className="text-sm text-gray-400 leading-relaxed mb-2">{message}</p>;
    }

    const { linkText, link } = metadata;
    const parts = message.split(linkText);

    if (parts.length < 2) {
        return <p className="text-sm text-gray-400 leading-relaxed mb-2">{message}</p>;
    }

    return (
        <p className="text-sm text-gray-400 leading-relaxed mb-2">
            {parts[0]}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onLinkClick(link);
                }}
                className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 font-semibold transition-colors"
            >
                {linkText}
            </button>
            {parts.slice(1).join(linkText)}
        </p>
    );
}

export default function NotificationPanel() {
    const { 
        notifications, 
        isPanelOpen, 
        closePanel, 
        markAsRead, 
        dismissNotification,
        dismissAllNotifications
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
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }
        
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isPanelOpen, closePanel]);

    const handleLinkClick = (path) => {
        closePanel();
        navigate(path);
    };

    return (
        <AnimatePresence>
            {isPanelOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black z-[9998]"
                        aria-hidden="true"
                    />

                    {/* Panel */}
                    <motion.div
                        ref={panelRef}
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-gray-900 border-l border-gray-800 shadow-2xl z-[9999] flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-800">
                            <div className="flex items-center gap-2 text-white">
                                <IoNotificationsOutline size={24} />
                                <h2 className="text-lg font-bold">Notifications</h2>
                            </div>
                            <div className="flex items-center gap-3">
                                {notifications.length > 0 && (
                                    <button 
                                        onClick={() => {
                                            if (window.confirm('Clear all notifications?')) {
                                                dismissAllNotifications();
                                            }
                                        }}
                                        className="text-xs font-semibold text-gray-400 hover:text-red-400 transition-colors"
                                    >
                                        Clear All
                                    </button>
                                )}
                                <button 
                                    onClick={closePanel}
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    <IoClose size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                                    <IoNotificationsOutline size={48} className="mb-2 opacity-50" />
                                    <p>No notifications yet</p>
                                </div>
                            ) : (
                                notifications.map(notif => (
                                    <motion.div 
                                        key={notif._id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        onClick={() => {
                                            if (notif.metadata?.link) {
                                                handleLinkClick(notif.metadata.link);
                                            }
                                        }}
                                        className={`relative group p-4 rounded-xl border transition-colors ${
                                            notif.metadata?.link ? 'cursor-pointer hover:bg-gray-800/80' : ''
                                        } ${
                                            notif.isRead 
                                                ? 'bg-gray-800/50 border-gray-800 text-gray-300' 
                                                : notif.type === 'vip_level_up'
                                                    ? 'bg-amber-900/20 border-amber-500/30 text-white'
                                                    : 'bg-indigo-900/20 border-indigo-500/30 text-white'
                                        }`}
                                    >
                                        {!notif.isRead && (
                                            <div className={`absolute top-4 left-4 w-2 h-2 rounded-full ${notif.type === 'vip_level_up' ? 'bg-amber-400' : 'bg-indigo-500'}`} />
                                        )}
                                        
                                        <div className={`flex justify-between items-start gap-3 ${!notif.isRead ? 'pl-4' : ''}`}>
                                            {getNotificationIcon(notif.type, notif.metadata)}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold mb-1 text-sm">{notif.title}</h3>
                                                <NotificationMessage
                                                    message={notif.message}
                                                    metadata={notif.metadata}
                                                    onLinkClick={handleLinkClick}
                                                />
                                                <span className="text-xs text-gray-500">
                                                    {new Date(notif.createdAt).toLocaleDateString(undefined, { 
                                                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' 
                                                    })}
                                                </span>
                                            </div>
                                            
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    dismissNotification(notif._id);
                                                }}
                                                className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                                title="Dismiss"
                                            >
                                                <IoTrashOutline size={18} />
                                            </button>
                                        </div>
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
