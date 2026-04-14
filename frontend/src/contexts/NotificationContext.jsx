import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    const fetchNotifications = useCallback(async () => {
        if (!currentUser) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        try {
            const token = await currentUser.getIdToken();
            const res = await fetch('http://localhost:5000/api/notifications', {
                headers: { 'Authorization': `Bearer ${token}` },
                cache: 'no-store'
            });
            const data = await res.json();

            if (data.success) {
                setNotifications(data.notifications);
                setUnreadCount(data.unreadCount);
            }
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        }
    }, [currentUser]);

    useEffect(() => {
        fetchNotifications();
        
        // Polling every 5 seconds for a near real-time feel
        const intervalId = setInterval(fetchNotifications, 5000);
        return () => clearInterval(intervalId);
    }, [fetchNotifications]);

    const markAsRead = async () => {
        if (!currentUser || unreadCount === 0) return;
        
        try {
            const token = await currentUser.getIdToken();
            await fetch('http://localhost:5000/api/notifications/mark-read', {
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
            const res = await fetch(`http://localhost:5000/api/notifications/${id}`, {
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

    const value = {
        notifications,
        unreadCount,
        isPanelOpen,
        togglePanel,
        closePanel,
        markAsRead,
        dismissNotification,
        refresh: fetchNotifications
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};
