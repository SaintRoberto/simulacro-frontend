import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputTextarea } from 'primereact/inputtextarea';
import { useAuth } from '../../context/AuthContext';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Tag , Breadcrumb} from 'antd';

interface Mesa {
  id: number;
  nombre: string;
  siglas: string;
}

interface EstadoResolucion {
  id: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
}

interface Resolucion {
  id?: number;
  mesaAsignadaId: number;
  mesaAsignadaNombre: string;
  detalle: string;
  fechaCumplimiento: Date | null;
  responsable: string;
  estadoId: number;
  estadoNombre: string;
  activo: boolean;
}

interface ActaCOE {
  id?: number;
  descripcion: string;
  fechaHoraSesion: Date | null;
  resoluciones: Resolucion[];
  emergencia_id: number;
  usuario_id: number;
  creador: string;
}

export const NuevoActaCOE: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { authFetch, datosLogin } = useAuth();
  
  const editId = useMemo(() => {
    const idStr = searchParams.get('id');
    const n = idStr ? Number(idStr) : NaN;
    return isNaN(n) ? null : n;
  }, [searchParams]);

  // Datos del acta
  const [acta, setActa] = useState<ActaCOE>({
    descripcion: '',
    fechaHoraSesion: new Date(),
    resoluciones: [],
    emergencia_id: 1, // Valor por defecto, ajustar según sea necesario
    usuario_id: datosLogin?.usuario_id || 0,
    creador: datosLogin?.usuario_login || ''
  });

  // Estados para el diálogo de resolución
  const [showResolucionDialog, setShowResolucionDialog] = useState(false);
  const [resolucionDraft, setResolucionDraft] = useState<Partial<Resolucion>>({
    mesaAsignadaId: 0,
    detalle: '',
    fechaCumplimiento: new Date(),
    responsable: '',
    estadoId: 0,
    activo: true
  });
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [estadosResolucion, setEstadosResolucion] = useState<EstadoResolucion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isReadOnly = !!editId;

  // Cargar datos del acta cuando está en modo edición
  const cargarActa = useCallback(async (id: number) => {
    try {
      if (!id || !mesas.length || !estadosResolucion.length) return;
      
      setIsLoading(true);
      
      // Cargar datos del acta
      const [actaResponse, resolucionesResponse] = await Promise.all([
        authFetch(`http://localhost:5000/api/coe_actas/${id}`),
        authFetch(`http://localhost:5000/api/coe_acta_resoluciones/coe_acta/${id}`)
      ]);
      
      if (!actaResponse.ok) throw new Error('Error al cargar el acta');
      if (!resolucionesResponse.ok) throw new Error('Error al cargar las resoluciones');
      
      const actaData = await actaResponse.json();
      const resolucionesData = await resolucionesResponse.json();

      // Mapear las resoluciones al formato esperado
      const resolucionesMapeadas: Resolucion[] = resolucionesData.map((r: any) => ({
        id: r.id,
        mesaAsignadaId: r.mesa_asignada_id,
        mesaAsignadaNombre: mesas.find(m => m.id === r.mesa_asignada_id)?.nombre || '',
        detalle: r.detalle,
        fechaCumplimiento: r.fecha_cumplimiento ? new Date(r.fecha_cumplimiento) : null,
        responsable: r.responsable || '',
        estadoId: r.resolucion_estado_id,
        estadoNombre: estadosResolucion.find(e => e.id === r.resolucion_estado_id)?.nombre || '',
        activo: r.activo
      }));

      // Actualizar el estado con los datos del acta
      setActa({
        id: actaData.id,
        descripcion: actaData.descripcion,
        fechaHoraSesion: new Date(actaData.fecha_sesion),
        resoluciones: resolucionesMapeadas,
        emergencia_id: actaData.emergencia_id,
        usuario_id: actaData.usuario_id,
        creador: actaData.creador
      });

    } catch (error) {
      console.error('Error al cargar el acta:', error);
      alert('Error al cargar el acta');
      navigate('/actas');
    } finally {
      setIsLoading(false);
    }
  }, [authFetch, navigate, mesas, estadosResolucion]);

  // Cargar mesas y estados una sola vez al montar el componente
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        setIsLoading(true);
        
        // Cargar mesas y estados en paralelo
        const [mesasResponse, estadosResponse] = await Promise.all([
          authFetch('http://localhost:5000/api/mesas/coe/3'),
          authFetch('http://localhost:5000/api/resolucion_estados')
        ]);
        
        if (mesasResponse.ok) {
          const mesasData = await mesasResponse.json();
          setMesas(mesasData);
        }
        
        if (estadosResponse.ok) {
          const estadosData = await estadosResponse.json();
          setEstadosResolucion(estadosData);
        }
        
        // Si es un acta nueva, establecer el usuario actual
        if (datosLogin?.usuario_id && !editId) {
          setActa(prev => ({
            ...prev,
            usuario_id: datosLogin.usuario_id,
            creador: datosLogin.usuario_login
          }));
        }
      } catch (error) {
        console.error('Error cargando datos iniciales:', error);
        alert('Error al cargar los datos iniciales');
      } finally {
        setIsLoading(false);
      }
    };
    
    cargarDatosIniciales();
  }, [authFetch, datosLogin]);
  
  // Cargar datos del acta cuando el ID de edición cambia y las mesas/estados están cargados
  useEffect(() => {
    if (editId && mesas.length > 0 && estadosResolucion.length > 0) {
      cargarActa(editId);
    }
  }, [editId, mesas, estadosResolucion]);

  const abrirDialogoResolucion = (resolucion?: Resolucion) => {
    if (resolucion) {
      // Modo edición
      setResolucionDraft({
        id: resolucion.id,
        mesaAsignadaId: resolucion.mesaAsignadaId,
        detalle: resolucion.detalle,
        fechaCumplimiento: resolucion.fechaCumplimiento || new Date(),
        responsable: resolucion.responsable,
        estadoId: resolucion.estadoId,
        activo: resolucion.activo
      });
    } else {
      // Modo nueva resolución
      setResolucionDraft({
        mesaAsignadaId: 0,
        detalle: '',
        fechaCumplimiento: new Date(),
        responsable: '',
        estadoId: estadosResolucion[0]?.id || 0,
        activo: true
      });
    }
    setShowResolucionDialog(true);
  };

  const guardarResolucion = async () => {
    if (!resolucionDraft.mesaAsignadaId || !resolucionDraft.detalle || !resolucionDraft.estadoId) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    try {
      setIsLoading(true);
      const mesaSeleccionada = mesas.find(m => m.id === resolucionDraft.mesaAsignadaId);
      const estadoSeleccionado = estadosResolucion.find(e => e.id === resolucionDraft.estadoId);

      const nuevaResolucion: Resolucion = {
        id: resolucionDraft.id || Math.max(0, ...acta.resoluciones.map(r => r.id || 0)) + 1,
        mesaAsignadaId: resolucionDraft.mesaAsignadaId!,
        mesaAsignadaNombre: mesaSeleccionada?.nombre || '',
        detalle: resolucionDraft.detalle || '',
        fechaCumplimiento: resolucionDraft.fechaCumplimiento || null,
        responsable: resolucionDraft.responsable || '',
        estadoId: resolucionDraft.estadoId!,
        estadoNombre: estadoSeleccionado?.nombre || '',
        activo: true
      };

      // Si estamos editando una resolución existente
      if (resolucionDraft.id) {
        setActa(prev => ({
          ...prev,
          resoluciones: prev.resoluciones.map(r => 
            r.id === resolucionDraft.id ? nuevaResolucion : r
          )
        }));
      } else {
        // Si es una nueva resolución
        setActa(prev => ({
          ...prev,
          resoluciones: [...prev.resoluciones, nuevaResolucion]
        }));
      }

      setShowResolucionDialog(false);
    } catch (error) {
      console.error('Error al guardar la resolución:', error);
      alert('Error al guardar la resolución');
    } finally {
      setIsLoading(false);
    }
  };

  const eliminarResolucion = (id: number) => {
    if (window.confirm('¿Está seguro de eliminar esta resolución?')) {
      setActa(prev => ({
        ...prev,
        resoluciones: prev.resoluciones.filter(r => r.id !== id)
      }));
      
      // Aquí iría la llamada a la API para eliminar si es necesario
    }
  };

  const guardarActa = async () => {
    try {
      setIsLoading(true);
      
      // Validaciones básicas
      if (!acta.descripcion) {
        alert('La descripción es requerida');
        return;
      }

      if (!acta.fechaHoraSesion) {
        alert('La fecha y hora de sesión son requeridas');
        return;
      }

      let actaId = acta.id;
      let actaData;

      // 1. Guardar o actualizar el acta
      if (editId) {
        // Modo edición - Actualizar acta existente
        const actaResponse = await authFetch(`http://localhost:5000/api/coe_actas/${editId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            activo: true,
            creador: acta.creador,
            descripcion: acta.descripcion,
            emergencia_id: acta.emergencia_id,
            fecha_sesion: acta.fechaHoraSesion?.toISOString(),
            usuario_id: acta.usuario_id,
          })
        });

        if (!actaResponse.ok) {
          throw new Error('Error al actualizar el acta');
        }

        actaData = await actaResponse.json();
      } else {
        // Modo creación - Crear nuevo acta
        const actaResponse = await authFetch('http://localhost:5000/api/coe_actas', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            activo: true,
            creador: acta.creador,
            descripcion: acta.descripcion,
            emergencia_id: acta.emergencia_id,
            fecha_sesion: acta.fechaHoraSesion?.toISOString(),
            usuario_id: acta.usuario_id,
          })
        });

        if (!actaResponse.ok) {
          throw new Error('Error al guardar el acta');
        }

        actaData = await actaResponse.json();
        actaId = actaData.id;
      }

      // 2. Para simplificar, primero eliminamos todas las resoluciones existentes
      // y luego creamos las nuevas. Esto evita tener que manejar actualizaciones individuales
      if (editId) {
        const deleteResponse = await authFetch(`http://localhost:5000/api/coe_acta_resoluciones/coe_acta/${actaId}`, {
          method: 'DELETE'
        });
        
        if (!deleteResponse.ok) {
          console.error('Error al limpiar resoluciones anteriores:', await deleteResponse.text());
          // Continuamos de todos modos, ya que podrían no existir resoluciones
        }
      }

      // 3. Crear las nuevas resoluciones
      for (const resolucion of acta.resoluciones) {
        const resolucionResponse = await authFetch('http://localhost:5000/api/coe_acta_resoluciones', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            activo: true,
            coe_acta_id: actaId,
            creador: acta.creador,
            detalle: resolucion.detalle,
            fecha_cumplimiento: resolucion.fechaCumplimiento?.toISOString(),
            mesa_asignada_id: resolucion.mesaAsignadaId,
            resolucion_estado_id: resolucion.estadoId,
            responsable: resolucion.responsable,
          })
        });

        if (!resolucionResponse.ok) {
          console.error('Error al guardar resolución:', await resolucionResponse.text());
          throw new Error(`Error al guardar la resolución para ${resolucion.mesaAsignadaNombre}`);
        }
      }

      alert(`Acta ${editId ? 'actualizada' : 'guardada'} exitosamente`);
      navigate('/actas');
      
    } catch (error) {
      console.error('Error al guardar el acta:', error);
      alert(error instanceof Error ? error.message : `Error al ${editId ? 'actualizar' : 'guardar'} el acta`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="mb-2">
        <Breadcrumb
          items={[
            { title: <Link to="/">Inicio</Link> },
            { title: <Link to="/actas">Actas COE</Link> },
            { title: editId ? `Editar Acta COE` : 'Nueva Acta COE' },
          ]}
        />
      </div>
      
      <div className="col-12">
        <Card>
          <div className="mb-3">
            <h3>Datos del Acta COE</h3>
          </div>
          
          <div className="container-fluid">
            <div className="row col-12 pb-2">
              <div className="col-6">
                <label className="label-uniform">Descripción *</label>
                <InputTextarea 
                  value={acta.descripcion} 
                  onChange={(e) => setActa({...acta, descripcion: e.target.value})} 
                  className="w-full m-1" 
                  rows={3}
                  disabled={isReadOnly} 
                />
              </div>
              
              <div className="col-6">
                <label className="label-uniform">Fecha y Hora de Sesión *</label>
                <Calendar 
                  value={acta.fechaHoraSesion} 
                  onChange={(e) => setActa({...acta, fechaHoraSesion: e.value as Date})} 
                  showIcon 
                  showTime
                  hourFormat="24"
                  dateFormat="dd/mm/yy" 
                  className="w-full m-1" 
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="col-12">
        <Card>
          <div className="flex align-items-center justify-content-between mb-3">
            <h3 className="m-0">Resoluciones</h3>
            {!isReadOnly && (
              <Button 
                label="Añadir Resolución" 
                icon="pi pi-plus" 
                onClick={() => abrirDialogoResolucion()} 
                className="m-2" 
                disabled={isLoading}
              />
            )}
          </div>

          <DataTable 
            value={acta.resoluciones} 
            emptyMessage="No hay resoluciones registradas" 
            responsiveLayout="scroll"
            loading={isLoading}
          >
            <Column field="mesaAsignadaNombre" header="Mesa Asignada" sortable></Column>
            <Column field="detalle" header="Detalle" sortable></Column>
            <Column 
              field="fechaCumplimiento" 
              header="Fecha Cumplimiento" 
              sortable
              body={(row: Resolucion) => row.fechaCumplimiento?.toLocaleDateString() || '-'}
            ></Column>
            <Column field="responsable" header="Responsable" sortable></Column>
            <Column 
              field="estadoNombre" 
              header="Estado" 
              sortable
              body={(row: Resolucion) => (
                <Tag color={row.activo ? 'blue' : 'red'}>
                  {row.estadoNombre}
                </Tag>
              )}
            ></Column>
            <Column
              header="Acciones"
              body={(row: Resolucion) => (
                <div className="flex gap-2">
                  {!isReadOnly && row.id && (
                    <Button 
                      icon="pi pi-trash" 
                      severity="danger" 
                      text 
                      onClick={() => eliminarResolucion(row.id!)} 
                      disabled={isLoading}
                    />
                  )}
                </div>
              )}
              style={{ width: '6rem' }}
            />
          </DataTable>

          <div className="flex justify-content-end mt-4">
            <Button 
              label="Cancelar" 
              icon="pi pi-times" 
              className="p-button-text mr-2" 
              onClick={() => navigate('/actas')}
              disabled={isLoading}
            />
            <Button 
              label="Guardar Acta" 
              icon="pi pi-save" 
              onClick={guardarActa}
              loading={isLoading}
              disabled={isLoading}
            />
          </div>
        </Card>
      </div>

      {/* Diálogo para agregar/editar resolución */}
      <Dialog
        visible={showResolucionDialog}
        header="Agregar Resolución"
        onHide={() => setShowResolucionDialog(false)}
        style={{ width: '600px' }}
        modal
      >
        <div className="grid p-fluid">
          <div className="field col-12">
            <label>Mesa Asignada *</label>
            <Dropdown 
              value={resolucionDraft.mesaAsignadaId || null}
              options={mesas.map(m => ({ label: m.nombre, value: m.id }))}
              onChange={(e) => setResolucionDraft({...resolucionDraft, mesaAsignadaId: e.value})}
              placeholder="Seleccionar mesa"
              className="w-full m-1"
              disabled={isLoading}
              filter
            />
          </div>

          <div className="field col-12">
            <label>Detalle *</label>
            <InputTextarea 
              value={resolucionDraft.detalle || ''} 
              onChange={(e) => setResolucionDraft({...resolucionDraft, detalle: e.target.value})} 
              rows={3}
              className="w-full m-1"
              disabled={isLoading}
            />
          </div>

          <div className="field col-12 md:col-6">
            <label>Fecha de Cumplimiento</label>
            <Calendar 
              value={resolucionDraft.fechaCumplimiento || null} 
              onChange={(e) => setResolucionDraft({...resolucionDraft, fechaCumplimiento: e.value as Date})} 
              showIcon 
              dateFormat="dd/mm/yy" 
              className="w-full m-1"
              disabled={isLoading}
            />
          </div>

          <div className="field col-12 md:6">
            <label>Responsable</label>
            <InputText 
              value={resolucionDraft.responsable || ''} 
              onChange={(e) => setResolucionDraft({...resolucionDraft, responsable: e.target.value})} 
              className="w-full m-1"
              disabled={isLoading}
            />
          </div>

          <div className="field col-12">
            <label>Estado *</label>
            <Dropdown 
              value={resolucionDraft.estadoId || null}
              options={estadosResolucion.map(e => ({ label: e.nombre, value: e.id }))}
              onChange={(e) => setResolucionDraft({...resolucionDraft, estadoId: e.value})}
              placeholder="Seleccionar estado"
              className="w-full m-1"
              disabled={isLoading}
            />
          </div>

          <div className="flex justify-content-end gap-2 mt-4 col-12">
            <Button 
              label="Cancelar" 
              text 
              onClick={() => setShowResolucionDialog(false)} 
              disabled={isLoading}
            />
            <Button 
              label="Guardar" 
              icon="pi pi-check" 
              onClick={guardarResolucion} 
              loading={isLoading}
              disabled={isLoading}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default NuevoActaCOE;
