import React, { useEffect, useRef } from 'react';
import { notification } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationsContext';

// Polls for new requerimientos recibidos for the logged-in user and shows a notification when new ones arrive
export const NotificationWatcher: React.FC<{ intervalMs?: number }>= ({ intervalMs = 30000000 }) => {
  const { getRequerimientosRecibidosNotificaciones, datosLogin } = useAuth();
  const seenIdsRef = useRef<Set<number>>(new Set());
  const navigate = useNavigate();
  const location = useLocation();
  const { addNotification } = useNotifications();

  // Helper to standardize how we show notifications
  const openNotificationWithIcon = (
    type: 'success' | 'info' | 'warning' | 'error',
    message: React.ReactNode,
    description?: React.ReactNode,
    onClick?: () => void,
  ) => {
    notification[type]({
      message,
      description,
      onClick,
      placement: 'topRight',
    });
  };

  useEffect(() => {
    let isMounted = true;
    let timer: number | undefined;
    const initializedRef = { current: false } as { current: boolean };

    const loadInitial = async () => {
      try {
        const list = await getRequerimientosRecibidosNotificaciones();
        if (!isMounted) return;
        // eslint-disable-next-line no-console
        console.log('[NotificationWatcher] initial list size:', Array.isArray(list) ? list.length : 'n/a');
        for (const r of list) {
          const id = (r as any).id ?? (r as any).requerimiento_id;
          if (typeof id !== 'number') continue;
          if (!seenIdsRef.current.has(id)) {
            seenIdsRef.current.add(id);
            const emisor = (r as any).usuario_emisor || (r as any).creador || 'Nuevo requerimiento';
            // Seed notifications center with current items as UNREAD
            addNotification({
              id: `req-${id}`,
              reqId: id,
              title: `Requerimiento asignado REQ-${id}`,
              description: `De: ${emisor}`,
              from: emisor,
              read: false,
            });
          }
        }
      } catch {}
    };

    const poll = async () => {
      try {
        const list = await getRequerimientosRecibidosNotificaciones();
        if (!isMounted) return;
        // eslint-disable-next-line no-console
        console.log('[NotificationWatcher] poll list size:', Array.isArray(list) ? list.length : 'n/a');
        for (const r of list) {
          const id = (r as any).id ?? (r as any).requerimiento_id;
          if (typeof id !== 'number') continue;
          if (!seenIdsRef.current.has(id)) {
            seenIdsRef.current.add(id);
            const emisor = (r as any).usuario_emisor || (r as any).creador || 'Nuevo requerimiento';
            // Add to in-app notifications center
            addNotification({
              reqId: id,
              title: 'Nuevo requerimiento asignado',
              description: `De: ${emisor}`,
              from: emisor,
            });
            // Show toast using standardized helper
            openNotificationWithIcon(
              'info',
              'Nuevo requerimiento asignado',
              (<>
                De: {emisor}
                <br />
                Numero de requerimiento: REQ-{id}
              </>),
              () => navigate(`/requerimientos/recibidos`),
            );
          }
        }
      } catch {}
    };

    // Start if we have a logged-in indicator (prefer datosLogin, fallback to localStorage)
    const hasToken = !!localStorage.getItem('token');
    const userIdStr = localStorage.getItem('userId');
    const canStart = !!datosLogin?.usuario_id || (hasToken && !!userIdStr);
    if (canStart) {
      // Debug: indicate watcher started
      // eslint-disable-next-line no-console
      console.log('[NotificationWatcher] starting polling');
      loadInitial();
      // Kick first poll sooner
      timer = window.setInterval(poll, intervalMs) as unknown as number;
      // Also poll immediately once after mount
      poll();
    }

    return () => {
      isMounted = false;
      if (timer) window.clearInterval(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datosLogin?.usuario_id, intervalMs, location.pathname]);

  return null;
};

export default NotificationWatcher;
