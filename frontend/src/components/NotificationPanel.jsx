import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoClose, IoNotificationsOutline, IoTrashOutline } from 'react-icons/io5';
import { useNotifications } from '../contexts/NotificationContext';

export default function NotificationPanel() {
    const { 
        notifications, 
        isPanelOpen, 
        closePanel, 
        markAsRead, 
        dismissNotification 
    } = useNotifications();
    const panelRef = useRef(null);

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
                            <button 
                                onClick={closePanel}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <IoClose size={24} />
                            </button>
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
                                        className={`relative group p-4 rounded-xl border transition-colors ${
                                            notif.isRead 
                                                ? 'bg-gray-800/50 border-gray-800 text-gray-300' 
                                                : 'bg-indigo-900/20 border-indigo-500/30 text-white'
                                        }`}
                                    >
                                        {!notif.isRead && (
                                            <div className="absolute top-4 left-4 w-2 h-2 rounded-full bg-indigo-500" />
                                        )}
                                        
                                        <div className={`flex justify-between items-start gap-4 ${!notif.isRead ? 'pl-4' : ''}`}>
                                            <div>
                                                <h3 className="font-semibold mb-1 text-sm">{notif.title}</h3>
                                                <p className="text-sm text-gray-400 leading-relaxed mb-2">
                                                    {notif.message}
                                                </p>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(notif.createdAt).toLocaleDateString(undefined, { 
                                                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' 
                                                    })}
                                                </span>
                                            </div>
                                            
                                            <button 
                                                onClick={() => dismissNotification(notif._id)}
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
