import React, { useEffect, useRef } from 'react';
import { notification } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationsContext';

// Polls for new requerimientos recibidos for the logged-in user and shows a notification when new ones arrive
export const NotificationWatcher: React.FC<{ intervalMs?: number }>= ({ intervalMs = 3000 }) => {
  const { getRequerimientosEnviados, getRequerimientoEstados, datosLogin } = useAuth();
  const seenIdsRef = useRef<Set<number>>(new Set());
  const lastSnapshotRef = useRef<Map<number, { estadoId?: number; avance?: number }>>(new Map());
  const estadosMapRef = useRef<Map<number, string>>(new Map());
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

    const loadEstados = async () => {
      try {
        const estados = await getRequerimientoEstados();
        estadosMapRef.current = new Map((estados || []).map((e: any) => [e.id, e.nombre]));
      } catch {}
    };

    const getEstadoNombre = (estadoId?: number) => {
      if (typeof estadoId !== 'number') return 'Solicitado';
      return estadosMapRef.current.get(estadoId) || `Estado ${estadoId}`;
    };

    const loadInitial = async () => {
      try {
        await loadEstados();
        const list = await getRequerimientosEnviados();
        if (!isMounted) return;
        // eslint-disable-next-line no-console
        console.log('[NotificationWatcher] initial list size:', Array.isArray(list) ? list.length : 'n/a');
        for (const r of list) {
          const id = (r as any).id ?? (r as any).requerimiento_id;
          if (typeof id !== 'number') continue;
          if (!seenIdsRef.current.has(id)) {
            seenIdsRef.current.add(id);
          }
          lastSnapshotRef.current.set(id, {
            estadoId: (r as any).requerimiento_estado_id,
            avance: (r as any).porcentaje_avance,
          });
        }
      } catch {}
    };

    const poll = async () => {
      try {
        const list = await getRequerimientosEnviados();
        if (!isMounted) return;
        // eslint-disable-next-line no-console
        console.log('[NotificationWatcher] poll list size:', Array.isArray(list) ? list.length : 'n/a');
        for (const r of list) {
          const id = (r as any).id ?? (r as any).requerimiento_id;
          if (typeof id !== 'number') continue;
          if (!seenIdsRef.current.has(id)) {
            seenIdsRef.current.add(id);
            lastSnapshotRef.current.set(id, {
              estadoId: (r as any).requerimiento_estado_id,
              avance: (r as any).porcentaje_avance,
            });
            continue;
          }

          const prev = lastSnapshotRef.current.get(id);
          const nextEstadoId = (r as any).requerimiento_estado_id;
          const nextAvance = (r as any).porcentaje_avance;
          const estadoCambio = typeof nextEstadoId === 'number' && nextEstadoId !== prev?.estadoId;
          const avanceCambio = typeof nextAvance === 'number' && nextAvance !== prev?.avance;
          if (estadoCambio || avanceCambio) {
            const nuevoEstado = getEstadoNombre(nextEstadoId);
            const avanceLabel = typeof nextAvance === 'number' ? `${nextAvance}%` : 'N/A';
            addNotification({
              reqId: id,
              title: `Requerimiento actualizado REQ-${id}`,
              description: `Estado: ${nuevoEstado} • Avance: ${avanceLabel}`,
            });
            openNotificationWithIcon(
              'info',
              `Requerimiento actualizado REQ-${id}`,
              (<>
                Estado: {nuevoEstado}
                <br />
                Avance: {avanceLabel}
              </>),
              () => navigate(`/requerimientos/enviados`),
            );
          }
          lastSnapshotRef.current.set(id, {
            estadoId: nextEstadoId,
            avance: nextAvance,
          });
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
