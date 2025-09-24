import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export interface NotificationItem {
  id: string; // unique id for notification (can be `${reqId}-${timestamp}`)
  reqId?: number;
  title: string;
  description?: string;
  from?: string;
  createdAt: string; // ISO
  read: boolean;
}

interface NotificationsContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  addNotification: (n: Omit<NotificationItem, 'id' | 'read' | 'createdAt'> & { id?: string; createdAt?: string; read?: boolean }) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  clear: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const addNotification = useCallback((n: Omit<NotificationItem, 'id' | 'read' | 'createdAt'> & { id?: string; createdAt?: string; read?: boolean }) => {
    const id = n.id ?? `${n.reqId ?? 'notif'}-${Date.now()}`;
    const createdAt = n.createdAt ?? new Date().toISOString();
    setNotifications(prev => [{ id, title: n.title, description: n.description, from: n.from, reqId: n.reqId, createdAt, read: n.read ?? false }, ...prev]);
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const clear = useCallback(() => setNotifications([]), []);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const value = useMemo<NotificationsContextValue>(() => ({ notifications, unreadCount, addNotification, markAllRead, markRead, clear }), [notifications, unreadCount, addNotification, markAllRead, markRead, clear]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
};
