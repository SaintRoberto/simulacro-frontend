import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputNumber } from 'primereact/inputnumber';
import type { InputNumberValueChangeEvent } from 'primereact/inputnumber';
import { Steps } from 'primereact/steps';
import type { MenuItem } from 'primereact/menuitem';
import { useAuth } from '../../../context/AuthContext';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { RequerimientoRequest, RequerimientoRecursoRequest } from '../../../context/AuthContext';
import { Breadcrumb, Tag } from 'antd';

type WizardStep = 1 | 2 | 3;

interface RecursoSeleccionado {
  id: number;
  grupo: string;
  grupoId: number;
  tipo: string;
  tipoId: number;
  cantidad: number;
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

  const [selectedGrupoId, setSelectedGrupoId] = useState<number | null>(null);
  const [selectedTipoId, setSelectedTipoId] = useState<number | null>(null);
  const [disponibilidadRows, setDisponibilidadRows] = useState<DisponibilidadMesaRow[]>([]);
  const [disponibilidadStatus, setDisponibilidadStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  const [mesaAsignadaId, setMesaAsignadaId] = useState<number | null>(null);
  const [recursos, setRecursos] = useState<RecursoSeleccionado[]>([]);

  const {
    datosLogin,
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

  const mesaAsignada = useMemo(() => {
    if (!mesaAsignadaId) return null;
    return mesasUnicas.find((m) => m.mesaId === mesaAsignadaId) || null;
  }, [mesaAsignadaId, mesasUnicas]);

  const totalItems = useMemo(() => recursos.reduce((acc, r) => acc + (r.cantidad || 0), 0), [recursos]);

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
      // TODO: Reemplazar por endpoint real de inventario por mesa + recurso.
      const rows: DisponibilidadMesaRow[] = mesasUnicas.map((mesa, i) => {
        const base = ((mesa.mesaId + selectedTipoId + i) % 9) + 1;
        return {
          mesaId: mesa.mesaId,
          mesaNombre: mesa.mesaNombre,
          siglas: mesa.siglas,
          usuarioId: mesa.usuarioId,
          cantidadDisponible: base,
          cantidadSolicitada: 0,
        };
      });
      setDisponibilidadRows(rows);
      setDisponibilidadStatus('ready');
    } catch (error) {
      console.error(error);
      setDisponibilidadRows([]);
      setDisponibilidadStatus('error');
    }
  }, [selectedGrupoId, selectedTipoId, mesasUnicas]);

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
    setDisponibilidadRows((prev) =>
      prev.map((row) => {
        if (row.mesaId !== mesaId) return row;
        const value = typeof rawValue === 'number' ? rawValue : 0;
        const bounded = Math.max(0, Math.min(value, row.cantidadDisponible));
        return { ...row, cantidadSolicitada: bounded };
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
    // if (mesaAsignadaId && mesaAsignadaId !== row.mesaId) {
    //   alert('Todos los recursos del requerimiento deben asignarse a una sola mesa.');
    //   return;
    // }

    const grupo = recursoGrupos.find((g) => g.id === selectedGrupoId);
    const tipo = recursoTipos.find((t) => t.id === selectedTipoId);

    setMesaAsignadaId(row.mesaId);
    setRecursos((prev) => {
      const existingIndex = prev.findIndex(
        (x) => x.grupoId === selectedGrupoId && x.tipoId === selectedTipoId && x.mesaId === row.mesaId
      );

      if (existingIndex >= 0) {
        const clone = [...prev];
        const current = clone[existingIndex];
        const nuevaCantidad = current.cantidad + row.cantidadSolicitada;
        const bounded = Math.min(nuevaCantidad, row.cantidadDisponible);
        clone[existingIndex] = { ...current, cantidad: bounded };
        return clone;
      }

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
          costoEstimado: parseCostoToNumber(tipo?.costo),
          mesaId: row.mesaId,
          mesaNombre: row.mesaNombre,
          mesaSiglas: row.siglas,
          mesaUsuarioId: row.usuarioId,
          activo: true,
        },
      ];
    });

    setDisponibilidadRows((prev) =>
      prev.map((x) => (x.mesaId === row.mesaId ? { ...x, cantidadSolicitada: 0 } : x))
    );
  };

  const removeRecurso = (id: number) => {
    setRecursos((prev) => {
      const next = prev.filter((x) => x.id !== id);
      if (next.length === 0) {
        setMesaAsignadaId(null);
      }
      return next;
    });
  };

  const handleWizardSelect = (targetIndex: number) => {
    const targetStep = (targetIndex + 1) as WizardStep;
    if (targetStep === wizardStep) return;
    if (targetStep < wizardStep) {
      setWizardStep(targetStep);
      return;
    }
    if (wizardStep === 1 && !fechaSolicitud) {
      alert('Complete los datos del requerimiento.');
      return;
    }
    if (targetStep === 3 && (recursos.length === 0 || !mesaAsignadaId)) {
      alert('Debe seleccionar recursos y una mesa asignada en el paso 2.');
      return;
    }
    setWizardStep(targetStep);
  };

  const handleNextStep = () => {
    if (wizardStep === 1) {
      if (!fechaSolicitud) {
        alert('Complete los datos del requerimiento.');
        return;
      }
      setWizardStep(2);
      return;
    }
    if (wizardStep === 2) {
      if (recursos.length === 0 || !mesaAsignadaId) {
        alert('Debe seleccionar recursos y una mesa asignada.');
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
          especificaciones: '',
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
                  <div className="col-lg-4 col-md-6 col-sm-12">
                    <label className="label-uniform">Fecha de Solicitud</label>
                    <Calendar value={fechaSolicitud} onChange={(e) => setFechaSolicitud(e.value as Date)} showIcon showTime dateFormat="dd/mm/yy" className="w-full m-1" disabled={isReadOnly} />
                  </div>
                </div>
                <div className="row col-12">
                  <div className="col-lg-4 col-md-6 col-sm-12">
                    <label className="label-uniform">Fecha Inicio solicitud</label>
                    <Calendar value={fechaInicio} onChange={(e) => setFechaInicio(e.value as Date)} showIcon showTime dateFormat="dd/mm/yy" className="w-full m-1" disabled={isReadOnly} />
                  </div>
                  <div className="col-lg-4 col-md-6 col-sm-12">
                    <label className="label-uniform">Fecha Fin solicitud</label>
                    <Calendar value={fechaFin} onChange={(e) => setFechaFin(e.value as Date)} showIcon showTime dateFormat="dd/mm/yy" className="w-full m-1" disabled={isReadOnly} />
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
                <div className="col-lg-4 col-md-6 col-sm-12 d-flex align-items-end">
                  <Button label="Consultar Disponibilidad" icon="pi pi-search" onClick={loadDisponibilidadByTipo} className="m-1" disabled={!selectedGrupoId || !selectedTipoId || isReadOnly} />
                </div>
              </div>

              <div className="mb-2">
                {mesaAsignada ? (
                  <Tag color="blue">{`Mesa asignada: ${mesaAsignada.siglas} - ${mesaAsignada.mesaNombre}`}</Tag>
                ) : (
                  <Tag color="default">Mesa asignada: No seleccionada</Tag>
                )}
              </div>

              <DataTable value={disponibilidadRows} emptyMessage={disponibilidadStatus === 'loading' ? 'Cargando disponibilidad...' : 'Seleccione grupo y tipo para visualizar inventario por mesa'} responsiveLayout="scroll">
                <Column
                  header="Mesa"
                  body={(row: DisponibilidadMesaRow) => `${row.siglas} - ${row.mesaNombre}`}
                />
                <Column field="cantidadDisponible" header="Cantidad disponible" />
                <Column
                  header="Cantidad solicitada"
                  body={(row: DisponibilidadMesaRow) => (
                    <InputNumber
                      value={row.cantidadSolicitada}
                      onValueChange={(e: InputNumberValueChangeEvent) =>
                        handleCantidadSolicitadaChange(row.mesaId, typeof e.value === 'number' ? e.value : 0)
                      }
                      mode="decimal"
                      min={0}
                      max={row.cantidadDisponible}
                      useGrouping={false}
                      className="w-full"
                      disabled={isReadOnly}
                    />
                  )}
                />
                <Column
                  header="Acciones"
                  body={(row: DisponibilidadMesaRow) => (
                    <Button
                      label="Agregar Recurso"
                      icon="pi pi-plus"
                      className="p-button-sm"
                      onClick={() => addRecursoDesdeMesa(row)}
                      disabled={isReadOnly}
                    />
                  )}
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
                <Column field="costoEstimado" header="Costo" sortable />
                <Column
                  header="Mesa Asignada"
                  body={(row: RecursoSeleccionado) => `${row.mesaSiglas} - ${row.mesaNombre}`}
                />
                {!isReadOnly && (
                  <Column
                    header="Acciones"
                    body={(row: RecursoSeleccionado) => (
                      <Button icon="pi pi-trash" severity="danger" text onClick={() => removeRecurso(row.id)} />
                    )}
                    style={{ width: '8rem' }}
                  />
                )}
              </DataTable>

              <div className="mt-3 p-3 surface-100 border-round">
                <div><strong>Resumen</strong></div>
                <div><strong>Numero:</strong> {numero}</div>
                <div><strong>Fecha solicitud:</strong> {formatDateTime(fechaSolicitud)}</div>
                <div><strong>Fecha inicio:</strong> {formatDateTime(fechaInicio)}</div>
                <div><strong>Fecha fin:</strong> {formatDateTime(fechaFin)}</div>
                <div>
                  <strong>Mesa asignada:</strong>{' '}
                  {mesaAsignada ? `${mesaAsignada.siglas} - ${mesaAsignada.mesaNombre}` : 'No seleccionada'}
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
