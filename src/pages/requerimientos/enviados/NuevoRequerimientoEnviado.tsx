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

export const NuevoRequerimientoEnviado: React.FC = () => {
  const apiBase = process.env.REACT_APP_API_URL || '/api';
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editId = useMemo(() => {
    const idStr = searchParams.get('id');
    const n = idStr ? Number(idStr) : NaN;
    return Number.isNaN(n) ? null : n;
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
  const [disponibilidadStatus, setDisponibilidadStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

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

  const isReadOnly = !!editId;

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

  const mesaAsignada = useMemo(() => mesasAsignadas[0] || null, [mesasAsignadas]);

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
    const loadForEdit = async () => {
      if (!editId) return;

      const req = await getRequerimientoById(editId);
      if (req) {
        setNumero(`REQ-${req.id}`);
        setFechaSolicitud(new Date(req.creacion));
        setFechaInicio(req.fecha_inicio ? new Date(req.fecha_inicio) : null);
        setFechaFin(req.fecha_fin ? new Date(req.fecha_fin) : null);
        setDetalleRequerimiento((req as any).descripcion ?? '');
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
      setRecursos(parsed);
      setWizardStep(3);
    };

    loadForEdit();
  }, [editId, getRequerimientoById, getRequerimientoRecursos, recursoGrupos, recursoTipos, getRecursoTiposByGrupo]);

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

      const mesasById = new Map(mesasUnicas.map((m) => [m.mesaId, m]));
      const rows: DisponibilidadMesaRow[] = list.map((it: any) => {
        const mesaId = Number(it?.mesa_id ?? 0);
        const mesaRef = mesasById.get(mesaId);
        const key = `${selectedGrupoId}-${selectedTipoId}-${mesaId}`;
        return {
          mesaId,
          mesaNombre: String(it?.mesa_nombre ?? mesaRef?.mesaNombre ?? `Mesa ${mesaId}`),
          siglas: String(mesaRef?.siglas ?? ''),
          usuarioId: Number(mesaRef?.usuarioId ?? 0),
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
    apiBase,
    authFetch,
  ]);

  useEffect(() => {
    if (wizardStep === 2 && selectedGrupoId && selectedTipoId) {
      loadDisponibilidadByTipo();
    }
  }, [wizardStep, selectedGrupoId, selectedTipoId, loadDisponibilidadByTipo]);

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

  const addRecursoDesdeMesa = (row: DisponibilidadMesaRow) => {
    if (!selectedGrupoId || !selectedTipoId) {
      alert('Seleccione grupo y tipo de recurso.');
      return;
    }
    if (!row.cantidadSolicitada || row.cantidadSolicitada <= 0) {
      alert('Ingrese una cantidad solicitada valida.');
      return;
    }
    if (row.cantidadSolicitada > row.cantidadDisponible) {
      alert('No puede solicitar mas de la cantidad disponible.');
      return;
    }


    const grupo = recursoGrupos.find((g) => g.id === selectedGrupoId);
    const tipo = recursoTipos.find((t) => t.id === selectedTipoId);
    const yaAgregado = recursos.some(
      (x) => x.grupoId === selectedGrupoId && x.tipoId === selectedTipoId && x.mesaId === row.mesaId
    );
    if (yaAgregado) {
      alert('Este recurso ya fue agregado en la grilla de resumen.');
      return;
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
  };

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

  const handleWizardSelect = (targetIndex: number) => {
    const targetStep = (targetIndex + 1) as WizardStep;
    if (targetStep === wizardStep) return;
    if (targetStep < wizardStep) {
      setWizardStep(targetStep);
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

  const handleRegistrarRequerimiento = async () => {
    if (!datosLogin || !mesaAsignada || recursos.length === 0) {
      alert('Complete el wizard antes de registrar.');
      return;
    }

    try {
      const emergenciaFromStorage = Number(localStorage.getItem('selectedEmergenciaId') || 'NaN');
      const effectiveEmergenciaId =
        selectedEmergenciaId ??
        (Number.isNaN(emergenciaFromStorage) ? (datosLogin?.emergencia_id ?? 0) : emergenciaFromStorage);

      const requerimientoData: RequerimientoRequest = {
        activo: true,
        creador: datosLogin.usuario_login,
        descripcion: detalleRequerimiento,
        emergencia_id: effectiveEmergenciaId,
        fecha_fin: fechaFin ? fechaFin.toISOString() : new Date().toISOString(),
        fecha_inicio: fechaInicio ? fechaInicio.toISOString() : new Date().toISOString(),
        usuario_emisor_id: datosLogin.usuario_id,
        usuario_receptor_id: mesaAsignada.usuarioId,
      };

      const requerimiento = await createRequerimiento(requerimientoData);
      if (!requerimiento) {
        alert('Error al crear el requerimiento');
        return;
      }

      for (const recurso of recursos) {
        const recursoData: RequerimientoRecursoRequest = {
          activo: true,
          cantidad: recurso.cantidad,
          costo: parseCostoToNumber(recurso.costoEstimado),
          creador: datosLogin.usuario_login,
          destino: '',
          especificaciones: (recurso.detalleSolicitudRecurso || '').trim(),
          recurso_grupo_id: recurso.grupoId,
          recurso_tipo_id: recurso.tipoId,
          requerimiento_id: requerimiento.id,
        };
        const success = await createRequerimientoRecurso(recursoData);
        if (!success) {
          alert(`Error al agregar recurso ${recurso.tipo}`);
        }
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
            { title: editId ? `Ver REQ-${editId}` : 'Nuevo Requerimiento' },
          ]}
        />
      </div>

      <div className="col-12">
        <Card>
          <div className="mb-3">
            <Steps
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
                    <InputText value={numero} onChange={(e) => setNumero(e.target.value)} className="w-full m-1" disabled={isReadOnly} />
                  </div>
                  <div className="col-lg-4 col-md-6 col-sm-12" style={{ display: 'none' }}>
                    <label className="label-uniform">Fecha de Solicitud</label>
                    <Calendar value={fechaSolicitud} onChange={(e) => setFechaSolicitud(e.value as Date)} showIcon showTime dateFormat="dd/mm/yy" className="w-full m-1" disabled={isReadOnly} />
                  </div>
                  <div className="col-lg-4 col-md-6 col-sm-12">
                    <label className="label-uniform">Fecha Inicio solicitud</label>
                    <Calendar value={fechaInicio} onChange={(e) => setFechaInicio(e.value as Date)} showIcon showTime dateFormat="dd/mm/yy" className="w-full m-1" disabled={isReadOnly} />
                  </div>
                  <div className="col-lg-4 col-md-6 col-sm-12">
                    <label className="label-uniform">Fecha Fin solicitud</label>
                    <Calendar value={fechaFin} onChange={(e) => setFechaFin(e.value as Date)} showIcon showTime dateFormat="dd/mm/yy" className="w-full m-1" disabled={isReadOnly} />
                  </div>
                  <div className="col-lg-12 col-md-6 col-sm-12 pt-2">
                    <label className="label-uniform">Detalle de requerimiento</label>
                    <InputTextarea
                      value={detalleRequerimiento}
                      onChange={(e) => setDetalleRequerimiento(e.target.value)}
                      className="w-full m-1"
                      rows={3}
                      disabled={isReadOnly}
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
                    disabled={isReadOnly || recursoGruposStatus === 'loading'}
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
                    disabled={isReadOnly || recursoTiposStatus === 'loading' || !selectedGrupoId}
                    filter
                    className="w-full m-1"
                  />
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

              <DataTable value={disponibilidadRows} emptyMessage={disponibilidadStatus === 'loading' ? 'Cargando disponibilidad...' : 'Seleccione grupo y tipo para visualizar inventario por mesa'} responsiveLayout="scroll">
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
                          disabled={isReadOnly || recursoYaAgregado}
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
                  body={(row: DisponibilidadMesaRow) => {
                    const recursoYaAgregado = recursos.some(
                      (x) => x.grupoId === selectedGrupoId && x.tipoId === selectedTipoId && x.mesaId === row.mesaId
                    );
                    return (<div>
                      <InputText
                        className="w-full"
                        value={row.detalleSolicitudRecurso}
                        onChange={(e) => handleDetalleSolicitudRecursoChange(row.mesaId, e.target.value)}
                        placeholder="Detalle adicional (opcional)"
                        disabled={isReadOnly || recursoYaAgregado}

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
                        <Button
                          label={recursoYaAgregado ? 'Recurso agregado' : 'Agregar Recurso'}
                          icon={recursoYaAgregado ? 'pi pi-check' : 'pi pi-plus'}
                          className="p-button-sm"
                          onClick={() => addRecursoDesdeMesa(row)}
                        disabled={isReadOnly || recursoYaAgregado}
                      />
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
                      {!isReadOnly && (
                        <Button
                          icon="pi pi-trash"
                          severity="danger"
                          text
                          onClick={() => removeRecurso(row.id)}
                          tooltip="Eliminar recurso"
                          tooltipOptions={{ position: 'top' }}
                        />
                      )}
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

          {!isReadOnly && (
            <div className="row mt-4">
              <div className="col-12 text-end">
                {wizardStep > 1 && (
                  <Button label="Anterior" icon="pi pi-arrow-left" outlined className="m-1" onClick={handlePrevStep} />
                )}
                {wizardStep < 3 && (
                  <Button label="Siguiente" icon="pi pi-arrow-right" iconPos="right" className="m-1" onClick={handleNextStep} />
                )}
                {wizardStep === 3 && (
                  <Button label="Registrar Requerimiento" icon="pi pi-send" severity="success" className="m-1" onClick={handleRegistrarRequerimiento} />
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default NuevoRequerimientoEnviado;
