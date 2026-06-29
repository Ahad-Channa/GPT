import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { IoClose, IoNotificationsOutline, IoTrashOutline } from 'react-icons/io5';
import { FiGift, FiCheckCircle, FiAward, FiUsers, FiDollarSign, FiMessageSquare, FiInfo, FiAlertCircle, FiStar, FiTarget } from 'react-icons/fi';
import { useNotifications } from '../contexts/NotificationContext';
import VipBadge from './VipBadge';

const getNotificationIcon = (type, metadata) => {
    let icon;
    switch (type) {
        case 'offer_reward':
        case 'offer_approved':
            icon = <FiCheckCircle className="text-[#49B265]" size={24} />;
            break;
        case 'leaderboard_reward':
            icon = <FiAward className="text-[#49B265]" size={24} />;
            break;
        case 'referral_earning':
            icon = <FiUsers className="text-[#49B265]" size={24} />;
            break;
        case 'admin_adjustment':
        case 'daily_bonus':
            icon = <img src="/coins/bonus.png" style={{ width: '24px', height: '24px', objectFit: 'contain' }} alt="bonus" />;
            break;
        case 'global_announcement':
        case 'admin_announcement':
            icon = <FiMessageSquare className="text-[#49B265]" size={24} />;
            break;
        case 'offer_rejected':
        case 'chargeback':
            icon = <FiAlertCircle className="text-[#49B265]" size={24} />;
            break;
        case 'mission_reward':
        case 'mission_completed':
        case 'mission_reminder':
        case 'mission_new':
            icon = <img src="/coins/newmissio.png" style={{ width: '24px', height: '24px', objectFit: 'contain' }} alt="new missions" />;
            break;
        case 'vip_level_up': {
            const tier = metadata?.tier || 'Bronze';
            const name = tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
            const fileName = name === 'Diamond' ? 'dimond' : name.toLowerCase();
            icon = <img src={`/coins/${fileName}.png`} style={{ width: '48px', height: '48px', objectFit: 'contain' }} alt={tier} />;
            break;
        }
        default:
            icon = <FiInfo className="text-[#49B265]" size={24} />;
    }

    const isVip = type === 'vip_level_up';

    return (
        <div style={{
            width: '48px',
            height: '48px',
            padding: isVip ? '0' : '10px 12px',
            boxSizing: 'border-box',
            borderRadius: isVip ? '0' : '10px',
            border: isVip ? 'none' : '1px solid rgba(73, 178, 101, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            flexShrink: 0
        }}>
            {icon}
        </div>
    );
};

/**
 * Renders notification message text, replacing the linkText (e.g. "VIP page")
 * with a clickable anchor when metadata.link and metadata.linkText are present.
 */
