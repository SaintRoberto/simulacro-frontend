import React, { useEffect, useState } from 'react';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { useAuth } from '../../../context/AuthContext';
import { RequerimientoRequest, RequerimientoRecursoRequest } from '../../../context/AuthContext';
import { Tag } from 'antd';

interface Recurso {
  id: number;
  grupo: string;
  grupoDescripcion?: string;
  tipo: string;
  recursosComplementarios?: string;
  caracteristicasTecnicas?: string;
  cantidad: number;
  costoEstimado: string;
  especificacionesAdicionales?: string;
  destinoUbicacion?: string;
  activo: boolean;
}

export const NuevoRequerimientoEnviado: React.FC = () => {
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

  const { datosLogin, loadReceptores, receptores, receptoresStatus, recursoGrupos, recursoGruposStatus, recursoTipos, recursoTiposStatus, loadRecursoGrupos, loadRecursoTipos, createRequerimiento, createRequerimientoRecurso } = useAuth();
  const mttOptions = (receptores || []).map(r => ({ label: `${r.siglas} - ${r.mesa_nombre}`.trim(), value: `${r.mesa_id}-${r.siglas}-${r.usuario_id}` }));

  useEffect(() => {
    if (datosLogin && receptoresStatus === 'idle') {
      loadReceptores();
    }
    if (recursoGruposStatus === 'idle') {
      loadRecursoGrupos();
    }
  }, [datosLogin, receptoresStatus, loadReceptores, recursoGruposStatus, loadRecursoGrupos]);

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
    setRecursoDraft(prev => ({ ...prev, grupo: grupoId.toString() }));
    loadRecursoTipos(grupoId);
  };

  const handleTipoChange = (tipoId: number) => {
    const tipo = recursoTipos.find(t => t.id === tipoId);
    if (tipo) {
      setRecursoDraft(prev => ({
        ...prev,
        tipo: tipo.nombre,
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
        emergencia_id: 1, // Default value, you may need to adjust this
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
        const grupoId = recursoGrupos.find(g => g.nombre === recurso.grupo)?.id;
        const tipoId = recursoTipos.find(t => t.nombre === recurso.tipo)?.id;
        
        if (!grupoId || !tipoId) {
          alert(`Error: No se encontró grupo o tipo para el recurso ${recurso.tipo}`);
          continue;
        }

        const recursoData: RequerimientoRecursoRequest = {
          activo: true,
          cantidad: recurso.cantidad,
          creador: datosLogin.usuario_login,
          destino: recurso.destinoUbicacion || '',
          especificaciones: recurso.especificacionesAdicionales || '',
          recurso_grupo_id: grupoId,
          recurso_tipo_id: tipoId,
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
      grupoDescripcion: grupoSeleccionado?.descripcion || '-',
      tipo: (recursoDraft.tipo as string) || 'Sin tipo',
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
      <div className="col-12">
        <Card>
          <div className="mb-3">
            <h3>Datos del Requerimiento</h3>
          </div>
          <div className="container-fluid">
            <div className="row col-12 pb-2">
              <div className="col-lg-4 col-md-6 col-sm-12">
                <label className="label-uniform">Num. Requerimiento   </label>
                <InputText value={numero} onChange={(e) => setNumero(e.target.value)} className="w-full m-1" />
              </div>
              <div className="col-lg-4 col-md-6 col-sm-12">
                <label className="label-uniform">Fecha de Solicitud</label>
                <Calendar value={fechaSolicitud} onChange={(e) => setFechaSolicitud(e.value as Date)} showIcon showTime dateFormat="dd/mm/yy" className="w-full m-1" />
              </div>
              <div className="col-lg-4 col-md-6 col-sm-12">
                <label className="label-uniform">MTT/GT Receptor</label>
                <Dropdown value={mtt} options={mttOptions} onChange={(e) => setMtt(e.value)} placeholder={receptoresStatus === 'loading' ? 'Cargando...' : 'Seleccionar MTT/GT'} className="w-full m-1" disabled={receptoresStatus === 'loading'} filter />
              </div>
            </div>
            <div className="row col-12">
              <div className="col-lg-4 col-md-6 col-sm-12">
                <label className="label-uniform">Fecha Inicio solicitud</label>
                <Calendar value={fechaInicio} onChange={(e) => setFechaInicio(e.value as Date)} showIcon showTime dateFormat="dd/mm/yy" className="w-full m-1" />
              </div>
              <div className="col-lg-4 col-md-6 col-sm-12">
                <label className="label-uniform">Fecha Fin solicitud</label>
                <Calendar value={fechaFin} onChange={(e) => setFechaFin(e.value as Date)} showIcon showTime dateFormat="dd/mm/yy" className="w-full m-1" />
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
            <div className="col-12 text-end">
              <Button label="Añadir Recurso" icon="pi pi-plus" onClick={openRecurso} className="m-2" />
              </div>
          </div>

          <DataTable value={recursos} emptyMessage="Sin recursos añadidos" responsiveLayout="scroll">
            <Column field="grupo" header="Grupo Recurso" sortable></Column>
            <Column field="tipo" header="Tipo Recurso" sortable></Column>
            <Column field="destinoUbicacion" header="Destino" sortable></Column>
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
                  <Button icon="pi pi-trash" severity="danger" text onClick={() => deleteRecurso(row)} />
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
            <div className="font-bold">Costo estimado total: ${totalEstimado.toLocaleString()}</div>
          </div>

          <div className="row mt-4">
            <div className="col-12 text-end">
              <Button label="Guardar Borrador" icon="pi pi-save" outlined className="m-1" />
              <Button label="Registrar Requerimiento" icon="pi pi-send" severity="success" className="m-1" onClick={handleRegistrarRequerimiento} />
            </div>
          </div>

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
              disabled={recursoGruposStatus === 'loading'}
              filter
              className="w-full"
            />
          </div>

          <div className="field col-12">
            <label>Tipo Recurso *</label>
            <Dropdown 
              value={recursoDraft.tipo ? recursoTipos.find(t => t.nombre === recursoDraft.tipo)?.id : null}
              options={recursoTipos.map(t => ({ label: t.nombre, value: t.id }))}
              onChange={(e) => handleTipoChange(e.value)}
              placeholder={recursoTiposStatus === 'loading' ? 'Cargando...' : 'Seleccionar tipo'}
              disabled={recursoTiposStatus === 'loading' || !recursoDraft.grupo}
              filter
              className="w-full"
            />
          </div>

          <div className="field col-12">
            <label>Recursos Complementarios</label>
            <InputText value={recursoDraft.recursosComplementarios || ''} onChange={(e) => setRecursoDraft(prev => ({ ...prev, recursosComplementarios: e.target.value }))} disabled/>
          </div>

          <div className="field col-12">
            <label>Características Técnicas</label>
            <InputText value={recursoDraft.caracteristicasTecnicas || ''} onChange={(e) => setRecursoDraft(prev => ({ ...prev, caracteristicasTecnicas: e.target.value }))} disabled/>
          </div>

          <div className="field col-12 md:col-6">
            <label>Cantidad *</label>
            <InputText value={String(recursoDraft.cantidad || 1)} onChange={(e) => setRecursoDraft(prev => ({ ...prev, cantidad: Number(e.target.value || 1) }))} />
          </div>
          <div className="field col-12 md:col-6">
            <label>Costo Estimado</label>
            <InputText value={recursoDraft.costoEstimado || ''} onChange={(e) => setRecursoDraft(prev => ({ ...prev, costoEstimado: e.target.value }))} disabled />
          </div>

          <div className="field col-12">
            <label>Especificaciones Adicionales del Item</label>
            <InputText value={recursoDraft.especificacionesAdicionales || ''} onChange={(e) => setRecursoDraft(prev => ({ ...prev, especificacionesAdicionales: e.target.value }))} />
          </div>

          <div className="field col-12">
            <label>Destino/Ubicación Final del Item</label>
            <InputText value={recursoDraft.destinoUbicacion || ''} onChange={(e) => setRecursoDraft(prev => ({ ...prev, destinoUbicacion: e.target.value }))} />
          </div>

          <div className="flex justify-content-end gap-2 mt-2">
            <Button label="Cancelar" text onClick={() => setShowRecursoDialog(false)} className="m-1" />
            <Button label="Añadir Recurso" icon="pi pi-check" onClick={saveRecurso} className="m-1" />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default NuevoRequerimientoEnviado;
