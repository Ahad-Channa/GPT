import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import io from 'socket.io-client';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = API.replace('/api', '');


const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

// Synthesized "coin/cash" sound effect for earning notifications
const playCoinSound = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = 'sine';
        // Frequency sweep for coin sound: B5 (987.77) to E6 (1318.51)
        osc.frequency.setValueAtTime(987.77, ctx.currentTime);
        osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
    } catch(e) { 
        console.error('Audio play error', e); 
    }
};

export const NotificationProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [hasUnreadChat, setHasUnreadChat] = useState(() => {
        return localStorage.getItem('hasUnreadChat') === 'true';
    });

    useEffect(() => {
        localStorage.setItem('hasUnreadChat', hasUnreadChat);
    }, [hasUnreadChat]);

    useEffect(() => {
        const sock = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
        sock.on('newMessage', () => {
            const isChatOpen = localStorage.getItem('chatOpen') === 'true';
            if (!isChatOpen) {
                setHasUnreadChat(true);
            }
        });
        return () => {
            sock.disconnect();
        };
    }, []);

    // Store previous notifications to detect new earnings
    const prevNotifsRef = useRef([]);

    const fetchNotifications = useCallback(async () => {
        if (!currentUser) {
            setNotifications([]);
            setUnreadCount(0);
            prevNotifsRef.current = [];
            return;
        }

        try {
            const token = await currentUser.getIdToken();
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/notifications`, {
                headers: { 'Authorization': `Bearer ${token}` },
                cache: 'no-store'
            });
            const data = await res.json();

            if (data.success) {
                const incoming = data.notifications;
                
                // Detect new earning notifications
                if (prevNotifsRef.current.length > 0) {
                    const prevIds = new Set(prevNotifsRef.current.map(n => n._id));
                    const newEarningNotifs = incoming.filter(
                        n => !prevIds.has(n._id) && (
                             n.type === 'offer_reward' || 
                             n.type === 'custom_offer_approved'
                        )
                    );
                    
                    if (newEarningNotifs.length > 0) {
                        playCoinSound();
                    }
                }
                
                prevNotifsRef.current = incoming;
                setNotifications(incoming);
                setUnreadCount(data.unreadCount);
            }
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        }
    }, [currentUser]);

    useEffect(() => {
        fetchNotifications();
        
        // Polling every 5 seconds for a near real-time feel
        const BarlowvalId = setInterval(fetchNotifications, 5000);
        return () => clearInterval(BarlowvalId);
    }, [fetchNotifications]);

    const markAsRead = async () => {
        if (!currentUser || unreadCount === 0) return;
        
        try {
            const token = await currentUser.getIdToken();
            await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/notifications/mark-read`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            // Update local state immediately for snappy UI
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({...n, isRead: true})));
        } catch (error) {
            console.error("Failed to mark notifications as read:", error);
        }
    };

    const dismissNotification = async (id) => {
        if (!currentUser) return;
        
        try {
            const token = await currentUser.getIdToken();
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/notifications/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (data.success) {
                setNotifications(prev => prev.filter(n => n._id !== id));
                if (!data.notification?.isRead) {
                    setUnreadCount(prev => Math.max(0, prev - 1));
                }
            }
        } catch (error) {
            console.error("Failed to dismiss notification:", error);
        }
    };
    
    const togglePanel = () => setIsPanelOpen(prev => !prev);
    const closePanel = () => setIsPanelOpen(false);

    const dismissAllNotifications = async () => {
        if (!currentUser) return;
        
        try {
            const token = await currentUser.getIdToken();
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/notifications`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (data.success) {
                setNotifications([]);
                setUnreadCount(0);
            }
        } catch (error) {
            console.error("Failed to dismiss all notifications:", error);
        }
    };

    const value = {
        notifications,
        unreadCount,
        isPanelOpen,
        togglePanel,
        closePanel,
        markAsRead,
        dismissNotification,
        dismissAllNotifications,
        refresh: fetchNotifications,
        hasUnreadChat,
        setHasUnreadChat
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};
