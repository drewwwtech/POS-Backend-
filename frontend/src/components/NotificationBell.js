import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { notificationsAPI } from '../services/api';

function NotificationBell() {
    // Accumulated notifications — merges new ones with existing, never removes
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [readIds, setReadIds] = useState(new Set());
    const [showAll, setShowAll] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();
    const readIdsRef = useRef(readIds);
    const seenIdsRef = useRef(new Set());

    const DISPLAY_LIMIT = 20;

    // Keep ref in sync
    useEffect(() => {
        readIdsRef.current = readIds;
    }, [readIds]);

    const fetchNotifications = useCallback(async () => {
        try {
            const response = await notificationsAPI.getAll();
            const incoming = response.data.notifications || [];

            setNotifications(prev => {
                // Build a map of existing notifications by ID
                const existingMap = new Map(prev.map(n => [n.id, n]));

                // Add new incoming notifications
                incoming.forEach(n => {
                    existingMap.set(n.id, n);
                });

                // Convert back to array, sorted by timestamp (newest first)
                const merged = Array.from(existingMap.values());
                merged.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                // Track which IDs are currently active (from backend)
                const activeIds = new Set(incoming.map(n => n.id));

                // Mark non-active notifications as resolved (auto-read)
                // These are notifications whose conditions no longer exist
                // (e.g., product was restocked and is no longer low)
                const updatedReadIds = new Set(readIdsRef.current);
                merged.forEach(n => {
                    if (!activeIds.has(n.id) && !updatedReadIds.has(n.id)) {
                        updatedReadIds.add(n.id);
                    }
                });
                // Update readIds if we auto-resolved any
                if (updatedReadIds.size !== readIdsRef.current.size) {
                    setReadIds(updatedReadIds);
                    readIdsRef.current = updatedReadIds;
                }

                return merged;
            });
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
        setReadIds(prev => new Set([...prev, notification.id]));
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

    const handleClearRead = (e) => {
        e.stopPropagation();
        // Remove all read + resolved notifications, keep only unread ones
        setNotifications(prev => prev.filter(n => !readIds.has(n.id)));
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

    const formatTimestamp = (ts) => {
        if (!ts) return '';
        try {
            const date = new Date(ts);
            if (isNaN(date.getTime())) return '';
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            });
        } catch {
            return '';
        }
    };

    const displayedNotifications = showAll ? notifications : notifications.slice(0, DISPLAY_LIMIT);
    const hasMore = notifications.length > DISPLAY_LIMIT;

    return (
        <div className="notification-bell-container" ref={dropdownRef}>
            <button
                className="notification-bell-btn"
                onClick={() => { setIsOpen(!isOpen); setShowAll(false); }}
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
                        <h4>Notifications {notifications.length > 0 && <span className="notification-count">({notifications.length})</span>}</h4>
                        <div className="notification-header-actions">
                            {unreadCount > 0 && (
                                <button className="notification-mark-read" onClick={handleMarkAllRead}>
                                    Mark all read
                                </button>
                            )}
                            {notifications.some(n => readIds.has(n.id)) && (
                                <button className="notification-mark-read" onClick={handleClearRead}>
                                    Clear read
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="notification-dropdown-body">
                        {notifications.length === 0 ? (
                            <div className="notification-empty">
                                <i className="fas fa-check-circle"></i>
                                <p>You're all caught up!</p>
                            </div>
                        ) : (
                            displayedNotifications.map((notification) => (
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
                                        <div className="notification-item-meta">
                                            <span className="notification-item-type">
                                                {notification.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            </span>
                                            <span className="notification-item-time">
                                                <i className="fas fa-clock"></i> {formatTimestamp(notification.timestamp)}
                                            </span>
                                        </div>
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

                    {hasMore && (
                        <div className="notification-dropdown-footer">
                            <button
                                className="notification-show-more"
                                onClick={(e) => { e.stopPropagation(); setShowAll(!showAll); }}
                            >
                                {showAll ? 'Show less' : `Show all (${notifications.length})`}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default NotificationBell;
