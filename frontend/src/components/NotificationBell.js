import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { notificationsAPI } from '../services/api';

function NotificationBell() {
    const [notifications, setNotifications] = useState([]);
    const [count, setCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [readIds, setReadIds] = useState(new Set());
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();
    const readIdsRef = useRef(readIds);

    // Keep ref in sync so the fetch callback always has latest readIds
    useEffect(() => {
        readIdsRef.current = readIds;
    }, [readIds]);

    const fetchNotifications = useCallback(async () => {
        try {
            const response = await notificationsAPI.getAll();
            const data = response.data;
            setNotifications(data.notifications || []);
            const unread = (data.notifications || []).filter(n => !readIdsRef.current.has(n.id));
            setCount(unread.length);
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        }
    }, []);

    // Fetch on mount + poll every 30 seconds
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // Re-fetch whenever the user navigates to a different page
    useEffect(() => {
        fetchNotifications();
    }, [location.pathname, fetchNotifications]);

    // Listen for instant refresh events from other components
    useEffect(() => {
        const handleRefreshEvent = () => fetchNotifications();
        window.addEventListener('notifications-refresh', handleRefreshEvent);
        return () => window.removeEventListener('notifications-refresh', handleRefreshEvent);
    }, [fetchNotifications]);

    // Update count when readIds changes
    useEffect(() => {
        const unread = notifications.filter(n => !readIds.has(n.id));
        setCount(unread.length);
    }, [readIds, notifications]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = (notification) => {
        // Mark as read
        setReadIds(prev => new Set([...prev, notification.id]));
        // Navigate to relevant page
        if (notification.link) {
            navigate(notification.link);
        }
        setIsOpen(false);
    };

    const handleMarkAllRead = (e) => {
        e.stopPropagation();
        const allIds = notifications.map(n => n.id);
        setReadIds(new Set(allIds));
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'danger': return '#ef4444';
            case 'warning': return '#f59e0b';
            case 'info': return '#4a90e2';
            default: return '#adb5bd';
        }
    };

    const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

    return (
        <div className="notification-bell-container" ref={dropdownRef}>
            <button
                className="notification-bell-btn"
                onClick={() => setIsOpen(!isOpen)}
                title="Notifications"
            >
                <i className="fas fa-bell"></i>
                {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
            </button>

            {isOpen && (
                <div className="notification-dropdown">
                    <div className="notification-dropdown-header">
                        <h4>Notifications</h4>
                        {unreadCount > 0 && (
                            <button className="notification-mark-read" onClick={handleMarkAllRead}>
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="notification-dropdown-body">
                        {notifications.length === 0 ? (
                            <div className="notification-empty">
                                <i className="fas fa-check-circle"></i>
                                <p>You're all caught up!</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`notification-item ${readIds.has(notification.id) ? 'read' : 'unread'}`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div
                                        className="notification-item-icon"
                                        style={{ color: getSeverityColor(notification.severity) }}
                                    >
                                        <i className={notification.icon}></i>
                                    </div>
                                    <div className="notification-item-content">
                                        <p className="notification-item-message">{notification.message}</p>
                                        <span className="notification-item-type">
                                            {notification.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </span>
                                    </div>
                                    <div
                                        className="notification-item-dot"
                                        style={{
                                            background: readIds.has(notification.id) ? 'transparent' : getSeverityColor(notification.severity)
                                        }}
                                    />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default NotificationBell;