function NotificationMessage({ message, metadata, onLinkClick }) {
    if (!metadata?.link || !metadata?.linkText) {
        return (
            <div style={{
                width: '280px',
                height: '38px',
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 500,
                fontSize: '16px',
                lineHeight: '18px',
                color: 'rgba(255, 255, 255, 0.6)',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                textOverflow: 'ellipsis'
            }}>
                {message}
            </div>
        );
    }

    const { linkText, link } = metadata;
    const parts = message.split(linkText);

    if (parts.length < 2) {
        return (
            <div style={{
                width: '280px',
                height: '38px',
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 500,
                fontSize: '16px',
                lineHeight: '18px',
                color: 'rgba(255, 255, 255, 0.6)',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                textOverflow: 'ellipsis'
            }}>
                {message}
            </div>
        );
    }

    return (
        <div style={{
            width: '280px',
            height: '38px',
            fontFamily: '"Barlow Condensed", sans-serif',
            fontWeight: 500,
            fontSize: '16px',
            lineHeight: '18px',
            color: 'rgba(255, 255, 255, 0.6)',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            textOverflow: 'ellipsis'
        }}>
            {parts[0]}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onLinkClick(link);
                }}
                className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 font-semibold transition-colors"
                style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 600, fontSize: '16px' }}
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
                        onClick={closePanel}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
                        aria-hidden="true"
                    />

                    {/* Panel */}
                    <motion.div
                        ref={panelRef}
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                        className="notification-panel-card"
                    >
                        {/* Header */}
                        <div 
                            className="flex items-center justify-between shrink-0" 
                            style={{ 
                                padding: '32px 20px 16px',
                                boxSizing: 'border-box',
                                height: '78px'
                            }}
                        >
                            <div style={{
                                width: '360px',
                                height: '29px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '6px'
                            }}>
                                <h2 style={{
                                    width: '276px',
                                    height: '29px',
                                    fontFamily: '"Barlow Condensed", sans-serif',
                                    fontWeight: 700,
                                    fontSize: '24px',
                                    lineHeight: '120%',
                                    color: 'rgba(255, 255, 255, 1)',
                                    margin: 0,
                                    padding: 0,
                                    display: 'flex',
                                    alignItems: 'center'
                                }}>
                                    Notifications
                                </h2>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}>
                                    {notifications.length > 0 && (
                                        <button 
                                            onClick={() => {
                                                if (window.confirm('Clear all notifications?')) {
                                                    dismissAllNotifications();
                                                }
                                            }}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: 0,
                                                width: '48px',
                                                height: '19px',
                                                fontFamily: '"Barlow Condensed", sans-serif',
                                                fontWeight: 700,
                                                fontSize: '16px',
                                                lineHeight: '120%',
                                                color: 'rgba(226, 69, 69, 1)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'opacity 0.2s'
                                            }}
                                            onMouseEnter={(e) => { e.target.style.opacity = 0.8; }}
                                            onMouseLeave={(e) => { e.target.style.opacity = 1; }}
                                        >
                                            Clear All
                                        </button>
                                    )}
                                    <button 
                                        onClick={closePanel}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#888888',
                                            transition: 'color 0.2s'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.color = '#888888'; }}
                                    >
                                        <IoClose size={24} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto space-y-4" style={{ padding: '16px 20px' }}>
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
                                        style={{
                                            width: '360px',
                                            height: '114px',
                                            boxSizing: 'border-box',
                                            borderRadius: '12px',
                                            padding: '14px 12px',
                                            background: 'rgba(0, 0, 0, 0.36)',
                                            backdropFilter: 'blur(44px)',
                                            WebkitBackdropFilter: 'blur(44px)',
                                            display: 'flex',
                                            gap: '8px',
                                            flexDirection: 'row',
                                            alignItems: 'flex-start',
                                            overflow: 'hidden',
                                            flexShrink: 0,
                                            cursor: notif.metadata?.link ? 'pointer' : 'default',
                                        }}
                                        className="transition-colors hover:bg-white/[0.02]"
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', width: '100%', height: '100%', position: 'relative' }}>
                                            {getNotificationIcon(notif.type, notif.metadata)}
                                            
                                            <div style={{
                                                width: '280px',
                                                height: '86px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '14px',
                                                justifyContent: 'flex-start',
                                                minWidth: 0,
                                                boxSizing: 'border-box'
                                            }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <h3 style={{
                                                        width: '280px',
                                                        height: 'auto',
                                                        fontFamily: '"Barlow Condensed", sans-serif',
                                                        fontWeight: 600,
                                                        fontSize: '18px',
                                                        lineHeight: '120%',
                                                        color: '#ffffff',
                                                        margin: 0,
                                                        padding: 0,
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        display: 'flex',
                                                        alignItems: 'center'
                                                    }}>
                                                        {notif.title}
                                                    </h3>
                                                    <NotificationMessage
                                                        message={notif.message}
                                                        metadata={notif.metadata}
                                                        onLinkClick={handleLinkClick}
                                                    />
                                                </div>
                                                
                                                <span style={{ 
                                                    width: '42px',
                                                    height: '13px',
                                                    fontFamily: '"Barlow Condensed", sans-serif',
                                                    fontWeight: 600,
                                                    fontSize: '10px',
                                                    color: 'rgba(73, 178, 101, 1)',
                                                    lineHeight: '130%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {(() => {
                                                        const date = new Date(notif.createdAt);
                                                        return date.toLocaleDateString(undefined, { 
                                                            day: 'numeric', month: 'short'
                                                        }) + ', ' + date.toLocaleTimeString(undefined, {
                                                            hour: '2-digit', minute: '2-digit', hour12: false
                                                        });
                                                    })()}
                                                </span>
                                            </div>
                                            
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    dismissNotification(notif._id);
                                                }}
                                                style={{
                                                    position: 'absolute',
                                                    right: 0,
                                                    top: 0,
                                                    background: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: '#888888',
                                                    padding: 0,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'color 0.2s',
                                                    zIndex: 10
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.color = '#888888'; }}
                                                title="Dismiss"
                                            >
                                                <IoClose size={16} />
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
