import React, { useEffect, useRef } from 'react';
import { notification } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationsContext';

interface NotificationSnapshot {
  estadoId: number;
  avance: number;
}

export const NotificationWatcher: React.FC<{ intervalMs?: number }> = ({ intervalMs = 3000 }) => {
  const {
    getRequerimientosRecibidosNotificaciones,
    getRequerimientoEstados,
    datosLogin,
    selectedEmergenciaId,
  } = useAuth();
  const snapshotsRef = useRef<Map<string, NotificationSnapshot>>(new Map());
  const estadosMapRef = useRef<Map<number, string>>(new Map());
  const navigate = useNavigate();
  const { addNotification } = useNotifications();

  useEffect(() => {
    let isMounted = true;
    let timer: number | undefined;

    const getEstadoNombre = (estadoId: number) =>
      estadosMapRef.current.get(estadoId) || `Estado ${estadoId}`;

    const getNotificationKey = (item: any) => {
      const recursoId = Number(item?.requerimiento_recurso_id ?? item?.id ?? 0);
      return `${item?.tipo_notificacion || 'notificacion'}:${recursoId}`;
    };

    const getSnapshot = (item: any): NotificationSnapshot => ({
      estadoId: Number(item?.requerimiento_estado_id ?? 0),
      avance: Number(item?.porcentaje_avance ?? 0),
    });

    const showNotification = (item: any, showPopup = true) => {
      const tipo = item?.tipo_notificacion === 'retornado' ? 'retornado' : 'recibido';
      const recursoId = Number(item?.requerimiento_recurso_id ?? item?.id ?? 0);
      const numero = String(item?.requerimiento_numero || recursoId);
      const estadoId = Number(item?.requerimiento_estado_id ?? 0);
      const avance = Number(item?.porcentaje_avance ?? 0);
      const estadoNombre = getEstadoNombre(estadoId);
      const isRecibido = tipo === 'recibido';
      const title = isRecibido
        ? `Nuevo requerimiento recibido ${numero}`
        : `Requerimiento enviado actualizado ${numero}`;
      const description = isRecibido
        ? `De: ${item?.usuario_emisor || item?.creador || '-'} | Estado: ${estadoNombre} | Avance: ${avance}%`
        : `Estado: ${estadoNombre} | Avance: ${avance}%`;
      const path = isRecibido
        ? `/requerimientos/recibidos/nuevo?id=${recursoId}&requerimiento_numero=${encodeURIComponent(numero)}&requerimientoRecursoId=${recursoId}`
        : '/requerimientos/enviados';
      const notificationId = `${getNotificationKey(item)}:${estadoId}:${avance}:${item?.creacion || ''}`;

      addNotification({
        id: notificationId,
        reqId: recursoId,
        title,
        description,
        from: item?.usuario_emisor || item?.creador || '',
        createdAt: item?.creacion || new Date().toISOString(),
        path,
      });

      if (showPopup) {
        notification.info({
          message: title,
          description: (
            <>
              Estado: {estadoNombre}
              <br />
              Avance: {avance}%
            </>
          ),
          onClick: () => navigate(path),
          placement: 'topRight',
        });
      }
    };

    const loadInitial = async () => {
      const [estados, list] = await Promise.all([
        getRequerimientoEstados(),
        getRequerimientosRecibidosNotificaciones(),
      ]);
      if (!isMounted) return;

      estadosMapRef.current = new Map((estados || []).map((estado: any) => [estado.id, estado.nombre]));
      snapshotsRef.current.clear();
      const initialItems = [...(list || [])].sort((a: any, b: any) => {
        const aTime = new Date(a?.creacion || 0).getTime();
        const bTime = new Date(b?.creacion || 0).getTime();
        return aTime - bTime;
      });
      for (const item of initialItems) {
        showNotification(item, false);
        snapshotsRef.current.set(getNotificationKey(item), getSnapshot(item));
      }
    };

    const poll = async () => {
      try {
        const list = await getRequerimientosRecibidosNotificaciones();
        if (!isMounted) return;

        for (const item of list || []) {
          const key = getNotificationKey(item);
          const previous = snapshotsRef.current.get(key);
          const current = getSnapshot(item);
          const isNew = !previous;
          const isReturnedChange =
            item?.tipo_notificacion === 'retornado' &&
            (previous?.estadoId !== current.estadoId || previous?.avance !== current.avance);

          if (isNew || isReturnedChange) {
            showNotification(item);
          }
          snapshotsRef.current.set(key, current);
        }
      } catch {
        // The next polling cycle retries without interrupting the application.
      }
    };

    const hasToken = Boolean(localStorage.getItem('token'));
    const userId = Number(datosLogin?.usuario_id ?? localStorage.getItem('userId') ?? 0);
    if (hasToken && userId > 0) {
      void loadInitial().then(() => {
        if (!isMounted) return;
        timer = window.setInterval(poll, intervalMs);
      });
    }

    return () => {
      isMounted = false;
      if (timer) window.clearInterval(timer);
    };
  }, [
    addNotification,
    datosLogin?.usuario_id,
    getRequerimientoEstados,
    getRequerimientosRecibidosNotificaciones,
    intervalMs,
    navigate,
    selectedEmergenciaId,
  ]);

  return null;
};

export default NotificationWatcher;
