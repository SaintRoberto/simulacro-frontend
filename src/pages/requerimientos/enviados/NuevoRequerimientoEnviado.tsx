import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import type { InputNumberValueChangeEvent } from 'primereact/inputnumber';
import { Steps } from 'primereact/steps';
import type { MenuItem } from 'primereact/menuitem';
import { useAuth } from '../../../context/AuthContext';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { RequerimientoRequest, RequerimientoRecursoRequest } from '../../../context/AuthContext';
import { Breadcrumb, Tag, Progress } from 'antd';
import {
  HuellaAccionLogId,
  HuellaMotivoId,
  registrarHuellaMovimiento,
} from '../../../utils/requerimientoHuellaLog';

type WizardStep = 1 | 2 | 3;

interface RecursoSeleccionado {
  id: number;
  grupo: string;
  grupoId: number;
  tipo: string;
  tipoId: number;
  cantidad: number;
  detalleSolicitudRecurso: string;
  porcentajeAvance: number;
  costoEstimado: number;
  mesaId: number;
  mesaNombre: string;
  mesaSiglas: string;
  mesaUsuarioId: number;
  activo: boolean;
}

interface DisponibilidadMesaRow {
  mesaId: number;
  mesaNombre: string;
  siglas: string;
  usuarioId: number;
  cantidadDisponible: number;
  cantidadSolicitada: number;
  detalleSolicitudRecurso: string;
}

interface EditRecursoContext {
  requerimientoRecursoId: number;
  grupoId: number;
  tipoId: number;
  usuarioReceptorId: number;
  mesaId: number;
  cantidadSolicitada: number;
}

const parseCostoToNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  const raw = String(value || '');
  const numeric = raw.replace(/[^0-9.]/g, '');
  const parsed = Number(numeric);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDateTime = (date: Date | null): string => {
  if (!date) return '-';
  return new Date(date).toLocaleString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const generateUuid = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const NuevoRequerimientoEnviado: React.FC = () => {
  const apiBase = process.env.REACT_APP_API_URL || '/api';
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editId = useMemo(() => {
    const idStr = searchParams.get('id');
    const n = idStr ? Number(idStr) : NaN;
    return Number.isNaN(n) ? null : n;
  }, [searchParams]);
  const editNumero = useMemo(() => {
    const raw = searchParams.get('requerimiento_numero') || searchParams.get('numero') || '';
    return String(raw).trim() || null;
  }, [searchParams]);
  const reqIdParam = useMemo(() => {
    const raw = Number(searchParams.get('req_id') || 0);
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }, [searchParams]);
  const cantidadSolicitadaParam = useMemo(() => {
    const raw = Number(searchParams.get('cantidad_solicitada') || 0);
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
  }, [searchParams]);

  const [wizardStep, setWizardStep] = useState<WizardStep>(1);

  const [numero, setNumero] = useState<string>('REQ-0000');
  const [fechaSolicitud, setFechaSolicitud] = useState<Date | null>(new Date());
  const [fechaInicio, setFechaInicio] = useState<Date | null>(null);
  const [fechaFin, setFechaFin] = useState<Date | null>(null);
  const [detalleRequerimiento, setDetalleRequerimiento] = useState<string>('');

  const [selectedGrupoId, setSelectedGrupoId] = useState<number | null>(null);
  const [selectedTipoId, setSelectedTipoId] = useState<number | null>(null);
  const [disponibilidadRows, setDisponibilidadRows] = useState<DisponibilidadMesaRow[]>([]);
  const [cantidadSolicitadaByKey, setCantidadSolicitadaByKey] = useState<Record<string, number>>({});
  const cantidadSolicitadaByKeyRef = useRef<Record<string, number>>({});
  const [detalleSolicitudByKey, setDetalleSolicitudByKey] = useState<Record<string, string>>({});
  const detalleSolicitudByKeyRef = useRef<Record<string, string>>({});
  const editLoadKeyRef = useRef<string | null>(null);
  const [disponibilidadStatus, setDisponibilidadStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [isEndosoMode, setIsEndosoMode] = useState<boolean>(false);
  const [isSendingEndoso, setIsSendingEndoso] = useState<boolean>(false);
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [editContext, setEditContext] = useState<EditRecursoContext | null>(null);

  const [recursos, setRecursos] = useState<RecursoSeleccionado[]>([]);

  const {
    datosLogin,
    authFetch,
    selectedEmergenciaId,
    loadReceptores,
    receptores,
    receptoresStatus,
    recursoGrupos,
    recursoGruposStatus,
    recursoTipos,
    recursoTiposStatus,
    loadRecursoGrupos,
    loadRecursoTipos,
    createRequerimiento,
    createRequerimientoRecurso,
    getRequerimientoById,
    getRequerimientoRecursos,
    getRecursoTiposByGrupo,
  } = useAuth();

  const isEditMode = !!editId || !!editNumero;
  const isUsuarioNacionalId13 = Number(datosLogin?.usuario_id ?? 0) === 13;

  const steps = useMemo<MenuItem[]>(
    () => [
      { label: 'Paso 1: Datos del Requerimiento' },
      { label: 'Paso 2: Seleccion de Recursos y Mesa' },
      { label: 'Paso 3: Detalle y Resumen' },
    ],
    []
  );

  const mesasUnicas = useMemo(() => {
    const map = new Map<number, { mesaId: number; mesaNombre: string; siglas: string; usuarioId: number }>();
    (receptores || []).forEach((r) => {
      if (!map.has(r.mesa_id)) {
        map.set(r.mesa_id, {
          mesaId: r.mesa_id,
          mesaNombre: r.mesa_nombre,
          siglas: r.siglas,
          usuarioId: r.usuario_id,
        });
      }
    });
    return Array.from(map.values());
  }, [receptores]);

  const mesasAsignadas = useMemo(() => {
    const map = new Map<number, { mesaId: number; mesaNombre: string; siglas: string; usuarioId: number }>();
    recursos.forEach((r) => {
      if (!map.has(r.mesaId)) {
        map.set(r.mesaId, {
          mesaId: r.mesaId,
          mesaNombre: r.mesaNombre,
          siglas: r.mesaSiglas,
          usuarioId: r.mesaUsuarioId,
        });
      }
    });
    return Array.from(map.values());
  }, [recursos]);

  const totalItems = useMemo(() => recursos.reduce((acc, r) => acc + (r.cantidad || 0), 0), [recursos]);
  const cantidadSolicitadaReferencia = useMemo(() => {
    const fromEdit = Number(editContext?.cantidadSolicitada ?? 0);
    if (fromEdit > 0) return fromEdit;
    return Number(cantidadSolicitadaParam ?? 0);
  }, [editContext?.cantidadSolicitada, cantidadSolicitadaParam]);

  useEffect(() => {
    cantidadSolicitadaByKeyRef.current = cantidadSolicitadaByKey;
  }, [cantidadSolicitadaByKey]);

  useEffect(() => {
    detalleSolicitudByKeyRef.current = detalleSolicitudByKey;
  }, [detalleSolicitudByKey]);

  useEffect(() => {
    if (datosLogin && receptoresStatus === 'idle') {
      loadReceptores();
    }
    if (recursoGruposStatus === 'idle') {
      loadRecursoGrupos();
    }
  }, [datosLogin, receptoresStatus, loadReceptores, recursoGruposStatus, loadRecursoGrupos]);

  useEffect(() => {
    const loadForEdit = async () => {
      if (!isEditMode) {
        editLoadKeyRef.current = null;
        return;
      }

      const editKey = `${editId ?? 0}-${editNumero ?? ''}-${datosLogin?.usuario_id ?? 0}`;
      if (editLoadKeyRef.current === editKey) {
        return;
      }
      editLoadKeyRef.current = editKey;

      if (editNumero) {
        const encodedNumero = encodeURIComponent(editNumero);
        const endpoints = [
          `${apiBase}/requerimiento-recursos/requeramiento_numero/${encodedNumero}/usuario_emisor_id/${datosLogin?.usuario_id ?? 0}`,
          `${apiBase}/requerimiento-recursos/requerimiento_numero/${encodedNumero}/usuario_emisor_id/${datosLogin?.usuario_id ?? 0}`,
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
        setNumero(String(first?.requerimiento_numero || editNumero));
        const creacionDate = first?.creacion ? new Date(first.creacion) : null;
        setFechaSolicitud(creacionDate);
        setFechaInicio(creacionDate);
        setFechaFin(first?.modificacion ? new Date(first.modificacion) : null);
        setDetalleRequerimiento(String(first?.detalle ?? ''));

        const parsed: RecursoSeleccionado[] = recursosApi.map((row: any) => {
          const grupoId = Number(row?.recurso_grupo_id ?? 0);
          const tipoId = Number(row?.recurso_tipo_id ?? 0);
          const usuarioReceptorId = Number(row?.usuario_receptor_id ?? 0);
          const receptorRef = receptores.find((r) => Number(r.usuario_id) === usuarioReceptorId);
          const grupoFallback = recursoGrupos.find((g) => g.id === grupoId)?.nombre;
          const tipoFallback = recursoTipos.find((t) => t.id === tipoId)?.nombre;

          return {
            id: Number(row?.id ?? 0),
            grupo: String(row?.recurso_grupo_nombre || grupoFallback || `Grupo ${grupoId}`),
            grupoId,
            tipo: String(row?.recurso_tipo_nombre || tipoFallback || `Tipo ${tipoId}`),
            tipoId,
            cantidad: Number(row?.cantidad_solicitada ?? row?.cantidad ?? 0),
            detalleSolicitudRecurso: String(row?.especificaciones ?? ''),
            porcentajeAvance: Number(row?.porcentaje_avance ?? 0),
            costoEstimado: parseCostoToNumber(row?.costo),
            mesaId: Number(receptorRef?.mesa_id ?? usuarioReceptorId ?? 0),
            mesaNombre: String(receptorRef?.mesa_nombre ?? row?.usuario_receptor ?? '-'),
            mesaSiglas: String(receptorRef?.siglas ?? '-'),
            mesaUsuarioId: usuarioReceptorId,
            activo: Boolean(row?.activo ?? true),
          };
        });

        setRecursos([]);
        const recursoBase = parsed[0];
        if (recursoBase) {
          setSelectedGrupoId(recursoBase.grupoId);
          setSelectedTipoId(recursoBase.tipoId);
          setEditContext({
            requerimientoRecursoId: Number(recursoBase.id ?? 0),
            grupoId: recursoBase.grupoId,
            tipoId: recursoBase.tipoId,
            usuarioReceptorId: Number(recursoBase.mesaUsuarioId ?? 0),
            mesaId: Number(recursoBase.mesaId ?? 0),
            cantidadSolicitada: Number(recursoBase.cantidad ?? 0),
          });
          loadRecursoTipos(recursoBase.grupoId);
        }
        setWizardStep(2);
        return;
      }

      if (!editId) return;

      const req = await getRequerimientoById(editId);
      if (req) {
        setNumero(`REQ-${req.id}`);
        setFechaSolicitud(new Date(req.creacion));
        setFechaInicio(req.fecha_inicio ? new Date(req.fecha_inicio) : null);
        setFechaFin(req.fecha_fin ? new Date(req.fecha_fin) : null);
        setDetalleRequerimiento((req as any).detalle ?? '');
      }

      const recursosApi = await getRequerimientoRecursos(editId);
      const parsed: RecursoSeleccionado[] = [];
      for (const r of recursosApi) {
        const grupo = recursoGrupos.find((g) => g.id === r.recurso_grupo_id);
        let tipo = recursoTipos.find((t) => t.id === r.recurso_tipo_id);
        if (!tipo) {
          const tipos = await getRecursoTiposByGrupo(r.recurso_grupo_id);
          tipo = tipos.find((t) => t.id === r.recurso_tipo_id);
        }

        parsed.push({
          id: r.id,
          grupo: grupo?.nombre || `Grupo ${r.recurso_grupo_id}`,
          grupoId: r.recurso_grupo_id,
          tipo: tipo?.nombre || `Tipo ${r.recurso_tipo_id}`,
          tipoId: r.recurso_tipo_id,
          cantidad: r.cantidad,
          detalleSolicitudRecurso: (r as any).especificaciones ?? '',
          porcentajeAvance: Number((r as any).porcentaje_avance ?? 0),
          costoEstimado: parseCostoToNumber((r as any).costo ?? tipo?.costo),
          mesaId: req?.usuario_receptor_id || 0,
          mesaNombre: '-',
          mesaSiglas: '-',
          mesaUsuarioId: req?.usuario_receptor_id || 0,
          activo: r.activo,
        });
      }
      setRecursos([]);
      const recursoBase = parsed[0];
      if (recursoBase) {
        setSelectedGrupoId(recursoBase.grupoId);
        setSelectedTipoId(recursoBase.tipoId);
        setEditContext({
          requerimientoRecursoId: Number(recursoBase.id ?? 0),
          grupoId: recursoBase.grupoId,
          tipoId: recursoBase.tipoId,
          usuarioReceptorId: Number(recursoBase.mesaUsuarioId ?? 0),
          mesaId: Number(recursoBase.mesaId ?? 0),
          cantidadSolicitada: Number(recursoBase.cantidad ?? 0),
        });
        loadRecursoTipos(recursoBase.grupoId);
      }
      setWizardStep(2);
    };

    loadForEdit();
  }, [
    isEditMode,
    apiBase,
    authFetch,
    editId,
    editNumero,
    datosLogin?.usuario_id,
    getRequerimientoById,
    getRequerimientoRecursos,
    getRecursoTiposByGrupo,
    loadRecursoTipos,
  ]);

  const loadDisponibilidadByTipo = useCallback(async () => {
    if (!selectedGrupoId || !selectedTipoId) {
      setDisponibilidadRows([]);
      setDisponibilidadStatus('idle');
      return;
    }

    setDisponibilidadStatus('loading');
    try {
      const coeId = Number(datosLogin?.coe_id ?? 0);
      if (!coeId || mesasUnicas.length === 0) {
        setDisponibilidadRows([]);
        setDisponibilidadStatus('ready');
        return;
      }

      const mesaParam = Number(datosLogin?.mesa_id ?? mesasUnicas[0]?.mesaId ?? 0);
      const endpoint = `${apiBase}/recursos_inventario/coe/${coeId}/mesa/${mesaParam}/recurso_tipo/${selectedTipoId}/`;
      const res = await authFetch(endpoint, { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error('inventario_not_ok');

      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      const provinciaId = Number(datosLogin?.provincia_id ?? 0);
      const cantonId = Number(datosLogin?.canton_id ?? 0);

      const mesasById = new Map(mesasUnicas.map((m) => [m.mesaId, m]));
      const mesaIds = Array.from(new Set(list.map((it: any) => Number(it?.mesa_id ?? 0)).filter((id: number) => id > 0)));

      // Resolver usuario_id real por mesa usando endpoint de acta_coe_resolucion_mesas
      const usuarioByMesaId = new Map<number, number>();
      await Promise.all(
        mesaIds.map(async (mesaId) => {
          try {
            const usuarioRes = await authFetch(
              `${apiBase}/acta_coe_resolucion_mesas/coe/${coeId}/provincia/${provinciaId}/canton/${cantonId}/mesa/${mesaId}`,
              { headers: { accept: 'application/json' } }
            );
            if (!usuarioRes.ok) return;
            const usuarioData = await usuarioRes.json();
            const usuarioId = Number(usuarioData?.usuario_id ?? 0);
            if (usuarioId > 0) {
              usuarioByMesaId.set(mesaId, usuarioId);
            }
          } catch (e) {
            // Si falla, se usa fallback con los datos ya disponibles en memoria.
          }
        })
      );

      const rows: DisponibilidadMesaRow[] = list.map((it: any) => {
        const mesaId = Number(it?.mesa_id ?? 0);
        const mesaRef = mesasById.get(mesaId);
        const key = `${selectedGrupoId}-${selectedTipoId}-${mesaId}`;
        return {
          mesaId,
          mesaNombre: String(it?.mesa_nombre ?? mesaRef?.mesaNombre ?? `Mesa ${mesaId}`),
          siglas: String(mesaRef?.siglas ?? ''),
          usuarioId: Number(usuarioByMesaId.get(mesaId) ?? it?.usuario_id ?? mesaRef?.usuarioId ?? 0),
          cantidadDisponible: Math.max(0, Number(it?.existencias ?? 0)),
          cantidadSolicitada: Number(cantidadSolicitadaByKeyRef.current[key] ?? 0),
          detalleSolicitudRecurso: String(detalleSolicitudByKeyRef.current[key] ?? ''),
        };
      });

      setDisponibilidadRows(rows);
      setDisponibilidadStatus('ready');
    } catch (error) {
      console.error(error);
      setDisponibilidadRows([]);
      setDisponibilidadStatus('error');
    }
  }, [
    selectedGrupoId,
    selectedTipoId,
    mesasUnicas,
    datosLogin?.coe_id,
    datosLogin?.mesa_id,
    datosLogin?.provincia_id,
    datosLogin?.canton_id,
    apiBase,
    authFetch,
  ]);

  useEffect(() => {
    if (wizardStep === 2 && selectedGrupoId && selectedTipoId) {
      loadDisponibilidadByTipo();
    }
  }, [wizardStep, selectedGrupoId, selectedTipoId, loadDisponibilidadByTipo]);

  const resolveCreatedRequerimientoRecursoId = useCallback(async ({
    requerimientoNumero,
    usuarioEmisorId,
    recursoGrupoId,
    recursoTipoId,
    usuarioReceptorId,
  }: {
    requerimientoNumero: string;
    usuarioEmisorId: number;
    recursoGrupoId: number;
    recursoTipoId: number;
    usuarioReceptorId: number;
  }): Promise<number> => {
    try {
      const encodedNumero = encodeURIComponent(requerimientoNumero);
      const endpoints = [
        `${apiBase}/requerimiento-recursos/requeramiento_numero/${encodedNumero}/usuario_emisor_id/${usuarioEmisorId}`,
        `${apiBase}/requerimiento-recursos/requerimiento_numero/${encodedNumero}/usuario_emisor_id/${usuarioEmisorId}`,
      ];
      for (const url of endpoints) {
        const res = await authFetch(url, { headers: { accept: 'application/json' } });
        if (!res.ok) continue;
        const raw = await res.json();
        const list = Array.isArray(raw) ? raw : [];
        const found = list
          .filter((it: any) =>
            Number(it?.recurso_grupo_id ?? 0) === Number(recursoGrupoId) &&
            Number(it?.recurso_tipo_id ?? 0) === Number(recursoTipoId) &&
            Number(it?.usuario_receptor_id ?? 0) === Number(usuarioReceptorId)
          )
          .sort((a: any, b: any) => Number(b?.id ?? 0) - Number(a?.id ?? 0))[0];
        const id = Number(found?.id ?? 0);
        if (id > 0) return id;
      }
      return 0;
    } catch (error) {
      console.error('No se pudo resolver requerimiento_recurso_id creado:', error);
      return 0;
    }
  }, [apiBase, authFetch]);

  const disponibilidadRowsForStep2 = useMemo<DisponibilidadMesaRow[]>(() => {
    if (!isEndosoMode) return disponibilidadRows;
    if (!selectedGrupoId || !selectedTipoId) return disponibilidadRows;
    if (disponibilidadRows.length > 0) return disponibilidadRows;

    const fallbackMesaId = 0;
    const key = `${selectedGrupoId}-${selectedTipoId}-${fallbackMesaId}`;
    return [
      {
        mesaId: fallbackMesaId,
        mesaNombre: 'Sin mesa disponible',
        siglas: '',
        usuarioId: Number(datosLogin?.usuario_id ?? 0),
        cantidadDisponible: 0,
        cantidadSolicitada: Number(cantidadSolicitadaByKey[key] ?? 0),
        detalleSolicitudRecurso: String(detalleSolicitudByKey[key] ?? ''),
      },
    ];
  }, [isEndosoMode, selectedGrupoId, selectedTipoId, disponibilidadRows, datosLogin?.usuario_id, cantidadSolicitadaByKey, detalleSolicitudByKey]);

  const handleGrupoChange = (grupoId: number) => {
    setSelectedGrupoId(grupoId);
    setSelectedTipoId(null);
    setDisponibilidadRows([]);
    loadRecursoTipos(grupoId);
  };

  const handleCantidadSolicitadaChange = (mesaId: number, rawValue: number | null) => {
    const value = typeof rawValue === 'number' ? rawValue : 0;
    const bounded = Math.max(0, value);
    const key = `${selectedGrupoId ?? 0}-${selectedTipoId ?? 0}-${mesaId}`;
    setCantidadSolicitadaByKey((prev) => ({ ...prev, [key]: bounded }));

    setDisponibilidadRows((prev) =>
      prev.map((row) => {
        if (row.mesaId !== mesaId) return row;
        return { ...row, cantidadSolicitada: bounded };
      })
    );
  };

  const handleDetalleSolicitudRecursoChange = (mesaId: number, value: string) => {
    const key = `${selectedGrupoId ?? 0}-${selectedTipoId ?? 0}-${mesaId}`;
    setDetalleSolicitudByKey((prev) => ({ ...prev, [key]: value }));

    setDisponibilidadRows((prev) =>
      prev.map((row) => {
        if (row.mesaId !== mesaId) return row;
        return { ...row, detalleSolicitudRecurso: value };
      })
    );
  };

  const addRecursoDesdeMesa = (row: DisponibilidadMesaRow): boolean => {
    if (!selectedGrupoId || !selectedTipoId) {
      alert('Seleccione grupo y tipo de recurso.');
      return false;
    }
    if (!row.cantidadSolicitada || row.cantidadSolicitada <= 0) {
      alert('Ingrese una cantidad solicitada valida.');
      return false;
    }
    if (row.cantidadSolicitada > row.cantidadDisponible) {
      alert('No puede solicitar mas de la cantidad disponible.');
      return false;
    }


    const grupo = recursoGrupos.find((g) => g.id === selectedGrupoId);
    const tipo = recursoTipos.find((t) => t.id === selectedTipoId);
    const yaAgregado = recursos.some(
      (x) => x.grupoId === selectedGrupoId && x.tipoId === selectedTipoId && x.mesaId === row.mesaId
    );
    if (yaAgregado) {
      alert('Este recurso ya fue agregado en la grilla de resumen.');
      return false;
    }

    setRecursos((prev) => {
      const newId = Math.max(0, ...prev.map((r) => r.id)) + 1;
      return [
        ...prev,
        {
          id: newId,
          grupo: grupo?.nombre || `Grupo ${selectedGrupoId}`,
          grupoId: selectedGrupoId,
          tipo: tipo?.nombre || `Tipo ${selectedTipoId}`,
          tipoId: selectedTipoId,
          cantidad: row.cantidadSolicitada,
          detalleSolicitudRecurso: (row.detalleSolicitudRecurso || '').trim(),
          porcentajeAvance: 0,
          costoEstimado: parseCostoToNumber(tipo?.costo),
          mesaId: row.mesaId,
          mesaNombre: row.mesaNombre,
          mesaSiglas: row.siglas,
          mesaUsuarioId: row.usuarioId,
          activo: true,
        },
      ];
    });
    return true;
  };

  const handleAsignarDesdeMesa = (row: DisponibilidadMesaRow) => {
    const assigned = addRecursoDesdeMesa(row);
    if (assigned) {
      setWizardStep(3);
    }
  };

  const handleEnviarNivelSuperiorDesdeMesa = useCallback(async (row: DisponibilidadMesaRow) => {
    if (!selectedGrupoId || !selectedTipoId) {
      alert('Seleccione grupo y tipo de recurso.');
      return;
    }
    if (!row.cantidadSolicitada || row.cantidadSolicitada <= 0) {
      alert('La cantidad solicitada debe ser mayor a 0.');
      return;
    }
    const detalle = String(row.detalleSolicitudRecurso || '').trim();
    if (!detalle) {
      alert('El detalle de solicitud es obligatorio para Endoso.');
      return;
    }
    if (!datosLogin) {
      alert('No se pudo identificar el usuario logeado.');
      return;
    }

    setIsSendingEndoso(true);
    try {
      const usuarioOrigenId = Number(datosLogin?.usuario_id ?? 0);
      if (!usuarioOrigenId) {
        alert('No se pudo identificar el usuario origen.');
        return;
      }

      let usuarioEmisorId = 0;
      const esNacional = Number(datosLogin?.coe_id ?? 0) === 1;
      if (esNacional) {
        usuarioEmisorId = 13;
      } else {
        const getSuperiorEndpoint = `${apiBase}/usuarios/get_usuario_nivel_superior/${usuarioOrigenId}`;
        const superiorRes = await authFetch(getSuperiorEndpoint, {
          method: 'GET',
          headers: { accept: 'application/json' },
        });
        if (!superiorRes.ok) {
          alert('No se pudo obtener el usuario de nivel superior.');
          return;
        }

        const superiorData = await superiorRes.json();
        const superiores = Array.isArray(superiorData) ? superiorData : [];
        if (!superiores.length) {
          alert('No se encontró usuario superior para el usuario origen.');
          return;
        }

        usuarioEmisorId = Number(
          superiores.find((it: any) => Number(it?.usuario_superior_id ?? 0) > 0)?.usuario_superior_id ?? 0
        );
        if (!usuarioEmisorId) {
          alert('No se encontró usuario_superior_id en la respuesta.');
          return;
        }
      }

      const usuarioReceptorId = Number(row.usuarioId || datosLogin?.usuario_id || 0);
      const requerimientoNumero = generateUuid();
      const grupo = recursoGrupos.find((g) => g.id === selectedGrupoId);
      const tipo = recursoTipos.find((t) => t.id === selectedTipoId);

      const recursoData: RequerimientoRecursoRequest = {
        activo: true,
        cantidad: row.cantidadSolicitada,
        costo: parseCostoToNumber(tipo?.costo),
        creador: datosLogin.usuario_login,
        destino: '',
        detalle: detalleRequerimiento,
        especificaciones: detalle,
        requerimiento_numero: requerimientoNumero,
        recurso_grupo_id: selectedGrupoId,
        recurso_tipo_id: selectedTipoId,
        requerimiento_id: 0,
        usuario_receptor_id: usuarioReceptorId,
        requerimiento_estado_id: 1,
        usuario_emisor_id: usuarioEmisorId,
      };

      const success = await createRequerimientoRecurso(recursoData);
      if (!success) {
        alert('No se pudo enviar a nivel superior.');
        return;
      }
      const requerimientoRecursoIdLog = await resolveCreatedRequerimientoRecursoId({
        requerimientoNumero,
        usuarioEmisorId: Number(usuarioEmisorId ?? 0),
        recursoGrupoId: Number(selectedGrupoId ?? 0),
        recursoTipoId: Number(selectedTipoId ?? 0),
        usuarioReceptorId: Number(usuarioReceptorId ?? 0),
      });
      void registrarHuellaMovimiento({
        apiBase,
        authFetch,
        context: 'enviados:enviar_nivel_superior_o_brecha',
        params: {
          accionId: esNacional ? HuellaAccionLogId.ENVIAR_A_BRECHA : HuellaAccionLogId.ESCALAR_NIVEL_SUPERIOR,
          usuarioAccionId: Number(datosLogin?.usuario_id ?? 0),
          cantidadSolicitada: Number(row.cantidadSolicitada ?? 0),
          coeOrigenId: Number(datosLogin?.coe_id ?? 0),
          coeDestinoId: Number(datosLogin?.coe_id ?? 0),
          mesaOrigenId: Number(datosLogin?.mesa_id ?? 0),
          mesaDestinoId: Number(row.mesaId ?? 0),
          recursoGrupoId: Number(selectedGrupoId ?? 0),
          recursoTipoId: Number(selectedTipoId ?? 0),
          motivoId: esNacional ? HuellaMotivoId.REQUIERE_GESTION_INTERNACIONAL : 0,
          requerimientoNumero: requerimientoNumero,
          requerimientoRecursoId: Number(requerimientoRecursoIdLog ?? 0),
          respuestaFecha: new Date().toISOString(),
        },
      });

      setRecursos((prev) => [
        ...prev,
        {
          id: Math.max(0, ...prev.map((r) => r.id)) + 1,
          grupo: grupo?.nombre || `Grupo ${selectedGrupoId}`,
          grupoId: selectedGrupoId,
          tipo: tipo?.nombre || `Tipo ${selectedTipoId}`,
          tipoId: selectedTipoId,
          cantidad: row.cantidadSolicitada,
          detalleSolicitudRecurso: detalle,
          porcentajeAvance: 0,
          costoEstimado: parseCostoToNumber(tipo?.costo),
          mesaId: row.mesaId,
          mesaNombre: row.mesaNombre,
          mesaSiglas: row.siglas,
          mesaUsuarioId: usuarioReceptorId,
          activo: true,
        },
      ]);
      alert('Solicitud enviada a nivel superior correctamente.');
    } catch (error) {
      console.error(error);
      alert('Error al enviar a nivel superior.');
    } finally {
      setIsSendingEndoso(false);
    }
  }, [selectedGrupoId, selectedTipoId, datosLogin, recursoGrupos, recursoTipos, detalleRequerimiento, createRequerimientoRecurso, apiBase, authFetch, resolveCreatedRequerimientoRecursoId]);

  const removeRecurso = (id: number) => {
    setRecursos((prev) => {
      const recursoEliminado = prev.find((x) => x.id === id);
      if (recursoEliminado) {
        const key = `${recursoEliminado.grupoId}-${recursoEliminado.tipoId}-${recursoEliminado.mesaId}`;
        setCantidadSolicitadaByKey((state) => ({ ...state, [key]: 0 }));
        setDetalleSolicitudByKey((state) => ({ ...state, [key]: '' }));
        setDisponibilidadRows((rows) =>
          rows.map((row) =>
            row.mesaId === recursoEliminado.mesaId
              ? { ...row, cantidadSolicitada: 0, detalleSolicitudRecurso: '' }
              : row
          )
        );
      }
      return prev.filter((x) => x.id !== id);
    });
  };

  const handleEnviarABrecha = (recurso: RecursoSeleccionado) => {
    alert(
      `Enviar a brecha pendiente de implementacion (sin endpoint).\nRecurso: ${recurso.tipo}\nMesa: ${recurso.mesaNombre}`
    );
  };

  const handleRechazarDesdeNacional = useCallback(async () => {
    const requerimientoRecursoId = Number(editContext?.requerimientoRecursoId ?? reqIdParam ?? 0);
    if (!requerimientoRecursoId) {
      alert('No se pudo identificar el requerimiento recurso a rechazar.');
      return;
    }

    setIsRejecting(true);
    try {
      const endpoint = `${apiBase}/requerimiento-recursos/${requerimientoRecursoId}`;
      const res = await authFetch(endpoint, {
        method: 'PATCH',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requerimiento_estado_id: 3 }),
      });

      if (!res.ok) {
        alert('No se pudo rechazar el requerimiento.');
        return;
      }
      void registrarHuellaMovimiento({
        apiBase,
        authFetch,
        context: 'enviados:rechazar_nacional',
        params: {
          accionId: HuellaAccionLogId.RECHAZAR_REQUERIMIENTO,
          usuarioAccionId: Number(datosLogin?.usuario_id ?? 0),
          coeOrigenId: Number(datosLogin?.coe_id ?? 0),
          mesaOrigenId: Number(datosLogin?.mesa_id ?? 0),
          motivoId: HuellaMotivoId.SIN_STOCK,
          requerimientoNumero: String(numero || editNumero || ''),
          requerimientoRecursoId: Number(requerimientoRecursoId ?? 0),
          respuestaFecha: new Date().toISOString(),
        },
      });

      alert('Requerimiento rechazado correctamente.');
      navigate('/requerimientos/enviados');
    } catch (error) {
      console.error(error);
      alert('Error al rechazar el requerimiento.');
    } finally {
      setIsRejecting(false);
    }
  }, [editContext?.requerimientoRecursoId, reqIdParam, apiBase, authFetch, navigate]);

  const handleWizardSelect = (targetIndex: number) => {
    const targetStep = (targetIndex + 1) as WizardStep;
    if (targetStep === wizardStep) return;
    if (targetStep < wizardStep) {
      setWizardStep(targetStep);
      return;
    }
    if (wizardStep === 2 && isEndosoMode && targetStep === 3) {
      return;
    }
    if (wizardStep === 1 && (!fechaSolicitud || !fechaInicio || !fechaFin)) {
      alert('Debe completar fecha de solicitud, fecha inicio y fecha fin.');
      return;
    }
    const recursosValidos = recursos.filter((r) => r.cantidad > 0);
    if (targetStep === 3 && recursosValidos.length === 0) {
      alert('Debe seleccionar al menos un recurso valido en el paso 2.');
      return;
    }
    setWizardStep(targetStep);
  };

  const handleNextStep = () => {
    if (wizardStep === 1) {
      if (!fechaSolicitud || !fechaInicio || !fechaFin) {
        alert('Debe completar fecha de solicitud, fecha inicio y fecha fin.');
        return;
      }
      setWizardStep(2);
      return;
    }
    if (wizardStep === 2) {
      if (isEndosoMode) {
        return;
      }
      const recursosValidos = recursos.filter((r) => r.cantidad > 0);
      if (recursosValidos.length === 0) {
        alert('Debe seleccionar al menos un recurso valido.');
        return;
      }
      setWizardStep(3);
    }
  };

  const handlePrevStep = () => {
    if (wizardStep === 2) setWizardStep(1);
    if (wizardStep === 3) setWizardStep(2);
  };

  const handleGuardarEdicion = async () => {
    if (!isEditMode || !editContext) {
      alert('No hay un requerimiento en modo edición.');
      return;
    }
    if (!editContext.requerimientoRecursoId) {
      alert('No se pudo resolver el ID del requerimiento recurso a editar.');
      return;
    }
    const recursoEditado = recursos[0];
    if (!recursoEditado) {
      alert('Debe asignar un recurso antes de guardar.');
      return;
    }
    const nuevaCantidad = Number(recursoEditado.cantidad ?? 0);
    if (!nuevaCantidad || nuevaCantidad <= 0) {
      alert('La cantidad solicitada debe ser mayor a 0.');
      return;
    }

    setIsSavingEdit(true);
    try {
      const endpoint = `${apiBase}/requerimiento-recursos/${editContext.requerimientoRecursoId}`;
      const res = await authFetch(endpoint, {
        method: 'PATCH',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cantidad_solicitada: nuevaCantidad,
          especificaciones: String(recursoEditado.detalleSolicitudRecurso || '').trim(),
        }),
      });

      if (!res.ok) {
        alert('No se pudo actualizar el requerimiento editado.');
        return;
      }
      void registrarHuellaMovimiento({
        apiBase,
        authFetch,
        context: 'enviados:guardar_edicion',
        params: {
          accionId: HuellaAccionLogId.ASIGNAR_REQUERIMIENTO,
          usuarioAccionId: Number(datosLogin?.usuario_id ?? 0),
          cantidadSolicitada: nuevaCantidad,
          coeOrigenId: Number(datosLogin?.coe_id ?? 0),
          mesaOrigenId: Number(datosLogin?.mesa_id ?? 0),
          recursoGrupoId: Number(recursoEditado.grupoId ?? 0),
          recursoTipoId: Number(recursoEditado.tipoId ?? 0),
          requerimientoNumero: String(numero || editNumero || ''),
          requerimientoRecursoId: Number(editContext.requerimientoRecursoId ?? 0),
          respuestaFecha: new Date().toISOString(),
        },
      });

      alert('Requerimiento actualizado exitosamente.');
      navigate('/requerimientos/enviados');
    } catch (error) {
      console.error(error);
      alert('Error al actualizar el requerimiento.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleRegistrarRequerimiento = async () => {
    if (!datosLogin || recursos.length === 0) {
      alert('Complete el wizard antes de registrar.');
      return;
    }

    try {
      const emergenciaFromStorage = Number(localStorage.getItem('selectedEmergenciaId') || 'NaN');
      const effectiveEmergenciaId =
        selectedEmergenciaId ??
        (Number.isNaN(emergenciaFromStorage) ? (datosLogin?.emergencia_id ?? 0) : emergenciaFromStorage);
      const usuarioEmisorId = Number(datosLogin?.usuario_id ?? 0);
      if (!usuarioEmisorId) {
        alert('No se pudo identificar el usuario emisor logeado.');
        return;
      }
      const requerimientoNumeroUuid = generateUuid();
      setNumero(requerimientoNumeroUuid);

      const requerimientoData: RequerimientoRequest = {
        activo: true,
        creador: datosLogin.usuario_login,
        detalle: detalleRequerimiento,
        emergencia_id: effectiveEmergenciaId,
        fecha_fin: fechaFin ? fechaFin.toISOString() : new Date().toISOString(),
        fecha_inicio: fechaInicio ? fechaInicio.toISOString() : new Date().toISOString(),
        porcentaje_avance: 0,
        requerimiento_estado_id: 1,
        usuario_emisor_id: usuarioEmisorId,
      };

      // const requerimiento = await createRequerimiento(requerimientoData);
      // if (!requerimiento) {
      //   alert('Error al crear el requerimiento');
      //   return;
      // }

      for (const recurso of recursos) {
        const usuarioReceptorId = Number(recurso.mesaUsuarioId ?? 0);
        if (!usuarioReceptorId) {
          alert(`No se encontro usuario receptor para la mesa ${recurso.mesaNombre}.`);
          continue;
        }

        const recursoData: RequerimientoRecursoRequest = {
          activo: true,
          cantidad: recurso.cantidad,
          costo: parseCostoToNumber(recurso.costoEstimado),
          creador: datosLogin.usuario_login,
          destino: '',
          detalle: detalleRequerimiento,
          especificaciones: (recurso.detalleSolicitudRecurso || '').trim(),
          requerimiento_numero: requerimientoNumeroUuid,
          recurso_grupo_id: recurso.grupoId,
          recurso_tipo_id: recurso.tipoId,
          requerimiento_id: 0,
          usuario_receptor_id: usuarioReceptorId,
          requerimiento_estado_id: 1,
          usuario_emisor_id: usuarioEmisorId,

        };
        const success = await createRequerimientoRecurso(recursoData);
        if (!success) {
          alert(`Error al agregar recurso ${recurso.tipo}`);
          continue;
        }
        const requerimientoRecursoIdLog = await resolveCreatedRequerimientoRecursoId({
          requerimientoNumero: requerimientoNumeroUuid,
          usuarioEmisorId: Number(usuarioEmisorId ?? 0),
          recursoGrupoId: Number(recurso.grupoId ?? 0),
          recursoTipoId: Number(recurso.tipoId ?? 0),
          usuarioReceptorId: Number(usuarioReceptorId ?? 0),
        });
        void registrarHuellaMovimiento({
          apiBase,
          authFetch,
          context: 'enviados:crear_requerimiento_recurso',
          params: {
            accionId: HuellaAccionLogId.SOLICITAR_REQUERIMIENTO,
            usuarioAccionId: Number(datosLogin?.usuario_id ?? 0),
            cantidadSolicitada: Number(recurso.cantidad ?? 0),
            coeOrigenId: Number(datosLogin?.coe_id ?? 0),
            mesaOrigenId: Number(datosLogin?.mesa_id ?? 0),
            mesaDestinoId: Number(recurso.mesaId ?? 0),
            recursoGrupoId: Number(recurso.grupoId ?? 0),
            recursoTipoId: Number(recurso.tipoId ?? 0),
            requerimientoNumero: requerimientoNumeroUuid,
            requerimientoRecursoId: Number(requerimientoRecursoIdLog ?? 0),
            respuestaFecha: new Date().toISOString(),
          },
        });
      }

      alert('Requerimiento registrado exitosamente');
      navigate('/requerimientos/enviados');
    } catch (error) {
      alert('Error al registrar el requerimiento');
      console.error(error);
    }
  };

  return (
    <div className="container-fluid">
      <div className="mb-2">
        <Breadcrumb
          items={[
            { title: <Link to="/">Inicio</Link> },
            { title: <Link to="/requerimientos/enviados">Requerimientos Enviados</Link> },
            { title: (editId || editNumero) ? `Editar ${editNumero || `REQ-${editId}`}` : 'Nuevo Requerimiento' },
          ]}
        />
      </div>

      <div className="col-12">
        <Card>
          <div className="mb-3">
            <Steps
              className="wizard-steps"
              model={steps}
              activeIndex={wizardStep - 1}
              onSelect={(e) => handleWizardSelect(e.index)}
              readOnly={false}
            />
          </div>

          {wizardStep === 1 && (
            <>
              <div className="mb-3">
                <h3>Datos del Requerimiento</h3>
              </div>
              <div className="container-fluid">
                <div className="row col-12 pb-2">
                  <div className="col-lg-4 col-md-6 col-sm-12">
                    <label className="label-uniform">Num. Requerimiento</label>
                    <InputText value={numero} onChange={(e) => setNumero(e.target.value)} className="w-full m-1" disabled={isEditMode} />
                  </div>
                  <div className="col-lg-4 col-md-6 col-sm-12" style={{ display: 'none' }}>
                    <label className="label-uniform">Fecha de Solicitud</label>
                    <Calendar value={fechaSolicitud} onChange={(e) => setFechaSolicitud(e.value as Date)} showIcon showTime dateFormat="dd/mm/yy" className="w-full m-1" disabled={isEditMode} />
                  </div>
                  <div className="col-lg-4 col-md-6 col-sm-12">
                    <label className="label-uniform">Fecha Inicio solicitud</label>
                    <Calendar value={fechaInicio} onChange={(e) => setFechaInicio(e.value as Date)} showIcon showTime dateFormat="dd/mm/yy" className="w-full m-1" disabled={isEditMode} />
                  </div>
                  <div className="col-lg-4 col-md-6 col-sm-12">
                    <label className="label-uniform">Fecha Fin solicitud</label>
                    <Calendar value={fechaFin} onChange={(e) => setFechaFin(e.value as Date)} showIcon showTime dateFormat="dd/mm/yy" className="w-full m-1" disabled={isEditMode} />
                  </div>
                  <div className="col-lg-12 col-md-6 col-sm-12 pt-2">
                    <label className="label-uniform">Detalle de requerimiento</label>
                    <InputTextarea
                      value={detalleRequerimiento}
                      onChange={(e) => setDetalleRequerimiento(e.target.value)}
                      className="w-full m-1"
                      rows={3}
                      disabled={isEditMode}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {wizardStep === 2 && (
            <>
              <div className="mb-3">
                <h3>Seleccion de Recursos y Mesa Asignada</h3>
              </div>

              <div className="row col-12 pb-2">
                <div className="col-lg-4 col-md-6 col-sm-12">
                  <label className="label-uniform">Grupo Recurso</label>
                  <Dropdown
                    value={selectedGrupoId}
                    options={recursoGrupos.map((g) => ({ label: g.nombre, value: g.id }))}
                    onChange={(e) => handleGrupoChange(e.value)}
                    placeholder={recursoGruposStatus === 'loading' ? 'Cargando...' : 'Seleccionar grupo'}
                    disabled={isEditMode || recursoGruposStatus === 'loading'}
                    filter
                    className="w-full m-1"
                  />
                </div>
                <div className="col-lg-4 col-md-6 col-sm-12">
                  <label className="label-uniform">Tipo Recurso</label>
                  <Dropdown
                    value={selectedTipoId}
                    options={recursoTipos.map((t) => ({ label: t.nombre, value: t.id }))}
                    onChange={(e) => setSelectedTipoId(e.value)}
                    placeholder={recursoTiposStatus === 'loading' ? 'Cargando...' : 'Seleccionar tipo'}
                    disabled={isEditMode || recursoTiposStatus === 'loading' || !selectedGrupoId}
                    filter
                    className="w-full m-1"
                  />
                </div>
                <div className="col-lg-4 col-md-12 col-sm-12 d-flex align-items-end">
                  {isUsuarioNacionalId13 ? (
                    <Button
                      label={isRejecting ? 'Rechazando...' : 'Rechazar'}
                      severity="danger"
                      className="m-1"
                      onClick={handleRechazarDesdeNacional}
                      disabled={isRejecting}
                    />
                  ) : (
                    <Button
                      label={isEndosoMode ? 'Deshabilitar Endoso' : 'Habilitar Endoso'}
                      severity={isEndosoMode ? 'warning' : 'help'}
                      outlined={!isEndosoMode}
                      className="m-1"
                      onClick={() => setIsEndosoMode((prev) => !prev)}
                    />
                  )}
                </div>

              </div>

              <div className="mb-2">
                {mesasAsignadas.length > 0 ? (
                  mesasAsignadas.map((mesa) => (
                    <Tag key={mesa.mesaId} color="blue">{`Mesa asignada: ${mesa.siglas} - ${mesa.mesaNombre}`}</Tag>
                  ))
                ) : (
                  <Tag color="default">Mesas asignadas: No seleccionadas</Tag>
                )}
              </div>
              {cantidadSolicitadaReferencia > 0 && (
                <div className="mb-2">
                  <Tag color="gold">{`Cantidad solicitada de referencia: ${cantidadSolicitadaReferencia}`}</Tag>
                </div>
              )}

              <DataTable value={disponibilidadRowsForStep2} emptyMessage={disponibilidadStatus === 'loading' ? 'Cargando disponibilidad...' : 'Seleccione grupo y tipo para visualizar inventario por mesa'} responsiveLayout="scroll">
                <Column
                  header="Mesa"
                  body={(row: DisponibilidadMesaRow) => `${row.mesaNombre}`}
                />
                <Column field="cantidadDisponible" header="Cantidad disponible" />
                <Column
                  header="Cantidad solicitada"
                  body={(row: DisponibilidadMesaRow) => {
                    const recursoYaAgregado = recursos.some(
                      (x) => x.grupoId === selectedGrupoId && x.tipoId === selectedTipoId && x.mesaId === row.mesaId
                    );
                    return (
                      <div>
                        <InputNumber
                          value={row.cantidadSolicitada}
                          onValueChange={(e: InputNumberValueChangeEvent) =>
                            handleCantidadSolicitadaChange(row.mesaId, typeof e.value === 'number' ? e.value : 0)
                          }
                          mode="decimal"
                          min={0}
                          useGrouping={false}
                          className="w-20 m-1"
                          disabled={isSavingEdit || recursoYaAgregado}
                        />
                        {!isEndosoMode && row.cantidadSolicitada > row.cantidadDisponible && (
                          <small className="p-error">La cantidad solicitada supera la disponible.</small>
                        )}
                      </div>
                    );
                  }}
                />
                <Column
                  header="Detalle de solicitud recurso"
                  body={(row: DisponibilidadMesaRow) => {
                    const recursoYaAgregado = recursos.some(
                      (x) => x.grupoId === selectedGrupoId && x.tipoId === selectedTipoId && x.mesaId === row.mesaId
                    );
                    return (<div>
                      <InputText
                        className="w-full"
                        value={row.detalleSolicitudRecurso}
                        onChange={(e) => handleDetalleSolicitudRecursoChange(row.mesaId, e.target.value)}
                        placeholder={isEndosoMode ? 'Detalle obligatorio para Endoso' : 'Detalle adicional (opcional)'}
                        disabled={isSavingEdit || recursoYaAgregado}

                      />
                    </div>);
                  }}
                />
                <Column
                  header="Acciones"
                  body={(row: DisponibilidadMesaRow) => {
                    const recursoYaAgregado = recursos.some(
                      (x) => x.grupoId === selectedGrupoId && x.tipoId === selectedTipoId && x.mesaId === row.mesaId
                    );
                    return (
                      <div>
                        {!isEndosoMode ? (
                          <Button
                            label={recursoYaAgregado ? 'Recurso agregado' : 'Agregar Recurso'}
                            icon={recursoYaAgregado ? 'pi pi-check' : 'pi pi-plus'}
                            className="p-button-sm"
                            onClick={() => handleAsignarDesdeMesa(row)}
                            disabled={isSavingEdit || recursoYaAgregado}
                          />
                        ) : (
                          <Button
                            label={Number(datosLogin?.coe_id ?? 0) === 1 ? 'Enviar a brecha' : 'Enviar a nivel superior'}
                            icon="pi pi-send"
                            severity="help"
                            className="p-button-sm"
                            onClick={() => handleEnviarNivelSuperiorDesdeMesa(row)}
                            disabled={isSavingEdit || isSendingEndoso}
                          />
                        )}
                      </div>

                    );
                  }}
                />


              </DataTable>
            </>
          )}

          {wizardStep === 3 && (
            <>
              <div className="mb-3">
                <h3>Detalle de Recursos Solicitados</h3>
              </div>

              <DataTable value={recursos} emptyMessage="Sin recursos seleccionados" responsiveLayout="scroll">
                <Column field="grupo" header="Grupo Recurso" sortable />
                <Column field="tipo" header="Tipo Recurso" sortable />
                <Column field="cantidad" header="Cantidad" sortable />
                <Column field="detalleSolicitudRecurso" header="Detalle de solicitud recurso" />
                <Column
                  header="% avance"
                  body={(row: RecursoSeleccionado) => (
                    <div style={{ minWidth: 120 }}>
                      <Progress percent={Math.max(0, Math.min(100, Number(row.porcentajeAvance || 0)))} size="small" />
                    </div>
                  )}
                />
                <Column
                  header="Mesa Asignada"
                  body={(row: RecursoSeleccionado) => `${row.mesaNombre}`}
                />
                <Column
                  header="Acciones"
                  body={(row: RecursoSeleccionado) => (
                    <div className="flex gap-2">
                      <Button
                        label=""
                        icon="pi pi-send"
                        severity="help"
                        text
                        onClick={() => handleEnviarABrecha(row)}
                        tooltip="Enviar a brecha"
                        tooltipOptions={{ position: 'top' }}

                      />
                      <Button
                        icon="pi pi-trash"
                        severity="danger"
                        text
                        onClick={() => removeRecurso(row.id)}
                        tooltip="Eliminar recurso"
                        tooltipOptions={{ position: 'top' }}
                      />
                    </div>
                  )}
                  style={{ width: '14rem' }}
                />
              </DataTable>

              <div className="mt-3 p-3 surface-100 border-round">
                <div><strong>Resumen</strong></div>
                <div><strong>Numero:</strong> {numero}</div>
                <div><strong>Fecha solicitud:</strong> {formatDateTime(fechaSolicitud)}</div>
                <div><strong>Fecha inicio:</strong> {formatDateTime(fechaInicio)}</div>
                <div><strong>Fecha fin:</strong> {formatDateTime(fechaFin)}</div>
                <div><strong>Detalle requerimiento:</strong> {detalleRequerimiento || '-'}</div>
                <div>
                  <strong>Mesas asignadas:</strong>{' '}
                  {mesasAsignadas.length > 0
                    ? mesasAsignadas.map((m) => `${m.siglas} - ${m.mesaNombre}`).join(' | ')
                    : 'No seleccionadas'}
                </div>
                <div><strong>Total recursos:</strong> {recursos.length}</div>
                <div><strong>Total items:</strong> {totalItems}</div>
              </div>
            </>
          )}

          <div className="row mt-4">
            <div className="col-12 text-end">
              {wizardStep > 1 && (
                <Button label="Anterior" icon="pi pi-arrow-left" outlined className="m-1" onClick={handlePrevStep} />
              )}
              {wizardStep < 3 && !(wizardStep === 2 && isEndosoMode) && (
                <Button label="Siguiente" icon="pi pi-arrow-right" iconPos="right" className="m-1" onClick={handleNextStep} />
              )}
              {wizardStep === 3 && (
                <Button
                  label={isEditMode ? (isSavingEdit ? 'Guardando...' : 'Guardar Cambios') : 'Registrar Requerimiento'}
                  icon={isEditMode ? 'pi pi-save' : 'pi pi-send'}
                  severity="success"
                  className="m-1"
                  onClick={isEditMode ? handleGuardarEdicion : handleRegistrarRequerimiento}
                  disabled={isSavingEdit}
                />
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default NuevoRequerimientoEnviado;
