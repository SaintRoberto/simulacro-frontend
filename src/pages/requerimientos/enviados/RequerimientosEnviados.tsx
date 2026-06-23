import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import RequerimientosEnviadosAgrupadosTable, {
  RequerimientoEnviadoDetalleRow,
  RequerimientoEnviadoGrupoRow,
  RequerimientoHuellaLogRow,
} from '../../../components/RequerimientosEnviadosAgrupadosTable';

export const RequerimientosEnviados: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { datosLogin, authFetch } = useAuth();
  const apiBase = process.env.REACT_APP_API_URL || '/api';

  const [requerimientos, setRequerimientos] = useState<RequerimientoEnviadoGrupoRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [detalleCache, setDetalleCache] = useState<Record<string, RequerimientoEnviadoDetalleRow[]>>({});
  const loadInFlightRef = useRef(false);
  const loadSequenceRef = useRef(0);
  const handledRefreshKeyRef = useRef<string | number | null>(null);

  const loadRequerimientos = useCallback(async (options?: { silent?: boolean; force?: boolean }) => {
    const silent = options?.silent ?? false;
    const force = options?.force ?? false;
    if (loadInFlightRef.current && silent && !force) {
      return;
    }

    const sequence = ++loadSequenceRef.current;
    const userId = Number(datosLogin?.usuario_id ?? localStorage.getItem('userId'));
    if (!Number.isFinite(userId) || userId <= 0) {
      setRequerimientos([]);
      return;
    }
    loadInFlightRef.current = true;

    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const mapDetalleRows = (list: any[]): RequerimientoEnviadoDetalleRow[] => list.map((row: any) => ({
        id: Number(row?.id ?? 0),
        usuario_receptor: String(row?.usuario_receptor ?? '-'),
        recurso_grupo_nombre: String(row?.recurso_grupo_nombre ?? '-'),
        recurso_tipo_nombre: String(row?.recurso_tipo_nombre ?? '-'),
        cantidad_solicitada: Number(row?.cantidad_solicitada ?? row?.cantidad ?? 0),
        especificaciones: String(row?.especificaciones ?? ''),
        porcentaje_avance: Number(row?.porcentaje_avance ?? 0),
        requerimiento_estado_nombre: String(row?.requerimiento_estado_nombre ?? ''),
        detalle: String(row?.detalle ?? ''),
        requerimiento_id: Number(row?.requerimiento_id ?? 0),
        creacion: String(row?.creacion ?? ''),
      }));

      const url = `${apiBase}/requerimiento-recursos/requerimiento_numero/usuario_emisor_id/${userId}`;
      const res = await authFetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) {
        if (!silent && sequence === loadSequenceRef.current) {
          setRequerimientos([]);
          setError('No se pudo cargar la cabecera agrupada de requerimientos enviados.');
        }
        return;
      }
      const parsed = await res.json();
      const payload = Array.isArray(parsed) ? parsed : [];

      const mapped: RequerimientoEnviadoGrupoRow[] = payload
        .filter((row: any) => String(row?.requerimiento_numero ?? '').trim().length > 0)
        .map((row: any) => {
          const rawDetalle = row?.detalle ?? row?.Detalle ?? row?.detalle_requerimiento ?? row?.descripcion ?? '';
          const detalle = typeof rawDetalle === 'string' ? rawDetalle.trim() : String(rawDetalle ?? '').trim();
          return {
            requerimiento_numero: String(row.requerimiento_numero),
            cantidad_solicitada: Number(row?.cantidad_solicitada ?? 0),
            porcentaje_avance: 0,
            creacion: String(row?.creacion ?? ''),
            detalle,
            estado: row?.estado ? String(row.estado) : 'Iniciada',
          };
        })
        .sort((a, b) => new Date(b.creacion).getTime() - new Date(a.creacion).getTime());

      const detalleEntries = await Promise.all(
        mapped.map(async (item) => {
          const encodedNumero = encodeURIComponent(item.requerimiento_numero);
          const detalleRes = await authFetch(
            `${apiBase}/requerimiento-recursos/requerimiento_numero/${encodedNumero}/usuario_emisor_id/${userId}`,
            { headers: { accept: 'application/json' } }
          );
          if (!detalleRes.ok) return [item.requerimiento_numero, [] as RequerimientoEnviadoDetalleRow[]] as const;
          const detalleParsed = await detalleRes.json();
          const detalleList = Array.isArray(detalleParsed) ? detalleParsed : [];
          return [item.requerimiento_numero, mapDetalleRows(detalleList)] as const;
        })
      );

      const nextDetalleCache: Record<string, RequerimientoEnviadoDetalleRow[]> = {};
      for (const [numero, detalleRows] of detalleEntries) {
        nextDetalleCache[numero] = detalleRows;
      }
      if (sequence !== loadSequenceRef.current) {
        return;
      }
      setError(null);
      setDetalleCache(nextDetalleCache);

      setRequerimientos(
        mapped.map((item) => {
          const detalleRows = nextDetalleCache[item.requerimiento_numero] || [];
          const totalAvance = detalleRows.reduce((sum, row) => sum + Number(row.porcentaje_avance ?? 0), 0);
          const porcentajeGlobal = detalleRows.length > 0 ? Math.round(totalAvance / detalleRows.length) : 0;
          return { ...item, porcentaje_avance: porcentajeGlobal };
        })
      );
    } catch (e) {
      console.error('Error loading grouped requerimientos:', e);
      if (!silent && sequence === loadSequenceRef.current) {
        setRequerimientos([]);
        setError('Ocurrio un error al cargar la informacion.');
      }
    } finally {
      if (sequence === loadSequenceRef.current) {
        loadInFlightRef.current = false;
      }
      if (!silent) {
        setLoading(false);
      }
    }
  }, [apiBase, authFetch, datosLogin?.usuario_id]);

  const loadDetalleByNumero = useCallback(
    async (requerimientoNumero: string): Promise<RequerimientoEnviadoDetalleRow[]> => {
      if (detalleCache[requerimientoNumero]) {
        return detalleCache[requerimientoNumero];
      }

      const encodedNumero = encodeURIComponent(requerimientoNumero);
      const userId = Number(datosLogin?.usuario_id ?? localStorage.getItem('userId') ?? 0);
      const endpoints = [
        `${apiBase}/requerimiento-recursos/requerimiento_numero/${encodedNumero}/usuario_emisor_id/${userId}`,
      ];

      for (const url of endpoints) {
        const res = await authFetch(url, { headers: { accept: 'application/json' } });
        if (!res.ok) continue;
        const parsed = await res.json();
        const list = Array.isArray(parsed) ? parsed : [];
        const mapped: RequerimientoEnviadoDetalleRow[] = list.map((row: any) => ({
          id: Number(row?.id ?? 0),
          usuario_receptor: String(row?.usuario_receptor ?? '-'),
          recurso_grupo_nombre: String(row?.recurso_grupo_nombre ?? '-'),
          recurso_tipo_nombre: String(row?.recurso_tipo_nombre ?? '-'),
          cantidad_solicitada: Number(row?.cantidad_solicitada ?? row?.cantidad ?? 0),
          especificaciones: String(row?.especificaciones ?? ''),
          porcentaje_avance: Number(row?.porcentaje_avance ?? 0),
          requerimiento_estado_id: Number(row?.requerimiento_estado_id ?? 0),
          requerimiento_estado_nombre: String(row?.requerimiento_estado_nombre ?? ''),
          detalle: String(row?.detalle ?? ''),
          requerimiento_id: Number(row?.requerimiento_id ?? 0),
          creacion: String(row?.creacion ?? ''),
        }));

        setDetalleCache((prev) => ({ ...prev, [requerimientoNumero]: mapped }));
        return mapped;
      }

      throw new Error('detalle_not_found');
    },
    [apiBase, authFetch, detalleCache, datosLogin?.usuario_id]
  );

  const loadHuellaLogsByRecurso = useCallback(
    async (requerimientoRecursoId: number): Promise<RequerimientoHuellaLogRow[]> => {
      const res = await authFetch(
        `${apiBase}/requerimiento-huella-logs/requerimiento-recurso/${requerimientoRecursoId}`,
        { headers: { accept: 'application/json' } }
      );

      if (!res.ok) {
        throw new Error('huella_logs_not_found');
      }

      const parsed = await res.json();
      const list = Array.isArray(parsed) ? parsed : [];
      return list.map((row: any) => ({
        id: Number(row?.id ?? 0),
        respuesta_estado: row?.respuesta_estado ?? null,
        requerimiento_respuesta_situacion: row?.requerimiento_respuesta_situacion ?? null,
        respuesta_fecha: row?.respuesta_fecha ?? null,
      }));
    },
    [apiBase, authFetch]
  );

  useEffect(() => {
    loadRequerimientos();
    const refreshSilently = () => {
      void loadRequerimientos({ silent: true });
    };
    const refreshOnVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshSilently();
      }
    };

    window.addEventListener('focus', refreshSilently);
    window.addEventListener('requerimientos-enviados:refresh', refreshSilently);
    document.addEventListener('visibilitychange', refreshOnVisible);
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshSilently();
      }
    }, 15000);

    return () => {
      window.removeEventListener('focus', refreshSilently);
      window.removeEventListener('requerimientos-enviados:refresh', refreshSilently);
      document.removeEventListener('visibilitychange', refreshOnVisible);
      window.clearInterval(intervalId);
    };
  }, [loadRequerimientos]);

  useEffect(() => {
    const refreshState = location.state as { shouldRefresh?: boolean; refreshKey?: string | number } | null;
    if (!refreshState?.shouldRefresh) {
      return;
    }

    const refreshKey = refreshState.refreshKey ?? 'default';
    if (handledRefreshKeyRef.current === refreshKey) {
      return;
    }

    handledRefreshKeyRef.current = refreshKey;
    void loadRequerimientos({ silent: true, force: true });
    navigate(location.pathname, { replace: true, state: {} });
  }, [loadRequerimientos, location.pathname, location.state, navigate]);

  const handleEdit = useCallback(
    (item: RequerimientoEnviadoGrupoRow) => {
      const numero = encodeURIComponent(item.requerimiento_numero);
      navigate(`/requerimientos/enviados/nuevo?requerimiento_numero=${numero}`);
    },
    [navigate]
  );

  const handleDelete = useCallback((item: RequerimientoEnviadoGrupoRow) => {
    setRequerimientos((prev) =>
      prev.filter((row) => row.requerimiento_numero !== item.requerimiento_numero)
    );
    setDetalleCache((prev) => {
      const next = { ...prev };
      delete next[item.requerimiento_numero];
      return next;
    });
  }, []);

  return (
    <Card title="Requerimientos Enviados">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <Button
          label="Nuevo"
          icon="pi pi-plus"
          severity="success"
          onClick={() => navigate('/requerimientos/enviados/nuevo')}
        />
      </div>

      <RequerimientosEnviadosAgrupadosTable
        items={requerimientos}
        loading={loading}
        error={error}
        loadDetalle={loadDetalleByNumero}
        loadHuellaLogs={loadHuellaLogsByRecurso}
        detalleData={detalleCache}
        onRead={() => {}}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </Card>
  );
};

export default RequerimientosEnviados;
