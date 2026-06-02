import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputNumber } from 'primereact/inputnumber';
import { useAuth } from '../../../context/AuthContext';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Tag, Breadcrumb, Progress, message } from 'antd';
import {
  HuellaAccionLogId,
  registrarHuellaMovimiento,
} from '../../../utils/requerimientoHuellaLog';

interface Recurso {
  id: number;
  grupo: string;
  grupoId: number;
  grupoDescripcion?: string;
  tipo: string;
  tipoId: number;
  institucionDuenaId?: number;
  recursosComplementarios?: string;
  caracteristicasTecnicas?: string;
  cantidad: number;
  costo: number;
  especificacionesAdicionales?: string;
  destinoUbicacion?: string;
  activo: boolean;
}

interface RespuestaHistorialItem {
  id?: number;
  requerimiento_id: number;
  fecha_respuesta: string; // ISO
  responsable: string;
  requerimiento_estado_id: number;
  requerimiento_estado_nombre?: string;
  porcentaje_avance: number;
  situacion_actual: string;
}

interface RequerimientoRecibido {
  creacion: string,
  creador: string,
  emergencia_id: number,
  fecha_fin: string,
  fecha_inicio: string,
  id: number,
  modificacion: string,
  modificador: string,
  porcentaje_avance: number,
  requerimiento_estado_id: number,
  usuario_emisor_id: number,
  usuario_receptor_id: number
}

interface InventarioAsignacionRow {
  id: number;
  nombre_institucion: string;
  provincia: string;
  canton: string;
  parroquia: string;
  existencias: number;
  disponible: number;
  asignado_requerimiento: number;
  requerimiento_respuesta_id: number;
  cantidadAsignada: number;
  recurso_tipo_id: number;
  mesa_id: number;
  coe_id: number;
  institucion_duena_id: number;
}

interface RequerimientoRespuestaRecord {
  id: number;
  activo: boolean;
  cantidad_asignada: number;
  factor: number;
  modificacion: string;
  modificador: string;
  porcentaje_avance: number;
  recurso_inventario_id: number;
  requerimiento_recurso_id: number;
  responsable: string;
  respuesta_estado_id: number;
  respuesta_fecha: string;
  situacion_actual: string;
}


