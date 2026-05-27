import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card } from 'primereact/card';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import type { InputNumberValueChangeEvent } from 'primereact/inputnumber';
import { Steps } from 'primereact/steps';
import type { MenuItem } from 'primereact/menuitem';
import { Breadcrumb, Progress, Tag } from 'antd';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, RequerimientoRecursoRequest } from '../../../context/AuthContext';
import {
  HuellaAccionLogId,
  HuellaMotivoId,
  registrarHuellaMovimiento,
} from '../../../utils/requerimientoHuellaLog';

type WizardStep = 2 | 3;

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

interface InventarioNoRechazadoRow {
  mesaId: number;
  mesaNombre: string;
  siglas: string;
  usuarioId: number;
  cantidadDisponible: number;
  cantidadSolicitada: number;
  detalleSolicitudRecurso: string;
}

const RECHAZADO_ESTADO_ID_DEFAULT = 4;

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

export const NuevoRequerimientoRechazado: React.FC = () => {
  const apiBase = process.env.REACT_APP_API_URL || '/api';
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const prefilledGrupoId = useMemo(() => {
    const raw = Number(searchParams.get('grupo_id') || 0);
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }, [searchParams]);

  const prefilledTipoId = useMemo(() => {
    const raw = Number(searchParams.get('tipo_id') || 0);
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }, [searchParams]);

  const prefilledEstadoId = useMemo(() => {
    const raw = Number(searchParams.get('requerimiento_estado_id') || RECHAZADO_ESTADO_ID_DEFAULT);
    return Number.isFinite(raw) && raw > 0 ? raw : RECHAZADO_ESTADO_ID_DEFAULT;
  }, [searchParams]);

  const prefilledRequerimientoNumero = useMemo(
    () => String(searchParams.get('requerimiento_numero') || '').trim() || null,
    [searchParams]
  );
  const prefilledRequerimientoId = useMemo(() => {
    const rawReqId = Number(searchParams.get('req_id') || 0);
    if (Number.isFinite(rawReqId) && rawReqId > 0) return rawReqId;

    const rawLegacy = Number(searchParams.get('requerimiento_id') || 0);
    return Number.isFinite(rawLegacy) && rawLegacy > 0 ? rawLegacy : null;
  }, [searchParams]);
  const prefilledDetalle = useMemo(
    () => String(searchParams.get('detalle') || '').trim(),
    [searchParams]
  );
  const prefilledGrupoNombre = useMemo(
    () => String(searchParams.get('grupoRequerimiento') || '').trim(),
    [searchParams]
  );
  const prefilledTipoNombre = useMemo(
    () => String(searchParams.get('tipoRequerimiento') || '').trim(),
    [searchParams]
  );
  const prefilledCantidadSolicitada = useMemo(() => {
    const raw = Number(searchParams.get('cantidad_solicitada') || 0);
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
  }, [searchParams]);

  const [wizardStep, setWizardStep] = useState<WizardStep>(2);
  const [numero, setNumero] = useState<string>(prefilledRequerimientoNumero || 'REQ-0000');
  const [fechaSolicitud] = useState<Date | null>(new Date());
  const [fechaInicio] = useState<Date | null>(new Date());
  const [fechaFin] = useState<Date | null>(null);
  const [detalleRequerimiento] = useState<string>(prefilledDetalle);

  const [selectedGrupoId, setSelectedGrupoId] = useState<number | null>(prefilledGrupoId);
  const [selectedTipoId, setSelectedTipoId] = useState<number | null>(prefilledTipoId);
  const [inventarioRows, setInventarioRows] = useState<InventarioNoRechazadoRow[]>([]);
  const [cantidadSolicitadaByKey, setCantidadSolicitadaByKey] = useState<Record<string, number>>({});
  const [detalleSolicitudByKey, setDetalleSolicitudByKey] = useState<Record<string, string>>({});
  const cantidadSolicitadaByKeyRef = useRef<Record<string, number>>({});
  const detalleSolicitudByKeyRef = useRef<Record<string, string>>({});
  const [inventarioStatus, setInventarioStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [recursos, setRecursos] = useState<RecursoSeleccionado[]>([]);

  const {
    datosLogin,
    authFetch,
    loadReceptores,
    receptores,
    receptoresStatus,
    recursoGrupos,
    recursoGruposStatus,
    recursoTipos,
    recursoTiposStatus,
    loadRecursoGrupos,
    loadRecursoTipos,
    createRequerimientoRecurso,
  } = useAuth();

  const lockSelection = Boolean(prefilledGrupoId && prefilledTipoId);

  const steps = useMemo<MenuItem[]>(
    () => [
      { label: 'Paso 2: Seleccion de Recursos y Mesa' },
      { label: 'Paso 3: Detalle y Resumen' },
    ],
    []
  );

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
    if (selectedGrupoId) {
      loadRecursoTipos(selectedGrupoId);
    }
  }, [selectedGrupoId, loadRecursoTipos]);

  const loadInventarioNoRechazados = useCallback(async () => {
    if (!selectedTipoId) {
      setInventarioRows([]);
      setInventarioStatus('idle');
      return;
    }

    const coeId = Number(searchParams.get('coe_id') || datosLogin?.coe_id || 0);
    const mesaId = Number(searchParams.get('mesa_id') || datosLogin?.mesa_id || 0);
    const usuarioId = Number(searchParams.get('usuario_id') || datosLogin?.usuario_id || 0);
    const requerimientoEstadoId = Number(
      searchParams.get('requerimiento_estado_id') || prefilledEstadoId || RECHAZADO_ESTADO_ID_DEFAULT
    );

    if (!coeId || !mesaId || !usuarioId || !requerimientoEstadoId) {
      setInventarioRows([]);
      setInventarioStatus('error');
      return;
    }

    setInventarioStatus('loading');
    try {
      const endpoint = `${apiBase}/recursos_inventario/no-rechazados/coe/${coeId}/mesa/${mesaId}/recurso_tipo/${selectedTipoId}/usuario/${usuarioId}/requerimiento_estado/${requerimientoEstadoId}`;
      const res = await authFetch(endpoint, { headers: { accept: 'application/json' } });
      if (!res.ok) {
        setInventarioRows([]);
        setInventarioStatus('error');
        return;
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];

      const rows: InventarioNoRechazadoRow[] = list.map((it: any, index: number) => {
        const rowMesaId = Number(it?.mesa_id ?? mesaId);
        const receptorRef = (receptores || []).find((r) => Number(r.mesa_id) === rowMesaId);
        const key = `${selectedGrupoId ?? 0}-${selectedTipoId}-${rowMesaId}`;
        const hasSavedCantidad = Object.prototype.hasOwnProperty.call(cantidadSolicitadaByKeyRef.current, key);
        const initialCantidad = hasSavedCantidad
          ? Number(cantidadSolicitadaByKeyRef.current[key] ?? 0)
          : (index === 0 ? prefilledCantidadSolicitada : 0);
        return {
          mesaId: rowMesaId,
          mesaNombre: String(it?.mesa_nombre ?? receptorRef?.mesa_nombre ?? `Mesa ${rowMesaId}`),
          siglas: String(receptorRef?.siglas ?? receptorRef?.mesa_siglas ?? ''),
          usuarioId: Number(receptorRef?.usuario_id ?? usuarioId),
          cantidadDisponible: Math.max(0, Number(it?.existencias ?? 0)),
          cantidadSolicitada: initialCantidad,
          detalleSolicitudRecurso: String(detalleSolicitudByKeyRef.current[key] ?? ''),
        };
      });

      setInventarioRows(rows);
      setInventarioStatus('ready');
    } catch (error) {
      console.error(error);
      setInventarioRows([]);
      setInventarioStatus('error');
    }
  }, [selectedTipoId, searchParams, datosLogin?.coe_id, datosLogin?.mesa_id, datosLogin?.usuario_id, prefilledEstadoId, prefilledCantidadSolicitada, apiBase, authFetch, receptores, selectedGrupoId]);

  useEffect(() => {
    if (wizardStep === 2 && selectedTipoId) {
      loadInventarioNoRechazados();
    }
  }, [wizardStep, selectedTipoId, loadInventarioNoRechazados]);

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

  const handleGrupoChange = (grupoId: number) => {
    setSelectedGrupoId(grupoId);
    setSelectedTipoId(null);
    setInventarioRows([]);
    loadRecursoTipos(grupoId);
  };

  const handleCantidadSolicitadaChange = (mesaId: number, rawValue: number | null) => {
    const value = typeof rawValue === 'number' ? rawValue : 0;
    const bounded = Math.max(0, value);
    const key = `${selectedGrupoId ?? 0}-${selectedTipoId ?? 0}-${mesaId}`;
    setCantidadSolicitadaByKey((prev) => ({ ...prev, [key]: bounded }));

    setInventarioRows((prev) =>
      prev.map((row) => (row.mesaId === mesaId ? { ...row, cantidadSolicitada: bounded } : row))
    );
  };

  const handleDetalleSolicitudRecursoChange = (mesaId: number, value: string) => {
    const key = `${selectedGrupoId ?? 0}-${selectedTipoId ?? 0}-${mesaId}`;
    setDetalleSolicitudByKey((prev) => ({ ...prev, [key]: value }));

    setInventarioRows((prev) =>
      prev.map((row) => (row.mesaId === mesaId ? { ...row, detalleSolicitudRecurso: value } : row))
    );
  };

  const addRecursoDesdeMesa = (row: InventarioNoRechazadoRow) => {
    if (!selectedGrupoId || !selectedTipoId) {
      alert('Seleccione grupo y tipo de recurso.');
      return;
    }
    if (!row.cantidadSolicitada || row.cantidadSolicitada <= 0) {
      alert('Ingrese una cantidad solicitada válida.');
      return;
    }
    if (row.cantidadSolicitada > row.cantidadDisponible) {
      alert('No puede solicitar más de la cantidad disponible.');
      return;
    }

    const yaAgregado = recursos.some(
      (x) => x.grupoId === selectedGrupoId && x.tipoId === selectedTipoId && x.mesaId === row.mesaId
    );
    if (yaAgregado) {
      alert('Este recurso ya fue agregado en la grilla de resumen.');
      return;
    }

    const grupo = recursoGrupos.find((g) => g.id === selectedGrupoId);
    const tipo = recursoTipos.find((t) => t.id === selectedTipoId);

    setRecursos((prev) => {
      const newId = Math.max(0, ...prev.map((r) => r.id)) + 1;
      return [
        ...prev,
        {
          id: newId,
          grupo: grupo?.nombre || prefilledGrupoNombre || `Grupo ${selectedGrupoId}`,
          grupoId: selectedGrupoId,
          tipo: tipo?.nombre || prefilledTipoNombre || `Tipo ${selectedTipoId}`,
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
  };

  const removeRecurso = (id: number) => {
    setRecursos((prev) => {
      const recursoEliminado = prev.find((x) => x.id === id);
      if (recursoEliminado) {
        const key = `${recursoEliminado.grupoId}-${recursoEliminado.tipoId}-${recursoEliminado.mesaId}`;
        setCantidadSolicitadaByKey((state) => ({ ...state, [key]: 0 }));
        setDetalleSolicitudByKey((state) => ({ ...state, [key]: '' }));
        setInventarioRows((rows) =>
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

  const handleWizardSelect = (targetIndex: number) => {
    const targetStep = (targetIndex + 2) as WizardStep;
    if (targetStep === wizardStep) return;
    if (targetStep < wizardStep) {
      setWizardStep(targetStep);
      return;
    }
    const recursosValidos = recursos.filter((r) => r.cantidad > 0);
    if (targetStep === 3 && recursosValidos.length === 0) {
      alert('Debe seleccionar al menos un recurso válido en el paso 2.');
      return;
    }
    setWizardStep(targetStep);
  };

  const handleNextStep = () => {
    if (wizardStep === 2) {
      const recursosValidos = recursos.filter((r) => r.cantidad > 0);
      if (recursosValidos.length === 0) {
        alert('Debe seleccionar al menos un recurso válido.');
        return;
      }
      setWizardStep(3);
    }
  };

  const handlePrevStep = () => {
    if (wizardStep === 3) setWizardStep(2);
  };

  const handleRegistrarRequerimiento = async () => {
    if (!datosLogin || recursos.length === 0) {
      alert('Complete el wizard antes de registrar.');
      return;
    }

    try {
      const usuarioEmisorId = Number(searchParams.get('usuario_id') || datosLogin?.usuario_id || 0);

      if (!usuarioEmisorId) {
        alert('No se pudo identificar el usuario emisor.');
        return;
      }

      if (!prefilledRequerimientoId) {
        alert('No se pudo identificar el requerimiento rechazado a deshabilitar.');
        return;
      }

      const endpointDeshabilitar = `${apiBase}/requerimiento-recursos/deshabilitar-requerimiento/${prefilledRequerimientoId}`;
      let deshabilitacionOk = false;
      let ultimoStatus = 0;

      for (const method of ['PATCH'] as const) {
        const resDeshabilitar = await authFetch(endpointDeshabilitar, {
          method,
          headers: { accept: 'application/json' },
        });

        ultimoStatus = resDeshabilitar.status;
        if (resDeshabilitar.ok) {
          deshabilitacionOk = true;
          break;
        }

        if (resDeshabilitar.status !== 404 && resDeshabilitar.status !== 405) {
          break;
        }
      }

      if (!deshabilitacionOk) {
        alert(`No se pudo deshabilitar el requerimiento anterior (ID ${prefilledRequerimientoId}).`);
        console.error(
          `Error al deshabilitar requerimiento ${prefilledRequerimientoId}. Estado HTTP: ${ultimoStatus}`
        );
        return;
      }
      void registrarHuellaMovimiento({
        apiBase,
        authFetch,
        context: 'rechazados:deshabilitar_requerimiento_previo',
        params: {
          accionId: HuellaAccionLogId.REASIGNAR_MESA,
          usuarioAccionId: Number(datosLogin?.usuario_id ?? 0),
          coeOrigenId: Number(datosLogin?.coe_id ?? 0),
          mesaOrigenId: Number(datosLogin?.mesa_id ?? 0),
          motivoId: HuellaMotivoId.MESA_NO_COMPETENTE,
          requerimientoNumero: String(prefilledRequerimientoNumero || ''),
          requerimientoRecursoId: Number(prefilledRequerimientoId ?? 0),
          respuestaFecha: new Date().toISOString(),
        },
      });

      const requerimientoNumeroUuid = prefilledRequerimientoNumero || generateUuid();
      setNumero(requerimientoNumeroUuid);

      for (const recurso of recursos) {
        const usuarioReceptorId = Number(recurso.mesaUsuarioId ?? 0);
        if (!usuarioReceptorId) {
          alert(`No se encontró usuario receptor para la mesa ${recurso.mesaNombre}.`);
          continue;
        }

        const recursoData: RequerimientoRecursoRequest = {
          activo: true,
          cantidad: recurso.cantidad,
          costo: parseCostoToNumber(recurso.costoEstimado),
          creador: datosLogin.usuario_login,
          destino: '',
          detalle: detalleRequerimiento || '',
          especificaciones: (recurso.detalleSolicitudRecurso || '').trim(),
          requerimiento_numero: requerimientoNumeroUuid,
          recurso_grupo_id: recurso.grupoId,
          recurso_tipo_id: recurso.tipoId,
          requerimiento_id: 0,
          usuario_receptor_id: usuarioReceptorId,
          requerimiento_estado_id: 1,
          usuario_emisor_id: usuarioEmisorId,
        };

        const ok = await createRequerimientoRecurso(recursoData);
        if (!ok) {
          alert(`Error al agregar recurso ${recurso.tipo}`);
          continue;
        }
        const requerimientoRecursoIdLog = await resolveCreatedRequerimientoRecursoId({
          requerimientoNumero: String(requerimientoNumeroUuid),
          usuarioEmisorId: Number(usuarioEmisorId ?? 0),
          recursoGrupoId: Number(recurso.grupoId ?? 0),
          recursoTipoId: Number(recurso.tipoId ?? 0),
          usuarioReceptorId: Number(usuarioReceptorId ?? 0),
        });
        void registrarHuellaMovimiento({
          apiBase,
          authFetch,
          context: 'rechazados:crear_reasignacion',
          params: {
            accionId: HuellaAccionLogId.REASIGNAR_MESA,
            usuarioAccionId: Number(datosLogin?.usuario_id ?? 0),
            cantidadSolicitada: Number(recurso.cantidad ?? 0),
            coeOrigenId: Number(datosLogin?.coe_id ?? 0),
            coeDestinoId: Number(datosLogin?.coe_id ?? 0),
            mesaOrigenId: Number(datosLogin?.mesa_id ?? 0),
            mesaDestinoId: Number(recurso.mesaId ?? 0),
            motivoId: HuellaMotivoId.MESA_NO_COMPETENTE,
            recursoGrupoId: Number(recurso.grupoId ?? 0),
            recursoTipoId: Number(recurso.tipoId ?? 0),
            requerimientoNumero: String(requerimientoNumeroUuid),
            requerimientoRecursoId: Number(requerimientoRecursoIdLog ?? 0),
            respuestaFecha: new Date().toISOString(),
          },
        });
      }

      alert('Reasignación registrada exitosamente');
      navigate('/requerimientos/rechazados');
    } catch (error) {
      console.error(error);
      alert('Error al registrar la reasignación');
    }
  };

  return (
    <div className="container-fluid">
      <div className="mb-2">
        <Breadcrumb
          items={[
            { title: <Link to="/">Inicio</Link> },
            { title: <Link to="/requerimientos/rechazados">Requerimientos Rechazados</Link> },
            { title: 'Reasignar recurso' },
          ]}
        />
      </div>

      <div className="col-12">
        <Card>
          <div className="mb-3">
            <Steps
              className="wizard-steps"
              model={steps}
              activeIndex={wizardStep - 2}
              onSelect={(e) => handleWizardSelect(e.index)}
              readOnly={false}
            />
          </div>

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
                    disabled={recursoGruposStatus === 'loading' || lockSelection}
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
                    disabled={recursoTiposStatus === 'loading' || !selectedGrupoId || lockSelection}
                    filter
                    className="w-full m-1"
                  />
                </div>
              </div>

              {(prefilledGrupoNombre || prefilledTipoNombre) && (
                <div className="mb-2">
                  <Tag color="blue">
                    {`Recurso seleccionado: ${prefilledGrupoNombre || '-'} / ${prefilledTipoNombre || '-'}`}
                  </Tag>
                </div>
              )}

              <div className="mb-2">
                {mesasAsignadas.length > 0 ? (
                  mesasAsignadas.map((mesa) => (
                    <Tag key={mesa.mesaId} color="green">{`Mesa asignada: ${mesa.siglas} - ${mesa.mesaNombre}`}</Tag>
                  ))
                ) : (
                  <Tag color="default">Mesas asignadas: No seleccionadas</Tag>
                )}
              </div>

              <DataTable
                value={inventarioRows}
                emptyMessage={
                  inventarioStatus === 'loading'
                    ? 'Cargando inventario...'
                    : 'Seleccione grupo y tipo para visualizar inventario'
                }
                responsiveLayout="scroll"
              >
                <Column header="Mesa" body={(row: InventarioNoRechazadoRow) => `${row.mesaNombre}`} />
                <Column field="cantidadDisponible" header="Cantidad disponible" />
                <Column
                  header="Cantidad solicitada"
                  body={(row: InventarioNoRechazadoRow) => {
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
                          disabled={recursoYaAgregado}
                        />
                        {row.cantidadSolicitada > row.cantidadDisponible && (
                          <small className="p-error">La cantidad solicitada supera la disponible.</small>
                        )}
                      </div>
                    );
                  }}
                />
                <Column
                  header="Detalle de solicitud recurso"
                  body={(row: InventarioNoRechazadoRow) => {
                    const recursoYaAgregado = recursos.some(
                      (x) => x.grupoId === selectedGrupoId && x.tipoId === selectedTipoId && x.mesaId === row.mesaId
                    );
                    return (
                      <InputText
                        className="w-full"
                        value={row.detalleSolicitudRecurso}
                        onChange={(e) => handleDetalleSolicitudRecursoChange(row.mesaId, e.target.value)}
                        placeholder="Detalle adicional (opcional)"
                        disabled={recursoYaAgregado}
                      />
                    );
                  }}
                />
                <Column
                  header="Acciones"
                  body={(row: InventarioNoRechazadoRow) => {
                    const recursoYaAgregado = recursos.some(
                      (x) => x.grupoId === selectedGrupoId && x.tipoId === selectedTipoId && x.mesaId === row.mesaId
                    );
                    return (
                      <Button
                        label={recursoYaAgregado ? 'Recurso agregado' : 'Agregar Recurso'}
                        icon={recursoYaAgregado ? 'pi pi-check' : 'pi pi-plus'}
                        className="p-button-sm"
                        onClick={() => addRecursoDesdeMesa(row)}
                        disabled={recursoYaAgregado}
                      />
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
                <Column header="Mesa Asignada" body={(row: RecursoSeleccionado) => `${row.mesaNombre}`} />
                <Column
                  header="Acciones"
                  body={(row: RecursoSeleccionado) => (
                    <Button
                      icon="pi pi-trash"
                      severity="danger"
                      text
                      onClick={() => removeRecurso(row.id)}
                      tooltip="Eliminar recurso"
                      tooltipOptions={{ position: 'top' }}
                    />
                  )}
                  style={{ width: '8rem' }}
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
              {wizardStep > 2 && (
                <Button label="Anterior" icon="pi pi-arrow-left" outlined className="m-1" onClick={handlePrevStep} />
              )}
              {wizardStep < 3 && (
                <Button label="Siguiente" icon="pi pi-arrow-right" iconPos="right" className="m-1" onClick={handleNextStep} />
              )}
              {wizardStep === 3 && (
                <Button label="Registrar Reasignación" icon="pi pi-send" severity="success" className="m-1" onClick={handleRegistrarRequerimiento} />
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default NuevoRequerimientoRechazado;
