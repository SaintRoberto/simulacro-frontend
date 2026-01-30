import React, { useEffect, useMemo, useState } from 'react';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { useAuth } from '../../../context/AuthContext';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { RequerimientoRequest, RequerimientoRecursoRequest } from '../../../context/AuthContext';
import { Tag, Breadcrumb } from 'antd';

interface Recurso {
  id: number;
  grupo: string;
  grupoId: number;
  grupoDescripcion?: string;
  tipo: string;
  tipoId: number;
  recursosComplementarios?: string;
  caracteristicasTecnicas?: string;
  cantidad: number;
  costoEstimado: string;
  especificacionesAdicionales?: string;
  destinoUbicacion?: string;
  activo: boolean;
}

export const NuevoRequerimientoEnviado: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editId = useMemo(() => {
    const idStr = searchParams.get('id');
    const n = idStr ? Number(idStr) : NaN;
    return isNaN(n) ? null : n;
  }, [searchParams]);
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
  const [viewRecursoDialog, setViewRecursoDialog] = useState<Recurso | null>(null);

  const { datosLogin, loadReceptores, receptores, receptoresStatus, recursoGrupos, recursoGruposStatus, recursoTipos, recursoTiposStatus, loadRecursoGrupos, loadRecursoTipos, createRequerimiento, createRequerimientoRecurso, getRequerimientoById, getRequerimientoRecursos, getRecursoTiposByGrupo } = useAuth();
  const mttOptions = (receptores || []).map(r => ({ label: `${r.siglas} - ${r.mesa_nombre}`.trim(), value: `${r.mesa_id}-${r.siglas}-${r.usuario_id}` }));
  const isReadOnly = !!editId;

  useEffect(() => {
    if (datosLogin && receptoresStatus === 'idle') {
      loadReceptores();
    }
    if (recursoGruposStatus === 'idle') {
      loadRecursoGrupos();
    }
  }, [datosLogin, receptoresStatus, loadReceptores, recursoGruposStatus, loadRecursoGrupos]);

  // Load existing requerimiento and its recursos when editing
  useEffect(() => {
    const loadForEdit = async () => {
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
          recursosComplementarios: tipo?.complemento,
          caracteristicasTecnicas: tipo?.descripcion,
          cantidad: r.cantidad,
          costoEstimado: tipo?.costo || '',
          especificacionesAdicionales: r.especificaciones,
          destinoUbicacion: r.destino,
          activo: r.activo,
        });
      }

      if (recursosRows.length) setRecursos(recursosRows);
    };

    loadForEdit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, getRequerimientoById, getRequerimientoRecursos, recursoGrupos, recursoTipos]);

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

  const handleRegistrarRequerimiento = async () => {
    if (!datosLogin || !mtt || recursos.length === 0) {
      alert('Por favor complete todos los campos requeridos y agregue al menos un recurso');
      return;
    }

    try {
      // Parse receptor info from mtt value (format: "coe_id-mesa_id-siglas-usuario_id")
      const [, , , usuarioReceptorId] = mtt.split('-');
      
      // Create requerimiento
      const requerimientoData: RequerimientoRequest = {
        activo: true,
        creador: datosLogin.usuario_login,
        emergencia_id: datosLogin?.emergencia_id || 4, // Default value, you may need to adjust this
        fecha_fin: fechaFin ? fechaFin.toISOString() : new Date().toISOString(),
        fecha_inicio: fechaInicio ? fechaInicio.toISOString() : new Date().toISOString(),
        usuario_emisor_id: datosLogin.usuario_id,
        usuario_receptor_id: parseInt(usuarioReceptorId),
      };

      const requerimiento = await createRequerimiento(requerimientoData);
      if (!requerimiento) {
        alert('Error al crear el requerimiento');
        return;
      }

      // Create requerimiento-recursos for each resource
      for (const recurso of recursos) {
        const recursoData: RequerimientoRecursoRequest = {
          activo: true,
          cantidad: recurso.cantidad,
          creador: datosLogin.usuario_login,
          destino: recurso.destinoUbicacion || '',
          especificaciones: recurso.especificacionesAdicionales || '',
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
      // Reset form
      setRecursos([]);
      setMtt(null);
      setFechaInicio(null);
      setFechaFin(null);
      
    } catch (error) {
      alert('Error al registrar el requerimiento');
      console.error(error);
    }
  };

  const saveRecurso = () => {
    const newId = Math.max(0, ...recursos.map(r => r.id)) + 1;
    const grupoSeleccionado = recursoGrupos.find(g => g.id === Number(recursoDraft.grupo));
    const nuevo: Recurso = {
      id: newId,
      grupo: grupoSeleccionado?.nombre || '-',
      grupoId: Number(recursoDraft.grupo) || 0,
      grupoDescripcion: grupoSeleccionado?.descripcion || '-',
      tipo: (recursoDraft.tipo as string) || 'Sin tipo',
      tipoId: Number((recursoDraft as any).tipoId) || 0,
      recursosComplementarios: recursoDraft.recursosComplementarios as string,
      caracteristicasTecnicas: recursoDraft.caracteristicasTecnicas as string,
      cantidad: Number(recursoDraft.cantidad || 1),
      costoEstimado: (recursoDraft.costoEstimado as string) || '-',
      especificacionesAdicionales: recursoDraft.especificacionesAdicionales as string,
      destinoUbicacion: recursoDraft.destinoUbicacion as string,
      activo: true,
    };
    setRecursos(prev => [...prev, nuevo]);
    setShowRecursoDialog(false);
  };

  const deleteRecurso = (row: Recurso) => {
    setRecursos(prev => prev.filter(r => r.id !== row.id));
  };

  const totalEstimado = recursos.reduce((acc, r) => {
    // Intentar extraer un número simple si viene en formato "$400 - $1,200 por día"
    const match = /\$\s*([\d,.]+)/.exec(r.costoEstimado || '');
    const val = match ? Number(match[1].replace(/,/g, '')) : 0;
    return acc + val;
  }, 0);

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
            <h3>Datos del Requerimiento</h3>
          </div>
          <div className="container-fluid">
            <div className="row col-12 pb-2">
              <div className="col-lg-4 col-md-6 col-sm-12">
                <label className="label-uniform">Num. Requerimiento   </label>
                <InputText value={numero} onChange={(e) => setNumero(e.target.value)} className="w-full m-1" disabled={isReadOnly} />
              </div>
              <div className="col-lg-4 col-md-6 col-sm-12">
                <label className="label-uniform">Fecha de Solicitud</label>
                <Calendar value={fechaSolicitud} onChange={(e) => setFechaSolicitud(e.value as Date)} showIcon showTime dateFormat="dd/mm/yy" className="w-full m-1" disabled={isReadOnly} />
              </div>
              <div className="col-lg-4 col-md-6 col-sm-12">
                <label className="label-uniform">MTT/GT Receptor</label>
                <Dropdown value={mtt} options={mttOptions} onChange={(e) => setMtt(e.value)} placeholder={receptoresStatus === 'loading' ? 'Cargando...' : 'Seleccionar MTT/GT'} className="w-full m-1" disabled={isReadOnly || receptoresStatus === 'loading'} filter />
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
        </Card>
      </div>

      <div className="col-12">
        <Card>
          <div className="mb-3 flex align-items-center justify-content-between">
          </div>

          <div className="row mt-4">
          <h3 className="m-0">Detalle de Recursos Solicitados</h3>
            {!isReadOnly && (
              <div className="col-12 text-end">
                <Button label="Añadir Recurso" icon="pi pi-plus" onClick={openRecurso} className="m-2" />
              </div>
            )}
          </div>

          <DataTable value={recursos} emptyMessage="Sin recursos añadidos" responsiveLayout="scroll">
            <Column field="grupo" header="Grupo Recurso" sortable></Column>
            <Column field="tipo" header="Tipo Recurso" sortable></Column>
            <Column field="destinoUbicacion" header="Destino" sortable></Column>
            <Column field="especificacionesAdicionales" header="Especificaciones Adicionales" sortable></Column>
            <Column field="cantidad" header="Cantidad" sortable></Column>
            <Column 
              field="activo" 
              header="Activo" 
              sortable
              body={(row: Recurso) => (
                <Tag color={row.activo ? 'blue' : 'red'}>
                  {row.activo ? 'TRUE' : 'false'}
                </Tag>
              )}
            ></Column>
            <Column
              header="Acciones"
              body={(row: Recurso) => (
                <div className="flex gap-2">
                  {isReadOnly ? (
                    <Button icon="pi pi-search" text onClick={() => setViewRecursoDialog(row)} />
                  ) : (
                    <Button icon="pi pi-trash" severity="danger" text onClick={() => deleteRecurso(row)} />
                  )}
                </div>
              )}
              style={{ width: '8rem' }}
            />
          </DataTable>

          <div className="mt-3 p-3 surface-100 border-round flex align-items-center justify-content-between">
            <div>
              <div>Total de recursos: {recursos.length}</div>
              <div>Total de ítems: {recursos.reduce((acc, r) => acc + (r.cantidad || 0), 0)}</div>
            </div>
          </div>

          {!isReadOnly && (
            <div className="row mt-4">
              <div className="col-12 text-end">
                <Button label="Guardar Borrador" icon="pi pi-save" outlined className="m-1" />
                <Button label="Registrar Requerimiento" icon="pi pi-send" severity="success" className="m-1" onClick={handleRegistrarRequerimiento} />
              </div>
            </div>
          )}
        </Card>
      </div>

      <Dialog
        visible={showRecursoDialog}
        header="Añadir Recurso"
        onHide={() => setShowRecursoDialog(false)}
        style={{ width: '520px' }}
        modal
      >
        <div className="grid p-fluid">
          <div className="field col-12">
            <label>Grupo Recurso</label>
            <Dropdown 
              value={recursoDraft.grupo ? Number(recursoDraft.grupo) : null}
              options={recursoGrupos.map(g => ({ label: g.nombre, value: g.id }))}
              onChange={(e) => handleGrupoChange(e.value)}
              placeholder={recursoGruposStatus === 'loading' ? 'Cargando...' : 'Seleccionar grupo'}
              disabled={isReadOnly || recursoGruposStatus === 'loading'}
              filter
              className="w-full"
            />
          </div>

          <div className="field col-12">
            <label>Tipo Recurso *</label>
            <Dropdown 
              value={typeof (recursoDraft as any).tipoId === 'number' ? (recursoDraft as any).tipoId : null}
              options={recursoTipos.map(t => ({ label: t.nombre, value: t.id }))}
              onChange={(e) => handleTipoChange(e.value)}
              placeholder={recursoTiposStatus === 'loading' ? 'Cargando...' : 'Seleccionar tipo'}
              disabled={isReadOnly || recursoTiposStatus === 'loading' || !recursoDraft.grupo}
              filter
              className="w-full"
            />
          </div>

          <div className="field col-12">
            <label>Recursos Complementarios</label>
            <InputText value={recursoDraft.recursosComplementarios || ''} onChange={(e) => setRecursoDraft(prev => ({ ...prev, recursosComplementarios: e.target.value }))} disabled={isReadOnly}/>
          </div>

          <div className="field col-12">
            <label>Características Técnicas</label>
            <InputText value={recursoDraft.caracteristicasTecnicas || ''} onChange={(e) => setRecursoDraft(prev => ({ ...prev, caracteristicasTecnicas: e.target.value }))} disabled={isReadOnly}/>
          </div>

          <div className="field col-12 md:col-6">
            <label>Cantidad *</label>
            <InputText value={String(recursoDraft.cantidad || 1)} onChange={(e) => setRecursoDraft(prev => ({ ...prev, cantidad: Number(e.target.value || 1) }))} disabled={isReadOnly} />
          </div>
          <div className="field col-12 md:col-6">
            <label>Costo Estimado</label>
            <InputText value={recursoDraft.costoEstimado || ''} onChange={(e) => setRecursoDraft(prev => ({ ...prev, costoEstimado: e.target.value }))} disabled={isReadOnly} />
          </div>

          <div className="field col-12">
            <label>Especificaciones Adicionales del Item</label>
            <InputText value={recursoDraft.especificacionesAdicionales || ''} onChange={(e) => setRecursoDraft(prev => ({ ...prev, especificacionesAdicionales: e.target.value }))} disabled={isReadOnly} />
          </div>

          <div className="field col-12">
            <label>Destino/Ubicación Final del Item</label>
            <InputText value={recursoDraft.destinoUbicacion || ''} onChange={(e) => setRecursoDraft(prev => ({ ...prev, destinoUbicacion: e.target.value }))} disabled={isReadOnly} />
          </div>

          {!isReadOnly && (
            <div className="flex justify-content-end gap-2 mt-2">
              <Button label="Cancelar" text onClick={() => setShowRecursoDialog(false)} className="m-1" />
              <Button label="Añadir Recurso" icon="pi pi-check" onClick={saveRecurso} className="m-1" />
            </div>
          )}
        </div>
      </Dialog>

      {/* Dialogo de visualización del recurso en modo lectura */}
      <Dialog
        visible={!!viewRecursoDialog}
        header="Detalle del Recurso"
        onHide={() => setViewRecursoDialog(null)}
        style={{ width: '520px' }}
        modal
      >
        {viewRecursoDialog && (
          <div className="grid p-fluid">
            <div className="field col-12"><strong>Grupo:</strong> {viewRecursoDialog.grupo} (ID: {viewRecursoDialog.grupoId})</div>
            <div className="field col-12"><strong>Tipo:</strong> {viewRecursoDialog.tipo} (ID: {viewRecursoDialog.tipoId})</div>
            <div className="field col-12"><strong>Cantidad:</strong> {viewRecursoDialog.cantidad}</div>
            <div className="field col-12"><strong>Destino:</strong> {viewRecursoDialog.destinoUbicacion || '-'}</div>
            <div className="field col-12"><strong>Especificaciones:</strong> {viewRecursoDialog.especificacionesAdicionales || '-'}</div>
            <div className="field col-12"><strong>Complementarios:</strong> {viewRecursoDialog.recursosComplementarios || '-'}</div>
            <div className="field col-12"><strong>Características Técnicas:</strong> {viewRecursoDialog.caracteristicasTecnicas || '-'}</div>
            <div className="field col-12"><strong>Activo:</strong> {viewRecursoDialog.activo ? 'Sí' : 'No'}</div>
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default NuevoRequerimientoEnviado;