export const NuevoRequerimientoRecibido: React.FC = () => {
  const [searchParams] = useSearchParams();
  const _navigate = useNavigate();
  const editId = useMemo(() => {
    const idStr = searchParams.get('id');
    const n = idStr ? Number(idStr) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [searchParams]);
  const editNumero = useMemo(() => {
    const raw = searchParams.get('requerimiento_numero') || searchParams.get('numero') || '';
    return String(raw).trim() || null;
  }, [searchParams]);
  const cantidadSolicitadaParam = useMemo(() => {
    const raw = searchParams.get('cantidadSolicitada');
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [searchParams]);
  const requerimientoRecursoIdParam = useMemo(() => {
    const raw = searchParams.get('requerimientoRecursoId');
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [searchParams]);
  const grupoRequerimientoParam = useMemo(() => searchParams.get('grupoRequerimiento') || '', [searchParams]);
  const tipoRequerimientoParam = useMemo(() => searchParams.get('tipoRequerimiento') || '', [searchParams]);
  // Datos del requerimiento
  const [numero, setNumero] = useState<string>('REQ-0000');
  const [fechaSolicitud, setFechaSolicitud] = useState<Date | null>(new Date());
  const [fechaInicio, setFechaInicio] = useState<Date | null>(null);
  const [fechaFin, setFechaFin] = useState<Date | null>(null);
  const [mtt, setMtt] = useState<string | null>(null);
  // const [nivelCoe, setNivelCoe] = useState<string>('Provincial');

  // Recursos
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [showRecursoDialog, setShowRecursoDialog] = useState(false);
  const [recursoDraft, setRecursoDraft] = useState<Partial<Recurso>>({ cantidad: 1 });
  const [showDetalleDialog, setShowDetalleDialog] = useState<boolean>(false);
  const [showHistorialDialog, setShowHistorialDialog] = useState<boolean>(false);

  const { datosLogin, authFetch, loadReceptores, receptores, receptoresStatus, recursoGrupos, recursoGruposStatus, recursoTipos, recursoTiposStatus, loadRecursoGrupos, loadRecursoTipos, createRequerimiento, createRequerimientoRecurso, getRequerimientoById, getRequerimientoRecursos, getRecursoTiposByGrupo, getRequerimientoEstados } = useAuth();
  const isReadOnly = false; // En respuestas, permitimos edición
  const apiBase = process.env.REACT_APP_API_URL || '/api';


  // Respuesta actual (formulario)
  const [fechaRespuesta, setFechaRespuesta] = useState<Date>(new Date());
  const [responsable, setResponsable] = useState<string>('');
  const [avance, setAvance] = useState<number>(0);
  const [situacion, setSituacion] = useState<string>('');

  // Estados del requerimiento para resolver ID automatico
  const [estados, setEstados] = useState<Array<{ id: number; nombre: string }>>([]);
  const [inventarioRows, setInventarioRows] = useState<InventarioAsignacionRow[]>([]);
  const [inventarioStatus, setInventarioStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [messageApi, messageContextHolder] = message.useMessage();

  // Historial
  const [historial, setHistorial] = useState<RespuestaHistorialItem[]>([]);
  const [respuestasPreviasByInventarioId, setRespuestasPreviasByInventarioId] = useState<Record<number, RequerimientoRespuestaRecord>>({});
  const editLoadKeyRef = useRef<string>('');

  //requerimiento
  const [requerimiento, setRequerimiento] = useState<RequerimientoRecibido[]>([]);

  useEffect(() => {
    if (datosLogin && receptoresStatus === 'idle') {
      loadReceptores();
    }
    if (recursoGruposStatus === 'idle') {
      loadRecursoGrupos();
    }
  }, [datosLogin, receptoresStatus, loadReceptores, recursoGruposStatus, loadRecursoGrupos]);

  // Carga estados y valores por defecto
  useEffect(() => {
    (async () => {
      const ests = await getRequerimientoEstados();
      setEstados(ests || []);
      if (datosLogin && !responsable) setResponsable(datosLogin.usuario_login);
    })();
  }, [getRequerimientoEstados, datosLogin, responsable]);

  const resolveEstadoIdByAvance = useCallback((porcentaje: number): number => {
    const targetName = porcentaje >= 100 ? 'completado' : 'en proceso';
    const found = estados.find((e) => (e.nombre || '').toLowerCase().includes(targetName));
    if (found) return found.id;
    // fallback defensivo si catalogo no coincide literalmente
    return porcentaje >= 100
      ? (estados[estados.length - 1]?.id ?? 0)
      : (estados[0]?.id ?? 0);
  }, [estados]);

  const handleCantidadAsignadaChange = (rowId: number, value: number | null) => {
    const parsed = Math.floor(Number(value ?? 0));
    const saneValue = Number.isFinite(parsed) ? parsed : 0;
    const bounded = Math.max(0, saneValue);
    const row = inventarioRows.find((it) => it.id === rowId);
    if (row && bounded > row.existencias) {
      messageApi.error(`Cantidad asignada no puede superar existencias (${row.existencias}).`);
    }
    setInventarioRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        return { ...row, cantidadAsignada: bounded };
      })
    );
  };

  const totalCantidadAsignada = useMemo(
    () => inventarioRows.reduce((acc, row) => acc + Math.max(0, Number(row.cantidadAsignada || 0)), 0),
    [inventarioRows]
  );

  const recursoInventarioSeleccionado = useMemo(() => {
    if (recursos.length === 0) return null;
    const recursoTipoIdActual = inventarioRows[0]?.recurso_tipo_id;
    if (!recursoTipoIdActual) return recursos[0];
    return recursos.find((r) => r.tipoId === recursoTipoIdActual) || recursos[0];
  }, [recursos, inventarioRows]);

  const cantidadSolicitada = useMemo(() => {
    const cantidadRecurso = Math.max(0, Number(recursoInventarioSeleccionado?.cantidad ?? 0));
    if (cantidadRecurso > 0) return cantidadRecurso;
    return cantidadSolicitadaParam;
  }, [recursoInventarioSeleccionado, cantidadSolicitadaParam]);

  const diferenciaCantidad = useMemo(() => cantidadSolicitada - totalCantidadAsignada, [cantidadSolicitada, totalCantidadAsignada]);

  const loadInventarioAsignacion = useCallback(async (recursoTipoId: number) => {
    if (!recursoTipoId || !datosLogin?.coe_id || !datosLogin?.mesa_id) {
      setInventarioRows([]);
      setInventarioStatus('idle');
      return;
    }

    setInventarioStatus('loading');
    try {
      const endpoint = `${apiBase}/recursos_inventario/coe_id/${datosLogin.coe_id}/mesa_id/${datosLogin.mesa_id}/recurso_tipo_id/${recursoTipoId}/recurso_requerimiento_id/${requerimientoRecursoIdParam}`;
      const res = await authFetch(endpoint, { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error('inventario_not_ok');
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      const rows: InventarioAsignacionRow[] = list.map((it: any) => ({
        id: Number(it?.id ?? 0),
        nombre_institucion: String(it?.nombre_institucion ?? ''),
        provincia: String(it?.provincia ?? ''),
        canton: String(it?.canton ?? ''),
        parroquia: String(it?.parroquia ?? ''),
        existencias: Math.max(0, Number(it?.existencias ?? 0)),
        disponible: Math.max(0, Number(it?.disponible ?? 0)),
        asignado_requerimiento: Math.max(0, Number(it?.asignado_requerimiento ?? 0)),
        requerimiento_respuesta_id: Math.max(0, Number(it?.requerimiento_respuesta_id ?? 0)),
        cantidadAsignada: Math.max(0, Number(it?.disponible ?? 0)) > 0
          ? Math.max(0, Number(it?.asignado_requerimiento ?? 0))
          : 0,
        recurso_tipo_id: Number(it?.recurso_tipo_id ?? recursoTipoId),
        mesa_id: Number(it?.mesa_id ?? datosLogin.mesa_id),
        coe_id: Number(it?.coe_id ?? datosLogin.coe_id),
        institucion_duena_id: Number(it?.institucion_duena_id ?? 0),
      }));
      setInventarioRows(rows);
      setInventarioStatus('ready');
    } catch (e) {
      setInventarioRows([]);
      setInventarioStatus('error');
    }
  }, [apiBase, authFetch, datosLogin, requerimientoRecursoIdParam]);

  const loadRequerimiento = useCallback(async (rid: number) => {
    try {
      // Nuevo endpoint: trae historial por requerimiento_id
      const res = await authFetch(`${apiBase}/requerimientos/recibidos/${rid}`, {
        headers: { accept: 'application/json' },
      });
      if (!res.ok) {
        setRequerimiento([]);
        return;
      }
      const data = (await res.json()) as any[];
      const mapped: RequerimientoRecibido[] = data.map((d: any) => ({
        id: d.id,
        creacion: d.creacion,
        creador: d.creador,
        modificacion: d.modificacion ?? d.creacion,
        modificador: d.modificador ?? d.creador,
        emergencia_id: d.emergencia_id,
        fecha_fin: d.fecha_fin,
        fecha_inicio: d.fecha_inicio,
        porcentaje_avance: d.porcentaje_avance,
        requerimiento_estado_id: d.requerimiento_estado_id,
        usuario_emisor_id: d.usuario_emisor_id,
        usuario_receptor_id: d.usuario_receptor_id,
      }));
      setRequerimiento(mapped);
    } catch (e) {
      setRequerimiento([]);
    }
  }, [apiBase]);

  const mapRespuestasPreviasByInventarioId = useCallback((records: any[] | Record<string, any>): Record<number, RequerimientoRespuestaRecord> => {
    const nextByInventarioId: Record<number, RequerimientoRespuestaRecord> = {};
    const normalizedRecords = Array.isArray(records)
      ? records
      : (records && typeof records === 'object' ? [records] : []);
    for (const d of normalizedRecords) {
      const inventarioId = Number(
        d?.recurso_inventario_id
        ?? d?.inventario_id
        ?? d?.recursoInventarioId
        ?? 0
      );
      if (!inventarioId) continue;
      const currentId = Number(d?.id ?? 0);
      const prevId = Number(nextByInventarioId[inventarioId]?.id ?? 0);
      if (prevId > currentId) continue;
      nextByInventarioId[inventarioId] = {
        id: currentId,
        activo: Boolean(d?.activo ?? true),
        cantidad_asignada: Number(d?.cantidad_asignada ?? 0),
        factor: Number(d?.factor ?? 0),
        modificacion: String(d?.modificacion ?? d?.creacion ?? new Date().toISOString()),
        modificador: String(d?.modificador ?? d?.creador ?? ''),
        porcentaje_avance: Number(d?.porcentaje_avance ?? 0),
        recurso_inventario_id: inventarioId,
        requerimiento_recurso_id: Number(d?.requerimiento_recurso_id ?? 0),
        responsable: String(d?.responsable ?? d?.creador ?? ''),
        respuesta_estado_id: Number(d?.respuesta_estado_id ?? 0),
        respuesta_fecha: String(d?.respuesta_fecha ?? d?.fecha_respuesta ?? d?.creacion ?? new Date().toISOString()),
        situacion_actual: String(d?.situacion_actual ?? d?.descripcion ?? ''),
      };
    }
    return nextByInventarioId;
  }, []);

  const loadHistorial = useCallback(async (rid: number) => {
    try {
      // Nuevo endpoint: trae historial por requerimiento_id
      const res = await authFetch(`${apiBase}/requerimiento-respuestas/${rid}`, {
        headers: { accept: 'application/json' },
      });
      if (!res.ok) {
        setHistorial([]);
        return;
      }
      const raw = await res.json();
      const data = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? [raw] : []);
      const mapped: RespuestaHistorialItem[] = data.map((d: any) => ({
        id: d.id,
        requerimiento_id: d.requerimiento_id ?? rid,
        fecha_respuesta: d.respuesta_fecha || d.fecha_respuesta || d.creacion || new Date().toISOString(),
        responsable: d.responsable || d.creador || '',
        requerimiento_estado_id: d.respuesta_estado_id ?? d.requerimiento_estado_id ?? d.estado_id ?? 0,
        requerimiento_estado_nombre: d.respuesta_estado_nombre || d.estado || d.requerimiento_estado_nombre,
        porcentaje_avance: typeof d.porcentaje_avance === 'number' ? d.porcentaje_avance : 0,
        situacion_actual: d.situacion_actual || d.descripcion || '',
      }));
      const nextByInventarioId = mapRespuestasPreviasByInventarioId(data);
      setHistorial(mapped);
      setRespuestasPreviasByInventarioId(nextByInventarioId);
    } catch (e) {
      setHistorial([]);
      setRespuestasPreviasByInventarioId({});
    }
  }, [apiBase, mapRespuestasPreviasByInventarioId]);

  // Load existing requerimiento (detalle), recursos, historial cuando hay id
  useEffect(() => {
    const loadForEdit = async () => {
      if (!editId && !editNumero) return;

      if (editNumero) {
        const encodedNumero = encodeURIComponent(editNumero);
        const endpoints = [
          `${apiBase}/requerimiento-recursos/requerimiento_numero/${encodedNumero}/usuario_receptor_id/${datosLogin?.usuario_id ?? 0}`
        ];

        let recursosApi: any[] = [];
        for (const url of endpoints) {
          const res = await authFetch(url, { headers: { accept: 'application/json' } });
          if (!res.ok) continue;
          const parsed = await res.json();
          recursosApi = Array.isArray(parsed) ? parsed : [];
          break;
        }

        if (!recursosApi.length) return;

        const first = recursosApi[0];
        const fechaCreacion = first?.creacion ? new Date(first.creacion) : null;
        const fechaModificacion = first?.modificacion ? new Date(first.modificacion) : null;
        setNumero(String(first?.requerimiento_numero || editNumero));
        setFechaSolicitud(fechaCreacion);
        setFechaInicio(fechaCreacion);
        setFechaFin(fechaModificacion);

        if (receptores && receptores.length > 0) {
          const rec = receptores.find((r) => Number(r.usuario_id) === Number(first?.usuario_receptor_id ?? 0));
          if (rec) {
            setMtt(`${rec.mesa_id}-${rec.siglas}-${rec.usuario_id}`);
          }
        }

        const recursosRows: Recurso[] = [];
        for (const r of recursosApi) {
          const grupoId = Number(r?.recurso_grupo_id ?? 0);
          const tipoId = Number(r?.recurso_tipo_id ?? 0);
          const grupo = recursoGrupos.find((g) => g.id === grupoId);
          let tipo = recursoTipos.find((t) => t.id === tipoId);
          if (!tipo && grupoId > 0) {
            const tipos = await getRecursoTiposByGrupo(grupoId);
            tipo = tipos.find((t) => t.id === tipoId);
          }

          recursosRows.push({
            id: Number(r?.id ?? 0),
            grupo: String(r?.recurso_grupo_nombre ?? grupo?.nombre ?? `Grupo ${grupoId}`),
            grupoId,
            grupoDescripcion: grupo?.descripcion,
            tipo: String(r?.recurso_tipo_nombre ?? tipo?.nombre ?? `Tipo ${tipoId}`),
            tipoId,
            institucionDuenaId: Number(r?.institucion_duena_id ?? r?.institucion_id ?? 0),
            recursosComplementarios: tipo?.complemento,
            caracteristicasTecnicas: tipo?.descripcion,
            cantidad: Number(r?.cantidad_solicitada ?? r?.cantidad ?? 0),
            costo: Number(r?.costo ?? 0),
            especificacionesAdicionales: String(r?.especificaciones ?? ''),
            destinoUbicacion: String(r?.destino ?? ''),
            activo: Boolean(r?.activo ?? true),
          });
        }

        if (recursosRows.length) {
          setRecursos(recursosRows);
          await loadInventarioAsignacion(recursosRows[0].tipoId);
        }

        if (editId) {
          await loadHistorial(editId);
        } else {
          setHistorial([]);
        }
        return;
      }

      if (!editId) return;
      // Load requerimiento details
      const req = await getRequerimientoById(editId);
      if (req) {
        setNumero(`REQ-${req.id}`);
        setFechaSolicitud(new Date(req.creacion));
        setFechaInicio(req.fecha_inicio ? new Date(req.fecha_inicio) : null);
        setFechaFin(req.fecha_fin ? new Date(req.fecha_fin) : null);
        // Set receptor MTT dropdown value (we only have usuario_receptor_id; try to find matching receptor)
        if (receptores && receptores.length > 0) {
          const rec = receptores.find(r => r.usuario_id === req.usuario_receptor_id);
          if (rec) {
            setMtt(`${rec.mesa_id}-${rec.siglas}-${rec.usuario_id}`);
          }
        }
      }

      // Load recursos for the requerimiento
      const recursosApi = await getRequerimientoRecursos(editId);
      const recursosRows: Recurso[] = [];

      for (const r of recursosApi) {
        // Ensure we have tipos for the grupo to resolve type name
        let tipoNombre = '';
        let grupoNombre = '';
        const grupo = recursoGrupos.find(g => g.id === r.recurso_grupo_id);
        grupoNombre = grupo?.nombre || `Grupo ${r.recurso_grupo_id}`;
        let tipo = recursoTipos.find(t => t.id === r.recurso_tipo_id);
        if (!tipo) {
          const tipos = await getRecursoTiposByGrupo(r.recurso_grupo_id);
          tipo = tipos.find(t => t.id === r.recurso_tipo_id);
        }
        tipoNombre = tipo?.nombre || `Tipo ${r.recurso_tipo_id}`;

        recursosRows.push({
          id: r.id,
          grupo: grupoNombre,
          grupoId: r.recurso_grupo_id,
          grupoDescripcion: grupo?.descripcion,
          tipo: tipoNombre,
          tipoId: r.recurso_tipo_id,
          institucionDuenaId: Number((r as any)?.institucion_duena_id ?? (r as any)?.institucion_id ?? 0),
          recursosComplementarios: tipo?.complemento,
          caracteristicasTecnicas: tipo?.descripcion,
          cantidad: Number((r as any).cantidad_solicitada ?? r.cantidad ?? 0),
          costo: r.costo,
          especificacionesAdicionales: r.especificaciones,
          destinoUbicacion: r.destino,
          activo: r.activo,
        });
      }

      if (recursosRows.length) setRecursos(recursosRows);
      if (recursosRows.length > 0) {
        await loadInventarioAsignacion(recursosRows[0].tipoId);
      }
      await loadHistorial(editId);
    };

    const currentLoadKey = editNumero ? `numero:${editNumero}` : `id:${editId}`;
    if (editLoadKeyRef.current === currentLoadKey) return;
    editLoadKeyRef.current = currentLoadKey;
    loadForEdit().catch((e) => {
      console.error(e);
      editLoadKeyRef.current = '';
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, authFetch, editId, editNumero, getRequerimientoById, getRequerimientoRecursos, getRecursoTiposByGrupo, recursoGrupos, recursoTipos, loadHistorial, loadInventarioAsignacion, receptores]);

  // const nivelOptions = [
  //   { label: 'Parroquial', value: 'Parroquial' },
  //   { label: 'Cantonal', value: 'Cantonal' },
  //   { label: 'Provincial', value: 'Provincial' },
  //   { label: 'Nacional', value: 'Nacional' },
  // ];

  const openRecurso = () => {
    setRecursoDraft({ cantidad: 1 });
    setShowRecursoDialog(true);
  };

  const handleGrupoChange = (grupoId: number) => {
    setRecursoDraft(prev => ({ ...prev, grupo: grupoId.toString(), grupoId }));
    loadRecursoTipos(grupoId);
  };

  const handleTipoChange = (tipoId: number) => {
    const tipo = recursoTipos.find(t => t.id === tipoId);
    if (tipo) {
      setRecursoDraft(prev => ({
        ...prev,
        tipo: tipo.nombre,
        tipoId,
        recursosComplementarios: tipo.complemento,
        caracteristicasTecnicas: tipo.descripcion,
        costoEstimado: tipo.costo
      }));
    }
  };

  const handleGuardarRespuesta = async () => {
    // if (!editId) {
    //   messageApi.error('No hay un requerimiento seleccionado.');
    //   return;
    // }
    if (!responsable) {
      messageApi.error('Complete los campos obligatorios.');
      return;
    }
    const filasConExceso = inventarioRows.filter((r) => Number(r.cantidadAsignada) > Number(r.existencias));
    if (filasConExceso.length > 0) {
      messageApi.error('Existen cantidades asignadas mayores a existencias. Corrija manualmente antes de guardar.');
      return;
    }
    if (diferenciaCantidad < 0) {
      messageApi.error('No se puede guardar porque la diferencia/faltante debe ser mayor a 0.');
      return;
    }
    try {
      const nowIso = (fechaRespuesta || new Date()).toISOString();
      const usuarioActual = datosLogin?.usuario_login || responsable || '';
      const usuarioAccionId = Number(datosLogin?.usuario_id ?? 0);
      const estadoIdAuto = resolveEstadoIdByAvance(avance);
      let secuenciaLog = Number(historial.length ?? 0);
      let respuestasMap = respuestasPreviasByInventarioId;
      const resPrevias = await authFetch(`${apiBase}/requerimiento-respuestas/${editId}`, {
        headers: { accept: 'application/json' },
      });
      if (resPrevias.ok) {
        const rawPrevias = await resPrevias.json();
        const dataPrevias = Array.isArray(rawPrevias)
          ? rawPrevias
          : (rawPrevias && typeof rawPrevias === 'object' ? [rawPrevias] : []);
        respuestasMap = mapRespuestasPreviasByInventarioId(dataPrevias);
        setRespuestasPreviasByInventarioId(respuestasMap);
      }

      const rowsToUpdate = inventarioRows.filter((r) => Number(r.requerimiento_respuesta_id) > 0);
      const rowsToCreate = inventarioRows.filter((r) => Number(r.requerimiento_respuesta_id) <= 0 && Number(r.cantidadAsignada) > 0);
      if (rowsToUpdate.length === 0 && rowsToCreate.length === 0) {
        messageApi.error('Debe ingresar al menos una cantidad asignada mayor a cero.');
        return;
      }

      for (const row of rowsToUpdate) {
        const existente = respuestasMap[row.id];
        const respuestaId = Number(row.requerimiento_respuesta_id ?? existente?.id ?? 0);
        if (!respuestaId) {
          messageApi.error('No se pudo resolver la respuesta previa para actualizar.');
          return;
        }

        const payload = {
          activo: existente?.activo ?? true,
          cantidad_asignada: Number(row.cantidadAsignada),
          factor: Number(existente?.factor ?? 1),
          modificacion: nowIso,
          modificador: usuarioActual,
          porcentaje_avance: Number(existente?.porcentaje_avance ?? avance),
          recurso_inventario_id: Number(row.id ?? 0),
          requerimiento_recurso_id: Number(existente?.requerimiento_recurso_id ?? requerimientoRecursoIdParam ?? 0),
          responsable: existente?.responsable || responsable,
          respuesta_estado_id: Number(existente?.respuesta_estado_id ?? estadoIdAuto),
          respuesta_fecha: existente?.respuesta_fecha || nowIso,
          situacion_actual: existente?.situacion_actual || situacion,
        };

        const res = await authFetch(`${apiBase}/requerimiento-respuestas/${respuestaId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          messageApi.error('No se pudo actualizar una o mas respuestas del inventario.');
          return;
        }

        secuenciaLog += 1;
        void registrarHuellaMovimiento({
          apiBase,
          authFetch,
          context: 'recibidos:actualizar_respuesta_inventario',
          params: {
            accionId: HuellaAccionLogId.ASIGNAR_REQUERIMIENTO,
            usuarioAccionId,
            cantidadAsignada: Number(row.cantidadAsignada ?? 0),
            cantidadSolicitada: Number(cantidadSolicitada ?? 0),
            coeOrigenId: Number(datosLogin?.coe_id ?? 0),
            coeDestinoId: Number(row.coe_id ?? 0),
            mesaOrigenId: Number(datosLogin?.mesa_id ?? 0),
            mesaDestinoId: Number(row.mesa_id ?? 0),
            recursoGrupoId: Number(recursoInventarioSeleccionado?.grupoId ?? 0),
            recursoInventarioId: Number(row.id ?? 0),
            recursoTipoId: Number(row.recurso_tipo_id ?? 0),
            requerimientoNumero: String(numero || ''),
            requerimientoRecursoId: Number(payload.requerimiento_recurso_id ?? 0),
            respuestaEstadoId: Number(payload.respuesta_estado_id ?? 0),
            respuestaFecha: String(payload.respuesta_fecha ?? nowIso),
            secuencia: secuenciaLog,
          },
        });
      }

      for (const row of rowsToCreate) {
        const recursoRelacion = recursos.find((r) => r.tipoId === row.recurso_tipo_id);
        const requerimientoRecursoId = requerimientoRecursoIdParam || Number(recursoRelacion?.id ?? 0);
        const recursoInventarioId = Number(row.id ?? 0);
        if (!requerimientoRecursoId) {
          messageApi.error(`No se pudo resolver requerimiento_recurso_id para tipo ${row.recurso_tipo_id}.`);
          return;
        }

        const payload = {
          activo: true,
          cantidad_asignada: Number(row.cantidadAsignada),
          creador: usuarioActual,
          factor: 1,
          modificacion: nowIso,
          modificador: usuarioActual,
          porcentaje_avance: avance,
          recurso_inventario_id: recursoInventarioId,
          requerimiento_recurso_id: requerimientoRecursoId,
          responsable,
          respuesta_estado_id: estadoIdAuto,
          respuesta_fecha: nowIso,
          situacion_actual: situacion,
        };

        const res = await authFetch(`${apiBase}/requerimiento-respuestas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          messageApi.error('No se pudo registrar una o más respuestas del inventario.');
          return;
        }

        secuenciaLog += 1;
        void registrarHuellaMovimiento({
          apiBase,
          authFetch,
          context: 'recibidos:crear_respuesta_inventario',
          params: {
            accionId: HuellaAccionLogId.ASIGNAR_REQUERIMIENTO,
            usuarioAccionId,
            cantidadAsignada: Number(row.cantidadAsignada ?? 0),
            cantidadSolicitada: Number(cantidadSolicitada ?? 0),
            coeOrigenId: Number(datosLogin?.coe_id ?? 0),
            coeDestinoId: Number(row.coe_id ?? 0),
            mesaOrigenId: Number(datosLogin?.mesa_id ?? 0),
            mesaDestinoId: Number(row.mesa_id ?? 0),
            recursoGrupoId: Number(recursoInventarioSeleccionado?.grupoId ?? 0),
            recursoInventarioId: Number(recursoInventarioId ?? 0),
            recursoTipoId: Number(row.recurso_tipo_id ?? 0),
            requerimientoNumero: String(numero || ''),
            requerimientoRecursoId: Number(requerimientoRecursoId ?? 0),
            respuestaEstadoId: Number(estadoIdAuto ?? 0),
            respuestaFecha: nowIso,
            secuencia: secuenciaLog,
          },
        });
      }

      // 2) Actualizar estado del requerimiento
      // const resUpd = await authFetch(`${apiBase}/requerimientos/${editId}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ porcentaje_avance: avance, requerimiento_estado_id: estadoIdAuto }),
      // });
      // if (!resUpd.ok) {
      //   messageApi.warning('Respuestas guardadas, pero no se pudo actualizar el estado del requerimiento.');
      // } else {
      //   secuenciaLog += 1;
      //   void registrarHuellaMovimiento({
      //     apiBase,
      //     authFetch,
      //     context: 'recibidos:cambiar_estado_requerimiento',
      //     params: {
      //       accionId: Number(avance) >= 100
      //         ? HuellaAccionLogId.FINALIZAR_REQUERIMIENTO
      //         : HuellaAccionLogId.INICIAR_PROCESAMIENTO,
      //       usuarioAccionId,
      //       cantidadSolicitada: Number(cantidadSolicitada ?? 0),
      //       coeOrigenId: Number(datosLogin?.coe_id ?? 0),
      //       mesaOrigenId: Number(datosLogin?.mesa_id ?? 0),
      //       requerimientoNumero: String(numero || ''),
      //       requerimientoRecursoId: Number(requerimientoRecursoIdParam ?? 0),
      //       respuestaEstadoId: Number(estadoIdAuto ?? 0),
      //       respuestaFecha: nowIso,
      //       secuencia: secuenciaLog,
      //     },
      //   });
      // }

      // 3) Refrescar historial y UI
      setFechaRespuesta(new Date());
      setSituacion('');
      await loadHistorial(editId);
      messageApi.success('Respuesta guardada.');
    } catch (e) {
      messageApi.error('Error al guardar la respuesta.');
      console.error(e);
    }
  };

  return (
    <div className="container-fluid">
      {messageContextHolder}
      <div className="mb-2">
        <Breadcrumb
          items={[
            { title: <Link to="/">Inicio</Link> },
            { title: <Link to="/requerimientos/recibidos">Requerimientos Recibidos</Link> },
            { title: editId ? `Ver REQ-${editId}` : (editNumero ? `Ver ${editNumero}` : 'Nuevo Requerimiento') },
          ]}
        />
      </div>
      {/* Respuesta a requerimiento */}
      <div className="col-12">
        <Card>
          <div className="mb-3">
            <h3>Respuesta a Requerimiento</h3>
          </div>
          <div className="container-fluid">
            <div className="row col-12 pb-2">
              <div className="col-lg-3 col-md-6 col-sm-12">
                <label className="label-uniform">Fecha de Respuesta *</label>
                <Calendar value={fechaRespuesta} onChange={(e) => setFechaRespuesta(e.value as Date)} showIcon showTime className="w-full m-1" dateFormat="dd/mm/yy" />
              </div>
              <div className="col-lg-3 col-md-6 col-sm-12">
                <label className="label-uniform">Responsable de Respuesta *</label>
                <InputText value={responsable} onChange={(e) => setResponsable(e.target.value)} className="w-full m-1" placeholder="Nombre del responsable" />
              </div>
              <div className="col-lg-3 col-md-6 col-sm-12">
                <label className="label-uniform">Estado del Requerimiento</label>
                <InputText
                  value={avance >= 100 ? 'Completado' : 'En Proceso'}
                  className="w-full m-1"
                  disabled
                />
              </div>
              <div className="col-lg-3 col-md-6 col-sm-12">
                <label className="label-uniform">Porcentaje de Avance *</label>
                <Dropdown value={avance} options={[0, 25, 50, 75, 100].map(v => ({ label: `${v}%`, value: v }))} onChange={(e) => setAvance(e.value)} className="m-1 w-full" />
              </div>
            </div>

            <div className="row col-12">
              <div className="col-12">
                <div className="flex align-items-center gap-2">
                  <div className="w-full m-1">
                    <Progress percent={avance} showInfo />
                  </div>
                </div>
              </div>
            </div>

            <div className="row col-12">
              <div className="col-12">
                <label className="label-uniform">Situación actual del requerimiento</label>
              </div>
              <div className="col-12">
                <InputTextarea value={situacion} onChange={(e) => setSituacion(e.target.value)} className="w-full m-1" placeholder="Describir la situación actual, avances, dificultades, próximos pasos..." rows={3} autoResize />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="col-12">
        <Card>
          <div className="row">
            <div className="col-12">
              <h3 className="m-0">Inventario para Asignación</h3>
            </div>
            <div className="col-12 mt-2">
              <span><strong>Grupo Recurso:</strong> {recursoInventarioSeleccionado?.grupo || grupoRequerimientoParam || '-'}</span>
              <span className="mx-3"><strong>Tipo Recurso:</strong> {recursoInventarioSeleccionado?.tipo || tipoRequerimientoParam || '-'}</span>
            </div>
          </div>
          <DataTable
            value={inventarioRows}
            emptyMessage={
              inventarioStatus === 'loading'
                ? 'Cargando inventario...'
                : 'Sin inventario disponible para el tipo de recurso.'
            }
            responsiveLayout="scroll"
            size="small"
            style={{ fontSize: '13px' }}
          >
            <Column field="nombre_institucion" header="Institución" />
            <Column field="provincia" header="Provincia" />
            <Column field="canton" header="Cantón" />
            <Column field="parroquia" header="Parroquia" />
            <Column field="existencias" header="Existencias" />
            <Column field="disponible" header="Disponible" />
            <Column
              header="Cantidad Asignada al requerimiento"
              body={(row: InventarioAsignacionRow) => (
                <div>
                  <InputNumber
                    value={row.cantidadAsignada}
                    onValueChange={(e) => handleCantidadAsignadaChange(row.id, typeof e.value === 'number' ? e.value : 0)}
                    mode="decimal"
                    useGrouping={false}
                    min={0}
                    minFractionDigits={0}
                    maxFractionDigits={0}
                    className="w-full"
                  />
                  {row.cantidadAsignada > row.existencias && (
                    <small className="p-error">No puede ser mayor a existencias.</small>
                  )}
                </div>
              )}
            />
          </DataTable>

          <div className="row mt-3">
            <div className="col-md-4"><strong>Total Cantidad Asignada:</strong> {totalCantidadAsignada}</div>
            <div className="col-md-4"><strong>Cantidad Solicitada:</strong> {cantidadSolicitada}</div>
            <div className="col-md-4">
              <strong>Diferencia/Faltante:</strong> {diferenciaCantidad}
              {diferenciaCantidad > 0 ? ' (faltante)' : diferenciaCantidad < 0 ? ' (sobreasignado)' : ''}
            </div>
          </div>

          <div className="row mt-3">
            <div className="col-12 text-end">
              <Button label="Ver Requerimiento" icon="pi pi-info-circle" className="m-1" onClick={() => setShowDetalleDialog(true)} />
              <Button label="Ver Historial" icon="pi pi-history" className="m-1" severity="secondary" onClick={() => setShowHistorialDialog(true)} />
              <Button label="Guardar" icon="pi pi-lock" className="m-1" severity="secondary" onClick={handleGuardarRespuesta} />
            </div>
          </div>
        </Card>
      </div>

      <Dialog
        visible={showHistorialDialog}
        header="Historial de Respuestas"
        onHide={() => setShowHistorialDialog(false)}
        style={{ width: '80vw', maxWidth: '1100px' }}
        modal
      >
        <DataTable value={historial} emptyMessage="Sin respuestas registradas" responsiveLayout="scroll" size="small">
          <Column header="#" body={(row: RespuestaHistorialItem, { rowIndex }) => `#${historial.length - rowIndex}`} style={{ width: '6rem' }} />
          <Column header="Fecha y Hora" body={(row: RespuestaHistorialItem) => (
            <div>
              {new Date(row.fecha_respuesta).toLocaleDateString()}<br />
              <small>{new Date(row.fecha_respuesta).toLocaleTimeString()}</small>
            </div>
          )} />
          <Column header="Responsable" field="responsable" />
          <Column header="Estado del Requerimiento" body={(row: RespuestaHistorialItem) => (
            <Tag color="blue">{row.requerimiento_estado_nombre || (estados.find(e => e.id === row.requerimiento_estado_id)?.nombre || row.requerimiento_estado_id)}</Tag>
          )} />
          <Column header="Progreso" body={(row: RespuestaHistorialItem) => (
            <div style={{ minWidth: 120 }}>
              <Progress percent={row.porcentaje_avance} showInfo size="small" />
            </div>
          )} />
          <Column header="Situación Actual" field="situacion_actual" />
        </DataTable>
      </Dialog>

      {/* Dialogo: Detalle del Requerimiento */}
      <Dialog
        visible={showDetalleDialog}
        header="Detalle del Requerimiento"
        onHide={() => setShowDetalleDialog(false)}
        style={{ width: '640px' }}
        modal
      >
        <div className="grid p-fluid">
          <div className="field col-12"><strong>Número:</strong> {numero}</div>
          <div className="field col-6"><strong>Fecha Solicitud:</strong> {fechaSolicitud ? new Date(fechaSolicitud).toLocaleString() : '-'}</div>
          <div className="field col-6"><strong>Fecha Fin:</strong> {fechaFin ? new Date(fechaFin).toLocaleString() : '-'}</div>
        </div>

        <div className="field col-12 mt-3">
          <h5>Recursos solicitados</h5>
          <DataTable value={recursos} emptyMessage="Sin recursos" responsiveLayout="scroll" size="small">
            <Column field="grupo" header="Grupo" />
            <Column field="tipo" header="Tipo" />
            <Column field="cantidad" header="Cantidad" />
            <Column
              field="costo"
              header="Costo"
              body={(row) => `$${Number(row.costo ?? 0).toFixed(2)}`}
            />
            <Column field="destinoUbicacion" header="Destino" />
            <Column field="especificacionesAdicionales" header="Especificaciones" />
          </DataTable>
        </div>
      </Dialog>

    </div>
  );
};

export default NuevoRequerimientoRecibido;


