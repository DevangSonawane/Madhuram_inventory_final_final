import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch notifications from server
  const fetchNotifications = async () => {
    if (!user || !user.token) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    // Skip fetch for demo token
    if (user.token === 'demo-token') {
       // Keep mock data or empty for demo if needed, but let's stick to the initial mock logic if it was there
       // actually, the previous mock logic was good for demo.
       // We can combine them.
       setLoading(false);
       return; 
    }

    try {
      const response = await fetch('http://localhost:3000/api/v1/notifications', {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        // Transform server data to match UI component expectations if needed
        const formatted = data.data.notifications.map(n => ({
          id: n.notification_id,
          title: n.title || 'Notification',
          message: n.message,
          time: new Date(n.created_at).toLocaleString(), // Simple formatting
          read: n.is_read,
          type: n.type || 'info'
        }));
        setNotifications(formatted);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every minute for new notifications
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [user]);

  // Initial mock data fallback for demo/testing if no real data
  useEffect(() => {
    if (user?.token === 'demo-token' && notifications.length === 0) {
       setTimeout(() => {
        setNotifications([
          {
            id: '1',
            title: 'New Material Request',
            message: 'John Doe requested 50 units of Cement.',
            time: '10 min ago',
            read: false,
            type: 'request'
          },
          {
            id: '2',
            title: 'Low Stock Alert',
            message: 'Sand inventory is below reorder level (100 units).',
            time: '1 hour ago',
            read: false,
            type: 'alert'
          }
        ]);
        setLoading(false);
      }, 1000);
    }
  }, [user]);

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev]);
  };

  const markAsRead = async (id) => {
    // Optimistic update
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );

    if (user?.token && user.token !== 'demo-token') {
      try {
        await fetch(`http://localhost:3000/api/v1/notifications/${id}/read`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        });
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    }
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
    // Note: Backend might not have bulk mark-read endpoint, implementing per-item or skipping for now
  };

  const clearNotification = async (id) => {
    // Optimistic update
    setNotifications(prev => prev.filter(n => n.id !== id));

    if (user?.token && user.token !== 'demo-token') {
      try {
        await fetch(`http://localhost:3000/api/v1/notifications/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        });
      } catch (error) {
        console.error("Failed to delete notification:", error);
      }
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      loading, 
      unreadCount, 
      addNotification,
      markAsRead, 
      markAllAsRead,
      clearNotification 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
